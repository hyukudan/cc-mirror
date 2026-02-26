/**
 * Integration tests for the translator proxy server.
 *
 * These tests exercise the full round-trip:
 *   Anthropic-format request → proxy → mock OpenAI upstream
 *     → translated response → Anthropic-format response
 *
 * A real HTTP server (mock upstream) and a real translator proxy are started
 * for each test group and torn down afterwards.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { startTranslatorProxy } from '../../src/core/translator/proxy-server.js';
import type { ProxyServerInfo, AnthropicResponse, AnthropicStreamEvent } from '../../src/core/translator/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Send JSON to the proxy's /v1/messages endpoint and return the parsed body + status. */
async function postToProxy(proxyBaseUrl: string, body: object): Promise<{ status: number; json: unknown }> {
  const raw = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const url = new URL('/v1/messages', proxyBaseUrl);
    const req = http.request(
      {
        hostname: url.hostname,
        port: Number(url.port),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(raw),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode ?? 0, json: JSON.parse(text) });
          } catch {
            resolve({ status: res.statusCode ?? 0, json: text });
          }
        });
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(raw);
    req.end();
  });
}

/** Send a streaming request and collect raw SSE text. */
async function postStreamToProxy(proxyBaseUrl: string, body: object): Promise<{ status: number; text: string }> {
  const raw = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const url = new URL('/v1/messages', proxyBaseUrl);
    const req = http.request(
      {
        hostname: url.hostname,
        port: Number(url.port),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(raw),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString() }));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(raw);
    req.end();
  });
}

/** Build a mock upstream server.  The `handler` receives the parsed request body
 *  and must write a complete HTTP response. */
function makeMockUpstream(
  handler: (body: unknown, res: http.ServerResponse, req: http.IncomingMessage) => void | Promise<void>
): Promise<{ server: http.Server; baseUrl: string; lastBody: () => unknown }> {
  let lastBody: unknown = undefined;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', async () => {
        try {
          lastBody = JSON.parse(Buffer.concat(chunks).toString());
        } catch {
          lastBody = Buffer.concat(chunks).toString();
        }
        try {
          await handler(lastBody, res, req);
        } catch (err) {
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: String(err) }));
          }
        }
      });
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}/v1`,
        lastBody: () => lastBody,
      });
    });
  });
}

/** Build a minimal valid non-streaming OpenAI response. */
function makeOpenAIResponse(content: string, model = 'deepseek-chat') {
  return {
    id: 'chatcmpl-integration-test',
    object: 'chat.completion',
    created: 1700000000,
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

/** Build minimal valid Anthropic request body. */
function makeAnthropicBody(overrides: Record<string, unknown> = {}) {
  return {
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 1024,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Non-streaming tests
// ---------------------------------------------------------------------------

describe('translator proxy integration: non-streaming', () => {
  let mockUpstream: { server: http.Server; baseUrl: string; lastBody: () => unknown };
  let proxy: ProxyServerInfo;

  before(async () => {
    // Mock upstream: always returns a canned successful response
    mockUpstream = await makeMockUpstream((_body, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(makeOpenAIResponse('Hello from upstream!')));
    });

    proxy = await startTranslatorProxy({
      targetBaseUrl: mockUpstream.baseUrl,
      apiKey: 'test-api-key',
      modelMap: { 'claude-sonnet-4-20250514': 'deepseek-chat' },
    });
  });

  after(async () => {
    await proxy.shutdown();
    await new Promise<void>((resolve) => mockUpstream.server.close(() => resolve()));
  });

  it('returns a valid Anthropic-format response for a basic text request', async () => {
    const { status, json } = await postToProxy(proxy.baseUrl, makeAnthropicBody());

    assert.equal(status, 200);
    const resp = json as AnthropicResponse;
    assert.equal(resp.type, 'message');
    assert.equal(resp.role, 'assistant');
    assert.ok(Array.isArray(resp.content));
    assert.ok(resp.content.length > 0);
    assert.equal(resp.content[0].type, 'text');
    assert.equal(resp.content[0].text, 'Hello from upstream!');
  });

  it('preserves usage tokens in the response', async () => {
    const { status, json } = await postToProxy(proxy.baseUrl, makeAnthropicBody());

    assert.equal(status, 200);
    const resp = json as AnthropicResponse;
    assert.equal(resp.usage.input_tokens, 10);
    assert.equal(resp.usage.output_tokens, 5);
  });

  it('applies model mapping when forwarding to upstream', async () => {
    // Use a fresh upstream that records and validates the body
    const recording: { server: http.Server; baseUrl: string; lastBody: () => unknown } = await makeMockUpstream(
      (_body, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(makeOpenAIResponse('ok')));
      }
    );
    const recordingProxy = await startTranslatorProxy({
      targetBaseUrl: recording.baseUrl,
      apiKey: 'key',
      modelMap: { 'claude-sonnet-4-20250514': 'deepseek-chat' },
    });

    try {
      await postToProxy(recordingProxy.baseUrl, makeAnthropicBody({ model: 'claude-sonnet-4-20250514' }));
      const received = recording.lastBody() as { model?: string };
      assert.equal(received.model, 'deepseek-chat', 'Model should be mapped to deepseek-chat');
    } finally {
      await recordingProxy.shutdown();
      await new Promise<void>((r) => recording.server.close(() => r()));
    }
  });

  it('translates the upstream request to valid OpenAI format', async () => {
    // Verify the body that reached the upstream has OpenAI shape
    await postToProxy(proxy.baseUrl, makeAnthropicBody({ system: 'You are helpful.' }));

    const received = mockUpstream.lastBody() as {
      model?: string;
      messages?: Array<{ role: string; content: string }>;
      max_tokens?: number;
    };

    // Should have messages array
    assert.ok(Array.isArray(received.messages));
    // System prompt should be the first message with role "system"
    const systemMsg = received.messages!.find((m) => m.role === 'system');
    assert.ok(systemMsg, 'Expected a system message in the OpenAI request');
    assert.equal(systemMsg!.content, 'You are helpful.');
    // max_tokens should be passed through
    assert.equal(received.max_tokens, 1024);
  });
});

// ---------------------------------------------------------------------------
// Error handling tests
// ---------------------------------------------------------------------------

describe('translator proxy integration: error handling', () => {
  it('translates a 500 upstream error to Anthropic error format', async () => {
    const errorUpstream = await makeMockUpstream((_body, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Internal server error', type: 'server_error' } }));
    });

    const proxy = await startTranslatorProxy({
      targetBaseUrl: errorUpstream.baseUrl,
      apiKey: 'key',
    });

    try {
      const { status, json } = await postToProxy(proxy.baseUrl, makeAnthropicBody());

      assert.equal(status, 500);
      const resp = json as { type: string; error: { type: string; message: string } };
      assert.equal(resp.type, 'error');
      assert.equal(resp.error.type, 'api_error');
      assert.ok(resp.error.message.length > 0);
    } finally {
      await proxy.shutdown();
      await new Promise<void>((r) => errorUpstream.server.close(() => r()));
    }
  });

  it('translates a 401 upstream error to authentication_error type', async () => {
    const authUpstream = await makeMockUpstream((_body, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Invalid API key', type: 'invalid_api_key' } }));
    });

    const proxy = await startTranslatorProxy({
      targetBaseUrl: authUpstream.baseUrl,
      apiKey: 'bad-key',
    });

    try {
      const { status, json } = await postToProxy(proxy.baseUrl, makeAnthropicBody());

      assert.equal(status, 401);
      const resp = json as { type: string; error: { type: string } };
      assert.equal(resp.type, 'error');
      assert.equal(resp.error.type, 'authentication_error');
    } finally {
      await proxy.shutdown();
      await new Promise<void>((r) => authUpstream.server.close(() => r()));
    }
  });
});

// ---------------------------------------------------------------------------
// Streaming tests
// ---------------------------------------------------------------------------

describe('translator proxy integration: streaming', () => {
  it('translates a streaming OpenAI response to Anthropic SSE format', async () => {
    // Build a valid sequence of OpenAI SSE chunks
    function chunk(obj: object) {
      return `data: ${JSON.stringify(obj)}\n\n`;
    }

    const openaiChunks = [
      chunk({
        id: 'chatcmpl-s1',
        object: 'chat.completion.chunk',
        created: 1700000000,
        model: 'deepseek-chat',
        choices: [{ index: 0, delta: { role: 'assistant', content: 'Stream ' }, finish_reason: null }],
      }),
      chunk({
        id: 'chatcmpl-s1',
        object: 'chat.completion.chunk',
        created: 1700000000,
        model: 'deepseek-chat',
        choices: [{ index: 0, delta: { content: 'response!' }, finish_reason: null }],
      }),
      chunk({
        id: 'chatcmpl-s1',
        object: 'chat.completion.chunk',
        created: 1700000000,
        model: 'deepseek-chat',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      }),
      'data: [DONE]\n\n',
    ].join('');

    const streamUpstream = await makeMockUpstream((_body, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.end(openaiChunks);
    });

    const proxy = await startTranslatorProxy({
      targetBaseUrl: streamUpstream.baseUrl,
      apiKey: 'key',
    });

    try {
      const { status, text } = await postStreamToProxy(proxy.baseUrl, makeAnthropicBody({ stream: true }));

      assert.equal(status, 200);

      // Parse SSE events
      const events: AnthropicStreamEvent[] = [];
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            events.push(JSON.parse(line.slice(6)) as AnthropicStreamEvent);
          } catch {
            // skip non-JSON lines
          }
        }
      }

      // Should have message_start
      assert.ok(
        events.some((e) => e.type === 'message_start'),
        'Expected message_start event'
      );
      // Should have content_block_start
      assert.ok(
        events.some((e) => e.type === 'content_block_start'),
        'Expected content_block_start event'
      );
      // Should have text deltas
      const textDeltas = events.filter((e) => e.type === 'content_block_delta' && e.delta?.type === 'text_delta');
      assert.ok(textDeltas.length > 0, 'Expected text delta events');
      // Should have message_stop
      assert.ok(
        events.some((e) => e.type === 'message_stop'),
        'Expected message_stop event'
      );

      // Content should include the streamed text
      const allText = textDeltas.map((e) => e.delta?.text ?? '').join('');
      assert.ok(allText.includes('Stream') || allText.includes('response'), 'Expected streamed text content');
    } finally {
      await proxy.shutdown();
      await new Promise<void>((r) => streamUpstream.server.close(() => r()));
    }
  });
});

// ---------------------------------------------------------------------------
// Tool call round-trip test
// ---------------------------------------------------------------------------

describe('translator proxy integration: tool call round-trip', () => {
  it('translates tool definitions and routes them, returns tool_use in Anthropic format', async () => {
    // Mock upstream: returns a tool call response
    const toolUpstream = await makeMockUpstream((_body, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: 'chatcmpl-tool-test',
          object: 'chat.completion',
          created: 1700000000,
          model: 'deepseek-chat',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_abc123',
                    type: 'function',
                    function: {
                      name: 'get_weather',
                      arguments: '{"city":"London"}',
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        })
      );
    });

    const proxy = await startTranslatorProxy({
      targetBaseUrl: toolUpstream.baseUrl,
      apiKey: 'key',
    });

    try {
      const { status, json } = await postToProxy(
        proxy.baseUrl,
        makeAnthropicBody({
          tools: [
            {
              name: 'get_weather',
              description: 'Get current weather for a city',
              input_schema: {
                type: 'object',
                properties: { city: { type: 'string' } },
                required: ['city'],
              },
            },
          ],
          tool_choice: { type: 'auto' },
        })
      );

      assert.equal(status, 200);
      const resp = json as AnthropicResponse;
      assert.equal(resp.type, 'message');
      assert.equal(resp.stop_reason, 'tool_use');

      // Should contain a tool_use content block
      const toolBlock = resp.content.find((b) => b.type === 'tool_use');
      assert.ok(toolBlock, 'Expected tool_use content block');
      assert.equal(toolBlock!.name, 'get_weather');
      assert.equal(toolBlock!.id, 'call_abc123');
      assert.deepEqual(toolBlock!.input, { city: 'London' });

      // Verify the upstream received valid OpenAI tool definitions
      const received = toolUpstream.lastBody() as {
        tools?: Array<{ type: string; function: { name: string } }>;
        tool_choice?: string;
      };
      assert.ok(Array.isArray(received.tools), 'Upstream should have received tools array');
      assert.equal(received.tools![0].type, 'function');
      assert.equal(received.tools![0].function.name, 'get_weather');
      assert.equal(received.tool_choice, 'auto');
    } finally {
      await proxy.shutdown();
      await new Promise<void>((r) => toolUpstream.server.close(() => r()));
    }
  });
});

/**
 * Unit tests for the API translator module (Anthropic <-> OpenAI translation)
 *
 * Tests cover:
 * - translateRequest(): Anthropic -> OpenAI request conversion
 * - translateResponse(): OpenAI -> Anthropic response conversion
 * - sanitizeSchema(): JSON schema sanitization (tested indirectly via translateRequest)
 * - stripThinkContent(): <think> block stripping (tested via streaming translator)
 * - translateErrorResponse(): Error format translation
 * - createStreamingTranslator(): Streaming SSE translation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { translateRequest } from '../../src/core/translator/anthropic-to-openai.js';
import {
  translateResponse,
  translateFinishReason,
  translateErrorResponse,
  createErrorResponse,
} from '../../src/core/translator/openai-to-anthropic.js';
import { createStreamingTranslator, formatSSE } from '../../src/core/translator/streaming.js';

import type {
  AnthropicRequest,
  OpenAIResponse,
  OpenAIErrorResponse,
  OpenAIStreamChunk,
} from '../../src/core/translator/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Anthropic request for testing */
function makeRequest(overrides: Partial<AnthropicRequest> = {}): AnthropicRequest {
  return {
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 1024,
    ...overrides,
  };
}

/** Build a minimal OpenAI response for testing */
function makeResponse(overrides: Partial<OpenAIResponse> = {}): OpenAIResponse {
  return {
    id: 'chatcmpl-abc123',
    object: 'chat.completion',
    created: 1700000000,
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Hi there!' },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    ...overrides,
  };
}

/** Collect all output from a streaming translator by piping SSE lines through it */
async function collectStreamOutput(sseLines: string[], requestModel: string): Promise<string> {
  const translator = createStreamingTranslator(requestModel);
  const chunks: string[] = [];

  const writable = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });

  const input = Readable.from([sseLines.join('\n') + '\n']);
  await pipeline(input, translator, writable);
  return chunks.join('');
}

// ===========================================================================
// translateRequest() tests
// ===========================================================================

describe('translator: translateRequest()', () => {
  it('converts system message (string) to OpenAI system role', () => {
    const result = translateRequest(makeRequest({ system: 'You are helpful.' }));
    assert.equal(result.messages[0].role, 'system');
    assert.equal(result.messages[0].content, 'You are helpful.');
  });

  it('converts system message (content block array) to OpenAI system role', () => {
    const result = translateRequest(
      makeRequest({
        system: [
          { type: 'text', text: 'First part.' },
          { type: 'text', text: 'Second part.' },
        ],
      })
    );
    assert.equal(result.messages[0].role, 'system');
    assert.equal(result.messages[0].content, 'First part.\nSecond part.');
  });

  it('converts user text messages', () => {
    const result = translateRequest(
      makeRequest({
        messages: [{ role: 'user', content: 'What is 2+2?' }],
      })
    );
    const userMsg = result.messages.find((m) => m.role === 'user');
    assert.ok(userMsg);
    assert.equal(userMsg.content, 'What is 2+2?');
  });

  it('converts user messages with content block array', () => {
    const result = translateRequest(
      makeRequest({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Look at this' },
              { type: 'text', text: ' code' },
            ],
          },
        ],
      })
    );
    const userMsg = result.messages.find((m) => m.role === 'user');
    assert.ok(userMsg);
    assert.equal(userMsg.content, 'Look at this code');
  });

  it('converts assistant messages with tool_use blocks', () => {
    const result = translateRequest(
      makeRequest({
        messages: [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Let me check.' },
              {
                type: 'tool_use',
                id: 'toolu_123',
                name: 'read_file',
                input: { path: '/tmp/test.txt' },
              },
            ],
          },
        ],
      })
    );
    const assistantMsg = result.messages.find((m) => m.role === 'assistant');
    assert.ok(assistantMsg);
    assert.equal(assistantMsg.content, 'Let me check.');
    assert.ok(assistantMsg.tool_calls);
    assert.equal(assistantMsg.tool_calls.length, 1);
    assert.equal(assistantMsg.tool_calls[0].id, 'toolu_123');
    assert.equal(assistantMsg.tool_calls[0].type, 'function');
    assert.equal(assistantMsg.tool_calls[0].function.name, 'read_file');
    assert.deepEqual(JSON.parse(assistantMsg.tool_calls[0].function.arguments), { path: '/tmp/test.txt' });
  });

  it('converts tool_result messages to OpenAI tool role', () => {
    const result = translateRequest(
      makeRequest({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_123',
                content: 'File contents here',
              },
            ],
          },
        ],
      })
    );
    // tool_result becomes a separate message with role: "tool"
    const toolMsg = result.messages.find((m) => m.role === 'tool');
    assert.ok(toolMsg);
    assert.equal(toolMsg.tool_call_id, 'toolu_123');
    assert.equal(toolMsg.content, 'File contents here');
  });

  it('converts tool_result with nested content blocks', () => {
    const result = translateRequest(
      makeRequest({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'toolu_456',
                content: [
                  { type: 'text', text: 'Line 1' },
                  { type: 'text', text: 'Line 2' },
                ],
              },
            ],
          },
        ],
      })
    );
    const toolMsg = result.messages.find((m) => m.role === 'tool');
    assert.ok(toolMsg);
    assert.equal(toolMsg.content, 'Line 1\nLine 2');
  });

  it('handles model mapping', () => {
    const modelMap = { 'claude-sonnet-4-20250514': 'deepseek-chat' };
    const result = translateRequest(makeRequest(), modelMap);
    assert.equal(result.model, 'deepseek-chat');
  });

  it('preserves model name when no mapping exists', () => {
    const modelMap = { 'other-model': 'mapped-model' };
    const result = translateRequest(makeRequest(), modelMap);
    assert.equal(result.model, 'claude-sonnet-4-20250514');
  });

  it('handles temperature', () => {
    const result = translateRequest(makeRequest({ temperature: 0.7 }));
    assert.equal(result.temperature, 0.7);
  });

  it('handles top_p', () => {
    const result = translateRequest(makeRequest({ top_p: 0.9 }));
    assert.equal(result.top_p, 0.9);
  });

  it('handles stop sequences', () => {
    const result = translateRequest(makeRequest({ stop_sequences: ['STOP', 'END'] }));
    assert.deepEqual(result.stop, ['STOP', 'END']);
  });

  it('omits stop when stop_sequences is empty', () => {
    const result = translateRequest(makeRequest({ stop_sequences: [] }));
    assert.equal(result.stop, undefined);
  });

  it('handles tool definitions translation', () => {
    const result = translateRequest(
      makeRequest({
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather for a city',
            input_schema: {
              type: 'object',
              properties: {
                city: { type: 'string' },
              },
              required: ['city'],
            },
          },
        ],
      })
    );
    assert.ok(result.tools);
    assert.equal(result.tools.length, 1);
    assert.equal(result.tools[0].type, 'function');
    assert.equal(result.tools[0].function.name, 'get_weather');
    assert.equal(result.tools[0].function.description, 'Get weather for a city');
    assert.deepEqual(result.tools[0].function.parameters, {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    });
  });

  it('handles tool_choice: auto', () => {
    const result = translateRequest(makeRequest({ tool_choice: { type: 'auto' } }));
    assert.equal(result.tool_choice, 'auto');
  });

  it('handles tool_choice: any -> auto (LM Studio compat)', () => {
    const result = translateRequest(makeRequest({ tool_choice: { type: 'any' } }));
    assert.equal(result.tool_choice, 'auto');
  });

  it('handles tool_choice: specific tool', () => {
    const result = translateRequest(makeRequest({ tool_choice: { type: 'tool', name: 'read_file' } }));
    assert.deepEqual(result.tool_choice, { type: 'function', function: { name: 'read_file' } });
  });

  it('handles tool_choice: tool without name falls back to auto', () => {
    const result = translateRequest(makeRequest({ tool_choice: { type: 'tool' } }));
    assert.equal(result.tool_choice, 'auto');
  });

  it('does NOT include stream_options', () => {
    const result = translateRequest(makeRequest({ stream: true }));
    assert.equal(result.stream, true);
    assert.equal(result.stream_options, undefined);
  });

  it('forwards metadata.user_id as user field', () => {
    const result = translateRequest(makeRequest({ metadata: { user_id: 'user-42' } }));
    assert.equal(result.user, 'user-42');
  });

  it('handles max_tokens passthrough', () => {
    const result = translateRequest(makeRequest({ max_tokens: 4096 }));
    assert.equal(result.max_tokens, 4096);
  });
});

// ===========================================================================
// sanitizeSchema() tests (via translateRequest with tools)
// ===========================================================================

describe('translator: sanitizeSchema() (via tool translation)', () => {
  it('removes format: "uri" from tool schema properties', () => {
    const result = translateRequest(
      makeRequest({
        tools: [
          {
            name: 'fetch_url',
            description: 'Fetch a URL',
            input_schema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
              },
            },
          },
        ],
      })
    );
    const params = result.tools![0].function.parameters;
    const urlProp = (params.properties as Record<string, Record<string, unknown>>).url;
    assert.equal(urlProp.type, 'string');
    assert.equal(urlProp.format, undefined);
  });

  it('handles nested schemas recursively', () => {
    const result = translateRequest(
      makeRequest({
        tools: [
          {
            name: 'nested_tool',
            description: 'Tool with nested schema',
            input_schema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    endpoint: { type: 'string', format: 'uri' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
      })
    );
    const params = result.tools![0].function.parameters;
    const configProp = (params.properties as Record<string, Record<string, unknown>>).config;
    const endpointProp = (configProp.properties as Record<string, Record<string, unknown>>).endpoint;
    assert.equal(endpointProp.type, 'string');
    assert.equal(endpointProp.format, undefined);
  });

  it('strips all format values (not just uri) for local-server compat', () => {
    const result = translateRequest(
      makeRequest({
        tools: [
          {
            name: 'date_tool',
            description: 'Tool with date format',
            input_schema: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date-time' },
              },
            },
          },
        ],
      })
    );
    const params = result.tools![0].function.parameters;
    const dateProp = (params.properties as Record<string, Record<string, unknown>>).date;
    // All format values are stripped for local-server compatibility
    assert.equal(dateProp.format, undefined);
    assert.equal(dateProp.type, 'string');
  });

  it('strips $schema from tool schemas', () => {
    const result = translateRequest(
      makeRequest({
        tools: [
          {
            name: 'schema_tool',
            description: 'Tool with $schema',
            input_schema: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              type: 'object',
              properties: { name: { type: 'string' } },
            },
          },
        ],
      })
    );
    const params = result.tools![0].function.parameters;
    assert.equal(params.$schema, undefined);
    assert.equal(params.type, 'object');
  });

  it('handles schemas without format field', () => {
    const result = translateRequest(
      makeRequest({
        tools: [
          {
            name: 'simple_tool',
            description: 'Simple tool',
            input_schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                count: { type: 'number' },
              },
            },
          },
        ],
      })
    );
    const params = result.tools![0].function.parameters;
    const nameProp = (params.properties as Record<string, Record<string, unknown>>).name;
    assert.equal(nameProp.type, 'string');
    assert.equal(nameProp.format, undefined);
  });

  it('sanitizes arrays within schema', () => {
    const result = translateRequest(
      makeRequest({
        tools: [
          {
            name: 'array_tool',
            description: 'Tool with array schema',
            input_schema: {
              type: 'object',
              properties: {
                urls: {
                  type: 'array',
                  items: [{ type: 'string', format: 'uri' }],
                },
              },
            },
          },
        ],
      })
    );
    const params = result.tools![0].function.parameters;
    const urlsProp = (params.properties as Record<string, Record<string, unknown>>).urls;
    const items = urlsProp.items as Array<Record<string, unknown>>;
    assert.equal(items[0].format, undefined);
    assert.equal(items[0].type, 'string');
  });
});

// ===========================================================================
// translateResponse() tests
// ===========================================================================

describe('translator: translateResponse()', () => {
  it('converts basic text response', () => {
    const result = translateResponse(makeResponse(), 'claude-sonnet-4-20250514');
    assert.equal(result.type, 'message');
    assert.equal(result.role, 'assistant');
    assert.equal(result.model, 'claude-sonnet-4-20250514');
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, 'text');
    assert.equal(result.content[0].text, 'Hi there!');
  });

  it('handles tool_calls in response', () => {
    const result = translateResponse(
      makeResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_abc',
                  type: 'function',
                  function: {
                    name: 'read_file',
                    arguments: '{"path":"/tmp/test.txt"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
      'claude-sonnet-4-20250514'
    );

    // Should have a tool_use content block
    const toolBlock = result.content.find((b) => b.type === 'tool_use');
    assert.ok(toolBlock);
    assert.equal(toolBlock.id, 'call_abc');
    assert.equal(toolBlock.name, 'read_file');
    assert.deepEqual(toolBlock.input, { path: '/tmp/test.txt' });
  });

  it('handles multiple tool_calls in response', () => {
    const result = translateResponse(
      makeResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I will read two files.',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'read_file', arguments: '{"path":"a.txt"}' },
                },
                {
                  id: 'call_2',
                  type: 'function',
                  function: { name: 'read_file', arguments: '{"path":"b.txt"}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
      'my-model'
    );

    assert.equal(result.content.length, 3); // text + 2 tool_use
    assert.equal(result.content[0].type, 'text');
    assert.equal(result.content[1].type, 'tool_use');
    assert.equal(result.content[2].type, 'tool_use');
  });

  it('handles invalid JSON in tool arguments gracefully', () => {
    const result = translateResponse(
      makeResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_bad',
                  type: 'function',
                  function: { name: 'some_tool', arguments: '{invalid json' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
      'my-model'
    );

    const toolBlock = result.content.find((b) => b.type === 'tool_use');
    assert.ok(toolBlock);
    assert.deepEqual(toolBlock.input, { _raw: '{invalid json' });
  });

  it('strips <think>...</think> blocks from content', () => {
    const result = translateResponse(
      makeResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '<think>Let me reason about this...</think>The answer is 42.',
            },
            finish_reason: 'stop',
          },
        ],
      }),
      'my-model'
    );

    assert.equal(result.content[0].text, 'The answer is 42.');
  });

  it('handles empty content after think stripping', () => {
    const result = translateResponse(
      makeResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '<think>Only thinking, no output.</think>',
            },
            finish_reason: 'stop',
          },
        ],
      }),
      'my-model'
    );

    // Should still have at least one content block (empty text fallback)
    assert.ok(result.content.length >= 1);
    assert.equal(result.content[0].type, 'text');
    assert.equal(result.content[0].text, '');
  });

  it('strips multiple think blocks', () => {
    const result = translateResponse(
      makeResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '<think>First thought</think>Hello <think>second thought</think>world',
            },
            finish_reason: 'stop',
          },
        ],
      }),
      'my-model'
    );

    assert.equal(result.content[0].text, 'Hello world');
  });

  it('handles null content in response', () => {
    const result = translateResponse(
      makeResponse({
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: null },
            finish_reason: 'stop',
          },
        ],
      }),
      'my-model'
    );

    // Should have at least one content block (empty text fallback)
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, 'text');
    assert.equal(result.content[0].text, '');
  });

  it('maps finish_reason correctly: stop -> end_turn', () => {
    const result = translateResponse(
      makeResponse({
        choices: [{ index: 0, message: { role: 'assistant', content: 'done' }, finish_reason: 'stop' }],
      }),
      'my-model'
    );
    assert.equal(result.stop_reason, 'end_turn');
  });

  it('maps finish_reason correctly: length -> max_tokens', () => {
    const result = translateResponse(
      makeResponse({
        choices: [{ index: 0, message: { role: 'assistant', content: 'cut off' }, finish_reason: 'length' }],
      }),
      'my-model'
    );
    assert.equal(result.stop_reason, 'max_tokens');
  });

  it('maps finish_reason correctly: tool_calls -> tool_use', () => {
    const result = translateResponse(
      makeResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{ id: 'c1', type: 'function', function: { name: 'foo', arguments: '{}' } }],
            },
            finish_reason: 'tool_calls',
          },
        ],
      }),
      'my-model'
    );
    assert.equal(result.stop_reason, 'tool_use');
  });

  it('maps finish_reason: content_filter -> end_turn', () => {
    const result = translateResponse(
      makeResponse({
        choices: [{ index: 0, message: { role: 'assistant', content: 'filtered' }, finish_reason: 'content_filter' }],
      }),
      'my-model'
    );
    assert.equal(result.stop_reason, 'end_turn');
  });

  it('preserves usage information', () => {
    const result = translateResponse(
      makeResponse({
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }),
      'my-model'
    );
    assert.equal(result.usage.input_tokens, 100);
    assert.equal(result.usage.output_tokens, 50);
  });

  it('preserves response id', () => {
    const result = translateResponse(makeResponse({ id: 'chatcmpl-xyz789' }), 'my-model');
    assert.equal(result.id, 'chatcmpl-xyz789');
  });

  it('throws on response with no choices', () => {
    assert.throws(() => translateResponse(makeResponse({ choices: [] }), 'my-model'), /no choices/i);
  });
});

// ===========================================================================
// translateFinishReason() tests
// ===========================================================================

describe('translator: translateFinishReason()', () => {
  it('maps stop to end_turn', () => {
    assert.equal(translateFinishReason('stop'), 'end_turn');
  });

  it('maps length to max_tokens', () => {
    assert.equal(translateFinishReason('length'), 'max_tokens');
  });

  it('maps tool_calls to tool_use', () => {
    assert.equal(translateFinishReason('tool_calls'), 'tool_use');
  });

  it('maps content_filter to end_turn', () => {
    assert.equal(translateFinishReason('content_filter'), 'end_turn');
  });

  it('returns null for unknown reason', () => {
    assert.equal(translateFinishReason(null), null);
  });

  it('returns null for undefined reason', () => {
    assert.equal(translateFinishReason(undefined), null);
  });
});

// ===========================================================================
// translateErrorResponse() tests
// ===========================================================================

describe('translator: translateErrorResponse()', () => {
  it('handles object error format with message and type', () => {
    const result = translateErrorResponse({
      error: { message: 'Invalid API key', type: 'authentication_error' },
    });
    assert.equal(result.type, 'error');
    assert.equal(result.error.message, 'Invalid API key');
    assert.equal(result.error.type, 'authentication_error');
  });

  it('handles string error format', () => {
    const result = translateErrorResponse({
      error: 'Something went wrong',
    } as OpenAIErrorResponse);
    assert.equal(result.type, 'error');
    assert.equal(result.error.message, 'Something went wrong');
    assert.equal(result.error.type, 'api_error');
  });

  it('maps invalid_api_key code to authentication_error', () => {
    const result = translateErrorResponse({
      error: { message: 'Bad key', type: 'invalid_request_error', code: 'invalid_api_key' },
    });
    assert.equal(result.error.type, 'authentication_error');
  });

  it('maps insufficient_quota code to rate_limit_error', () => {
    const result = translateErrorResponse({
      error: { message: 'Quota exceeded', type: 'invalid_request_error', code: 'insufficient_quota' },
    });
    assert.equal(result.error.type, 'rate_limit_error');
  });

  it('maps model_not_found code to not_found_error', () => {
    const result = translateErrorResponse({
      error: { message: 'Model not found', type: 'invalid_request_error', code: 'model_not_found' },
    });
    assert.equal(result.error.type, 'not_found_error');
  });

  it('maps context_length_exceeded code to invalid_request_error', () => {
    const result = translateErrorResponse({
      error: { message: 'Too long', type: 'server_error', code: 'context_length_exceeded' },
    });
    assert.equal(result.error.type, 'invalid_request_error');
  });

  it('maps server_error type to api_error', () => {
    const result = translateErrorResponse({
      error: { message: 'Internal error', type: 'server_error' },
    });
    assert.equal(result.error.type, 'api_error');
  });

  it('maps service_unavailable type to api_error', () => {
    const result = translateErrorResponse({
      error: { message: 'Service down', type: 'service_unavailable' },
    });
    assert.equal(result.error.type, 'api_error');
  });

  it('maps unknown type to api_error', () => {
    const result = translateErrorResponse({
      error: { message: 'Unknown error', type: 'some_weird_type' },
    });
    assert.equal(result.error.type, 'api_error');
  });
});

// ===========================================================================
// createErrorResponse() tests
// ===========================================================================

describe('translator: createErrorResponse()', () => {
  it('wraps an Error instance with phase info', () => {
    const result = createErrorResponse(new Error('Connection refused'), 'request');
    assert.equal(result.type, 'error');
    assert.equal(result.error.type, 'api_error');
    assert.ok(result.error.message.includes('Connection refused'));
    assert.ok(result.error.message.includes('request'));
  });

  it('wraps a string error', () => {
    const result = createErrorResponse('timeout', 'response');
    assert.equal(result.type, 'error');
    assert.ok(result.error.message.includes('timeout'));
    assert.ok(result.error.message.includes('response'));
  });
});

// ===========================================================================
// formatSSE() tests
// ===========================================================================

describe('translator: formatSSE()', () => {
  it('formats event with correct SSE structure', () => {
    const sse = formatSSE({ type: 'message_stop' });
    assert.ok(sse.startsWith('event: message_stop\n'));
    assert.ok(sse.includes('data: '));
    assert.ok(sse.endsWith('\n\n'));
  });

  it('includes JSON payload in data line', () => {
    const sse = formatSSE({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'Hello' },
    });
    const dataLine = sse.split('\n').find((l) => l.startsWith('data: '))!;
    const parsed = JSON.parse(dataLine.slice(6));
    assert.equal(parsed.type, 'content_block_delta');
    assert.equal(parsed.delta.text, 'Hello');
  });
});

// ===========================================================================
// createStreamingTranslator() + stripThinkContent() tests
// ===========================================================================

describe('translator: streaming translator', () => {
  /** Helper: build an SSE line from an OpenAI chunk object */
  function sseChunk(chunk: Partial<OpenAIStreamChunk>): string {
    const full: OpenAIStreamChunk = {
      id: 'chatcmpl-stream',
      object: 'chat.completion.chunk',
      created: 1700000000,
      model: 'test-model',
      choices: [],
      ...chunk,
    };
    return `data: ${JSON.stringify(full)}`;
  }

  it('translates a simple text streaming response', async () => {
    const lines = [
      sseChunk({
        choices: [{ index: 0, delta: { role: 'assistant', content: 'Hello ' }, finish_reason: null }],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: { content: 'world' }, finish_reason: null }],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      }),
      '',
      'data: [DONE]',
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');

    // Should contain message_start
    assert.ok(output.includes('event: message_start'));
    // Should contain text deltas
    assert.ok(output.includes('"text":"Hello "'));
    assert.ok(output.includes('"text":"world"'));
    // Should contain message_stop
    assert.ok(output.includes('event: message_stop'));
  });

  it('strips <think> blocks that appear in a single chunk', async () => {
    const lines = [
      sseChunk({
        choices: [
          { index: 0, delta: { role: 'assistant', content: '<think>reasoning</think>visible' }, finish_reason: null },
        ],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      }),
      '',
      'data: [DONE]',
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');
    assert.ok(output.includes('"text":"visible"'));
    assert.ok(!output.includes('reasoning'));
  });

  it('strips <think> blocks spanning multiple chunks', async () => {
    const lines = [
      sseChunk({
        choices: [{ index: 0, delta: { role: 'assistant', content: '<think>start of' }, finish_reason: null }],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: { content: ' thought</think>visible text' }, finish_reason: null }],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      }),
      '',
      'data: [DONE]',
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');
    assert.ok(output.includes('"text":"visible text"'));
    assert.ok(!output.includes('start of'));
    assert.ok(!output.includes('thought'));
  });

  it('preserves text outside think blocks', async () => {
    const lines = [
      sseChunk({
        choices: [
          {
            index: 0,
            delta: { role: 'assistant', content: 'before<think>inside</think>after' },
            finish_reason: null,
          },
        ],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      }),
      '',
      'data: [DONE]',
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');
    assert.ok(output.includes('"text":"beforeafter"'));
    assert.ok(!output.includes('inside'));
  });

  it('translates tool call streaming chunks', async () => {
    const lines = [
      sseChunk({
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              tool_calls: [
                {
                  index: 0,
                  id: 'call_123',
                  type: 'function',
                  function: { name: 'read_file', arguments: '' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      }),
      '',
      sseChunk({
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [{ index: 0, function: { arguments: '{"path":' } }],
            },
            finish_reason: null,
          },
        ],
      }),
      '',
      sseChunk({
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [{ index: 0, function: { arguments: '"/tmp/f"}' } }],
            },
            finish_reason: null,
          },
        ],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }],
      }),
      '',
      'data: [DONE]',
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');

    // Should contain tool_use content block start
    assert.ok(output.includes('"type":"tool_use"'));
    assert.ok(output.includes('"name":"read_file"'));
    // Should contain input_json_delta events
    assert.ok(output.includes('input_json_delta'));
    // Should contain the arguments parts (note: partial_json values are JSON-encoded strings)
    assert.ok(output.includes('partial_json'));
    assert.ok(output.includes('path'));
    assert.ok(output.includes('/tmp/f'));
    // Finish reason should be translated
    assert.ok(output.includes('"stop_reason":"tool_use"'));
  });

  it('accepts options object form', async () => {
    const translator = createStreamingTranslator({ requestModel: 'test-model', inputTokens: 50 });
    const chunks: string[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk.toString());
        cb();
      },
    });

    const sseData =
      [
        sseChunk({
          choices: [{ index: 0, delta: { role: 'assistant', content: 'Hi' }, finish_reason: null }],
        }),
        '',
        sseChunk({
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        }),
        '',
        'data: [DONE]',
        '',
      ].join('\n') + '\n';

    const input = Readable.from([sseData]);
    await pipeline(input, translator, writable);
    const output = chunks.join('');

    assert.ok(output.includes('event: message_start'));
    // Input tokens should be reflected in the message_start event
    assert.ok(output.includes('"input_tokens":50'));
  });

  it('handles [DONE] signal and emits message_stop', async () => {
    const lines = [
      sseChunk({
        choices: [{ index: 0, delta: { role: 'assistant', content: 'X' }, finish_reason: null }],
      }),
      '',
      'data: [DONE]',
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');
    assert.ok(output.includes('event: message_stop'));
  });

  it('closes stream properly when flush is called with open block', async () => {
    // Send a chunk with content but no finish_reason and no [DONE]
    const lines = [
      sseChunk({
        choices: [{ index: 0, delta: { role: 'assistant', content: 'partial' }, finish_reason: null }],
      }),
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');
    // flush() should close the stream properly with message_stop
    assert.ok(output.includes('event: message_stop'));
  });

  it('handles upstream error chunks', async () => {
    const errorChunk: Partial<OpenAIStreamChunk> = {
      choices: [],
      error: 'GPU out of memory',
    };
    const lines = [sseChunk(errorChunk), '', 'data: [DONE]', ''];

    const output = await collectStreamOutput(lines, 'test-model');
    assert.ok(output.includes('GPU out of memory'));
    assert.ok(output.includes('event: error'));
  });

  it('skips malformed JSON chunks gracefully', async () => {
    const lines = [
      'data: {not valid json',
      '',
      sseChunk({
        choices: [{ index: 0, delta: { role: 'assistant', content: 'OK' }, finish_reason: null }],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      }),
      '',
      'data: [DONE]',
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');
    // The valid chunks should still be processed
    assert.ok(output.includes('"text":"OK"'));
    assert.ok(output.includes('event: message_stop'));
  });

  it('ignores SSE comments and non-data lines', async () => {
    const lines = [
      ': this is a comment',
      'event: ping',
      sseChunk({
        choices: [{ index: 0, delta: { role: 'assistant', content: 'data' }, finish_reason: null }],
      }),
      '',
      sseChunk({
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      }),
      '',
      'data: [DONE]',
      '',
    ];

    const output = await collectStreamOutput(lines, 'test-model');
    assert.ok(output.includes('"text":"data"'));
  });
});

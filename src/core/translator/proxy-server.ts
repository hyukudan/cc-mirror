/**
 * Translation Proxy Server
 *
 * A local HTTP proxy that accepts Anthropic Messages API requests from Claude Code,
 * translates them to OpenAI Chat Completions format, forwards to the target provider,
 * and translates the responses back to Anthropic format.
 *
 * ## Features
 *
 * - **Auto port assignment**: Uses port 0 to let the OS assign an available port
 * - **Streaming support**: Translates OpenAI SSE to Anthropic SSE events
 * - **Tool use support**: Handles tool calls and tool results in both directions
 * - **Error translation**: Maps OpenAI error responses to Anthropic error format
 * - **Body size limit**: Prevents memory exhaustion (50MB default)
 *
 * ## Request Flow
 *
 * 1. Claude Code sends POST /v1/messages (Anthropic format)
 * 2. Proxy calls translateRequest() to convert to OpenAI format
 * 3. Proxy forwards to target provider's /chat/completions endpoint
 * 4. For streaming: pipes response through createStreamingTranslator()
 * 5. For non-streaming: calls translateResponse() on the response
 * 6. Returns Anthropic-formatted response to Claude Code
 *
 * ## Security
 *
 * - Binds only to 127.0.0.1 (localhost)
 * - Request body size limit to prevent memory exhaustion attacks
 * - No external configuration or persistence
 */

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { translateRequest } from './anthropic-to-openai.js';
import { translateResponse, createErrorResponse } from './openai-to-anthropic.js';
import { createStreamingTranslator } from './streaming.js';
import type {
  TranslatorProxyConfig,
  ProxyServerInfo,
  AnthropicRequest,
  OpenAIResponse,
  OpenAIErrorResponse,
} from './types.js';

const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50 MB limit for request/response bodies

/**
 * Start the translation proxy server
 */
export async function startTranslatorProxy(config: TranslatorProxyConfig): Promise<ProxyServerInfo> {
  const targetUrl = new URL(config.targetBaseUrl);
  const isHttps = targetUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  const log = config.debug ? console.error.bind(console, '[translator-proxy]') : () => {};

  const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': 'http://127.0.0.1',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, anthropic-version',
      });
      res.end();
      return;
    }

    // Only handle POST /v1/messages (Anthropic Messages API endpoint)
    if (req.method !== 'POST' || !req.url?.includes('/messages')) {
      log(`Rejected: ${req.method} ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found - only POST /v1/messages is supported' }));
      return;
    }

    log(`Request: ${req.method} ${req.url}`);

    try {
      // 1. Read incoming request body
      const body = await readBody(req);
      const anthropicRequest: AnthropicRequest = JSON.parse(body);
      const isStreaming = anthropicRequest.stream === true;

      log(`Model: ${anthropicRequest.model}, Streaming: ${isStreaming}`);

      // 2. Translate to OpenAI format
      const openaiRequest = translateRequest(anthropicRequest, config.modelMap);
      const requestBody = JSON.stringify(openaiRequest);

      log(`Translated model: ${openaiRequest.model}`);

      // 3. Build target request path
      // Most OpenAI-compatible APIs use /v1/chat/completions
      let targetPath = targetUrl.pathname;
      if (!targetPath.includes('/chat/completions')) {
        targetPath = `${targetPath}/chat/completions`.replace(/\/+/g, '/');
      }

      // 4. Build request options
      const requestOptions: http.RequestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          Authorization: `Bearer ${config.apiKey}`,
          Accept: isStreaming ? 'text/event-stream' : 'application/json',
        },
        timeout: config.timeout ?? DEFAULT_TIMEOUT,
      };

      log(`Target: ${targetUrl.hostname}${targetPath}`);

      // 5. Make request to OpenAI-compatible provider
      const proxyReq = httpModule.request(requestOptions, (proxyRes) => {
        const statusCode = proxyRes.statusCode ?? 500;

        log(`Response status: ${statusCode}`);

        // Handle error responses
        if (statusCode >= 400) {
          handleErrorResponse(proxyRes, res, statusCode);
          return;
        }

        if (isStreaming) {
          // Streaming response
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': 'http://127.0.0.1',
          });

          const translator = createStreamingTranslator({
            requestModel: anthropicRequest.model,
            debug: config.debug,
          });

          proxyRes.pipe(translator).pipe(res);

          proxyRes.on('error', (err) => {
            log(`Upstream error: ${err.message}`);
            res.end();
          });

          translator.on('error', (err) => {
            log(`Translator error: ${err.message}`);
            res.end();
          });
        } else {
          // Non-streaming response
          readBody(proxyRes)
            .then((responseBody) => {
              try {
                const openaiResponse = JSON.parse(responseBody) as OpenAIResponse;
                const anthropicResponse = translateResponse(openaiResponse, anthropicRequest.model);

                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': 'http://127.0.0.1',
                });
                res.end(JSON.stringify(anthropicResponse));
              } catch (parseErr) {
                log(`Parse error: ${parseErr}`);
                const errorResponse = createErrorResponse(parseErr, 'response-parse');
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(errorResponse));
              }
            })
            .catch((err) => {
              log(`Read error: ${err.message}`);
              handleError(res, err, 'response-read');
            });
        }
      });

      proxyReq.on('error', (err) => {
        log(`Request error: ${err.message}`);
        handleError(res, err, 'upstream-request');
      });

      proxyReq.on('timeout', () => {
        log('Request timeout');
        proxyReq.destroy();
        handleError(res, new Error('Request timeout'), 'timeout');
      });

      proxyReq.write(requestBody);
      proxyReq.end();
    } catch (err) {
      log(`Handler error: ${err}`);
      handleError(res, err, 'request-handler');
    }
  });

  // Start server
  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      log(`Server error: ${err.message}`);
      reject(err);
    });

    server.listen(config.port ?? 0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : (config.port ?? 0);

      if (!port) {
        reject(new Error('Failed to get server port'));
        return;
      }

      log(`Listening on port ${port}`);

      resolve({
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        shutdown: () =>
          new Promise<void>((resolveShutdown) => {
            server.close(() => {
              log('Server closed');
              resolveShutdown();
            });
          }),
      });
    });
  });
}

/**
 * Read full body from an incoming message with size limit
 */
function readBody(stream: http.IncomingMessage, maxSize = MAX_BODY_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    stream.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        stream.destroy();
        reject(new Error(`Request body exceeds maximum size of ${maxSize} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
    stream.on('error', reject);
  });
}

/**
 * Handle upstream error responses
 */
function handleErrorResponse(proxyRes: http.IncomingMessage, res: http.ServerResponse, statusCode: number): void {
  readBody(proxyRes)
    .then((body) => {
      try {
        const errorData = JSON.parse(body) as OpenAIErrorResponse;
        const anthropicError = {
          type: 'error',
          error: {
            type: mapStatusToErrorType(statusCode),
            message:
              (typeof errorData.error === 'string' ? errorData.error : errorData.error?.message) ||
              `Upstream error: ${statusCode}`,
          },
        };
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(anthropicError));
      } catch {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            type: 'error',
            error: {
              type: mapStatusToErrorType(statusCode),
              message: body || `Upstream error: ${statusCode}`,
            },
          })
        );
      }
    })
    .catch(() => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          type: 'error',
          error: {
            type: mapStatusToErrorType(statusCode),
            message: `Upstream error: ${statusCode}`,
          },
        })
      );
    });
}

/**
 * Map HTTP status code to Anthropic error type
 */
function mapStatusToErrorType(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'invalid_request_error';
    case 401:
      return 'authentication_error';
    case 403:
      return 'permission_error';
    case 404:
      return 'not_found_error';
    case 429:
      return 'rate_limit_error';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'api_error';
    default:
      return 'api_error';
  }
}

/**
 * Handle general errors
 */
function handleError(res: http.ServerResponse, err: unknown, phase: string): void {
  const errorResponse = createErrorResponse(err, phase);
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
  }
  res.end(JSON.stringify(errorResponse));
}

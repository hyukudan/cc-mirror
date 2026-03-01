/**
 * Translate OpenAI API responses to Anthropic API format
 */

import type {
  OpenAIResponse,
  OpenAIErrorResponse,
  AnthropicResponse,
  AnthropicContentBlock,
  AnthropicErrorResponse,
} from './types.js';

/** Text inserted into the response when the upstream provider triggers a content filter. */
export const CONTENT_FILTER_NOTICE = '[Response blocked by provider content filter]';

/**
 * Convert OpenAI API response to Anthropic API format
 */
export function translateResponse(openai: OpenAIResponse, requestModel: string): AnthropicResponse {
  const choice = openai.choices?.[0];
  if (!choice) {
    throw new Error('OpenAI response has no choices');
  }

  const content: AnthropicContentBlock[] = [];

  // 1. Add text content (strip <think>...</think> blocks from thinking models like GLM-4.7-Flash)
  if (choice.message.content) {
    const stripped = choice.message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (stripped) {
      content.push({
        type: 'text',
        text: stripped,
      });
    }
  }

  // 2. Add tool use blocks
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    for (const toolCall of choice.message.tool_calls) {
      let parsedInput: Record<string, unknown> = {};
      try {
        parsedInput = JSON.parse(toolCall.function.arguments);
      } catch {
        // If parsing fails, wrap the raw string
        parsedInput = { _raw: toolCall.function.arguments };
      }

      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: parsedInput,
      });
    }
  }

  // 3. If the provider triggered a content filter, inject a visible notice so
  //    the user knows why the response is empty / truncated.
  if (isContentFiltered(choice.finish_reason)) {
    content.push({
      type: 'text',
      text: CONTENT_FILTER_NOTICE,
    });
  }

  // 4. Ensure there's at least one content block
  if (content.length === 0) {
    content.push({
      type: 'text',
      text: '',
    });
  }

  // 5. Translate finish reason
  const stopReason = translateFinishReason(choice.finish_reason);

  return {
    id: openai.id || `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model: requestModel, // Use original model name for consistency
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: openai.usage?.prompt_tokens ?? 0,
      output_tokens: openai.usage?.completion_tokens ?? 0,
    },
  };
}

/**
 * Translate OpenAI finish_reason to Anthropic stop_reason
 */
export function translateFinishReason(
  reason: OpenAIResponse['choices'][0]['finish_reason'] | null | undefined
): AnthropicResponse['stop_reason'] {
  switch (reason) {
    case 'stop':
      return 'end_turn';
    case 'length':
      return 'max_tokens';
    case 'tool_calls':
      return 'tool_use';
    case 'content_filter':
      // Anthropic has no content_filter stop_reason; use end_turn.
      // Callers that need to distinguish content_filter should check
      // isContentFiltered() separately and inject a notice text block.
      return 'end_turn';
    default:
      return null;
  }
}

/**
 * Returns true when the OpenAI finish_reason indicates a content filter hit.
 */
export function isContentFiltered(reason: string | null | undefined): boolean {
  return reason === 'content_filter';
}

/**
 * Translate OpenAI error response to Anthropic error format
 */
export function translateErrorResponse(openaiError: OpenAIErrorResponse): AnthropicErrorResponse {
  const err = openaiError.error;
  if (typeof err === 'string') {
    return { type: 'error', error: { type: 'api_error', message: err } };
  }
  const errorType = mapErrorType(err.type, err.code);
  return {
    type: 'error',
    error: {
      type: errorType,
      message: err.message,
    },
  };
}

/**
 * Map OpenAI error types to Anthropic error types
 */
function mapErrorType(type?: string, code?: string): string {
  // Check code first for more specific errors
  if (code) {
    switch (code) {
      case 'invalid_api_key':
        return 'authentication_error';
      case 'insufficient_quota':
        return 'rate_limit_error';
      case 'model_not_found':
        return 'not_found_error';
      case 'context_length_exceeded':
        return 'invalid_request_error';
    }
  }

  // Fallback to type mapping
  switch (type) {
    case 'invalid_request_error':
      return 'invalid_request_error';
    case 'authentication_error':
      return 'authentication_error';
    case 'permission_error':
      return 'permission_error';
    case 'not_found_error':
      return 'not_found_error';
    case 'rate_limit_error':
      return 'rate_limit_error';
    case 'server_error':
    case 'service_unavailable':
      return 'api_error';
    default:
      return 'api_error';
  }
}

/**
 * Maps internal proxy phase identifiers to human-readable descriptions.
 */
function phaseDescription(phase: string): string {
  switch (phase) {
    case 'response-parse':
      return 'Failed to parse upstream response body as JSON';
    case 'response-read':
      return 'Failed to read upstream response body';
    case 'upstream-request':
      return 'Upstream connection failed';
    case 'upstream':
      return 'Upstream API returned an error';
    case 'timeout':
      return 'Upstream request timed out';
    case 'request-handler':
      return 'Failed to handle incoming request';
    default:
      return `Proxy error in phase "${phase}"`;
  }
}

/**
 * Create an Anthropic error response from a generic error.
 * Uses phase-specific descriptions to make the error actionable.
 */
export function createErrorResponse(error: unknown, phase: string): AnthropicErrorResponse {
  const cause = error instanceof Error ? error.message : String(error);
  const description = phaseDescription(phase);

  return {
    type: 'error',
    error: {
      type: 'api_error',
      message: `${description}: ${cause}`,
    },
  };
}

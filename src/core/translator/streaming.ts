/**
 * Streaming translation: OpenAI SSE → Anthropic SSE
 */

import { Transform, type TransformCallback } from 'node:stream';
import type { OpenAIStreamChunk, AnthropicStreamEvent, AnthropicResponse, StreamingState } from './types.js';
import { translateFinishReason, isContentFiltered, CONTENT_FILTER_NOTICE } from './openai-to-anthropic.js';

/**
 * Format an Anthropic streaming event as SSE
 */
export function formatSSE(event: AnthropicStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Options for streaming translator
 */
export interface StreamingTranslatorOptions {
  requestModel: string;
  inputTokens?: number;
  debug?: boolean;
}

/**
 * Creates a transform stream that converts OpenAI SSE chunks to Anthropic SSE events
 */
export function createStreamingTranslator(
  requestModelOrOptions: string | StreamingTranslatorOptions,
  inputTokens = 0
): Transform {
  // Support both old signature (string, number) and new options object
  const options: StreamingTranslatorOptions =
    typeof requestModelOrOptions === 'string'
      ? { requestModel: requestModelOrOptions, inputTokens }
      : requestModelOrOptions;

  const log = options.debug ? console.error.bind(console, '[streaming-translator]') : () => {};

  const state: StreamingState = {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    requestModel: options.requestModel,
    sentMessageStart: false,
    currentBlockIndex: -1,
    currentBlockType: null,
    toolCallAccumulators: new Map(),
    inputTokens: options.inputTokens ?? 0,
    outputTokens: 0,
    insideThink: false,
    finished: false,
  };

  let buffer = '';

  return new Transform({
    readableObjectMode: false,
    writableObjectMode: false,

    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) {
          // Empty line or comment, skip
          continue;
        }

        if (!trimmed.startsWith('data: ')) {
          continue;
        }

        const data = trimmed.slice(6).trim();

        // Handle stream end
        if (data === '[DONE]') {
          if (!state.finished) {
            // Close any open content block
            if (state.currentBlockIndex >= 0) {
              this.push(formatSSE({ type: 'content_block_stop', index: state.currentBlockIndex }));
            }

            // Send message_delta with final stop reason
            this.push(
              formatSSE({
                type: 'message_delta',
                delta: { stop_reason: 'end_turn' },
                usage: { output_tokens: state.outputTokens },
              })
            );

            // Send message_stop
            this.push(formatSSE({ type: 'message_stop' }));
            state.finished = true;
          }
          continue;
        }

        try {
          const openaiChunk = JSON.parse(data) as OpenAIStreamChunk;
          const events = translateChunk(openaiChunk, state);

          for (const event of events) {
            this.push(formatSSE(event));
          }
        } catch (err) {
          // Skip malformed JSON chunks but log in debug mode
          log(`Parse error for chunk: ${data.slice(0, 100)}...`, err);
        }
      }

      callback();
    },

    flush(callback: TransformCallback) {
      // Process any remaining buffer
      if (buffer.trim()) {
        const data = buffer.trim();
        if (data.startsWith('data: ') && data.slice(6).trim() !== '[DONE]') {
          try {
            const openaiChunk = JSON.parse(data.slice(6).trim()) as OpenAIStreamChunk;
            const events = translateChunk(openaiChunk, state);
            for (const event of events) {
              this.push(formatSSE(event));
            }
          } catch (err) {
            log(`Parse error in flush: ${data.slice(0, 100)}...`, err);
          }
        }
      }

      // Ensure stream is properly closed
      if (state.sentMessageStart && state.currentBlockIndex >= 0 && !state.finished) {
        this.push(formatSSE({ type: 'content_block_stop', index: state.currentBlockIndex }));
        this.push(
          formatSSE({
            type: 'message_delta',
            delta: { stop_reason: 'end_turn' },
            usage: { output_tokens: state.outputTokens },
          })
        );
        this.push(formatSSE({ type: 'message_stop' }));
      }

      callback();
    },
  });
}

/**
 * Translate a single OpenAI stream chunk to Anthropic events
 */
function translateChunk(chunk: OpenAIStreamChunk, state: StreamingState): AnthropicStreamEvent[] {
  const events: AnthropicStreamEvent[] = [];
  const choice = chunk.choices[0];

  if (!choice) {
    // Handle error chunks from upstream (e.g., LM Studio)
    if (chunk.error) {
      const errorMsg = typeof chunk.error === 'string' ? chunk.error : chunk.error?.message || 'Unknown upstream error';
      return [
        {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: errorMsg,
          },
        },
      ];
    }
    return events;
  }

  const delta = choice.delta;

  // Emit message_start on first chunk
  if (!state.sentMessageStart) {
    const initialMessage: Partial<AnthropicResponse> = {
      id: state.messageId,
      type: 'message',
      role: 'assistant',
      content: [],
      model: state.requestModel,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: state.inputTokens, output_tokens: 0 },
    };

    events.push({
      type: 'message_start',
      message: initialMessage,
    });

    state.sentMessageStart = true;
  }

  // Handle text content (with <think>...</think> stripping for thinking models)
  if (delta.content !== undefined && delta.content !== null) {
    // Strip <think>...</think> blocks that may span multiple chunks
    let text = delta.content;
    if (text) {
      text = stripThinkContent(text, state);
    }

    // Only proceed if there is visible text after stripping
    if (text) {
      // Start a new text block if needed
      if (state.currentBlockType !== 'text') {
        // Close previous block if any
        if (state.currentBlockIndex >= 0 && state.currentBlockType !== null) {
          events.push({ type: 'content_block_stop', index: state.currentBlockIndex });
        }

        state.currentBlockIndex++;
        state.currentBlockType = 'text';

        events.push({
          type: 'content_block_start',
          index: state.currentBlockIndex,
          content_block: { type: 'text', text: '' },
        });
      }

      // Emit text delta
      events.push({
        type: 'content_block_delta',
        index: state.currentBlockIndex,
        delta: { type: 'text_delta', text },
      });
      state.outputTokens++;
    }
  }

  // Handle tool calls
  if (delta.tool_calls && delta.tool_calls.length > 0) {
    for (const toolCallDelta of delta.tool_calls) {
      const toolIndex = toolCallDelta.index;
      let accumulator = state.toolCallAccumulators.get(toolIndex);

      // New tool call starting
      if (toolCallDelta.id || !accumulator) {
        // Close previous block if any
        if (state.currentBlockIndex >= 0 && state.currentBlockType !== null) {
          events.push({ type: 'content_block_stop', index: state.currentBlockIndex });
        }

        state.currentBlockIndex++;
        state.currentBlockType = 'tool_use';

        accumulator = {
          id: toolCallDelta.id || `call_${Date.now()}_${toolIndex}`,
          name: toolCallDelta.function?.name || '',
          arguments: '',
        };
        state.toolCallAccumulators.set(toolIndex, accumulator);

        events.push({
          type: 'content_block_start',
          index: state.currentBlockIndex,
          content_block: {
            type: 'tool_use',
            id: accumulator.id,
            name: accumulator.name,
            input: {},
          },
        });
      }

      // Update tool name if provided
      if (toolCallDelta.function?.name) {
        accumulator.name = toolCallDelta.function.name;
      }

      // Accumulate arguments
      if (toolCallDelta.function?.arguments) {
        accumulator.arguments += toolCallDelta.function.arguments;

        // Emit input_json_delta
        events.push({
          type: 'content_block_delta',
          index: state.currentBlockIndex,
          delta: {
            type: 'input_json_delta',
            partial_json: toolCallDelta.function.arguments,
          },
        });
        state.outputTokens++;
      }
    }
  }

  // Handle finish reason
  if (choice.finish_reason) {
    // Close current block
    if (state.currentBlockIndex >= 0 && state.currentBlockType !== null) {
      events.push({ type: 'content_block_stop', index: state.currentBlockIndex });
      state.currentBlockType = null;
    }

    // When the provider triggers a content filter, inject a visible notice text
    // block so the user knows the response was blocked rather than empty.
    if (isContentFiltered(choice.finish_reason)) {
      state.currentBlockIndex++;
      state.currentBlockType = 'text';
      events.push({
        type: 'content_block_start',
        index: state.currentBlockIndex,
        content_block: { type: 'text', text: '' },
      });
      events.push({
        type: 'content_block_delta',
        index: state.currentBlockIndex,
        delta: { type: 'text_delta', text: CONTENT_FILTER_NOTICE },
      });
      events.push({ type: 'content_block_stop', index: state.currentBlockIndex });
      state.currentBlockType = null;
    }

    const stopReason = translateFinishReason(choice.finish_reason);

    // Update output tokens from usage if available
    if (chunk.usage?.completion_tokens) {
      state.outputTokens = chunk.usage.completion_tokens;
    }

    events.push({
      type: 'message_delta',
      delta: {
        stop_reason: stopReason,
        stop_sequence: null,
      },
      usage: { output_tokens: state.outputTokens },
    });

    events.push({ type: 'message_stop' });
    state.finished = true;
  }

  return events;
}

/**
 * Strip <think>...</think> content from a streaming text chunk.
 * Handles blocks that span multiple chunks by tracking state.insideThink.
 *
 * Returns the visible text (outside think blocks), or empty string if
 * all content was inside a think block.
 */
function stripThinkContent(text: string, state: StreamingState): string {
  let result = '';
  let remaining = text;

  while (remaining.length > 0) {
    if (state.insideThink) {
      // Look for closing tag
      const closeIdx = remaining.indexOf('</think>');
      if (closeIdx === -1) {
        // Entire chunk is inside think block, suppress all
        break;
      }
      // Skip past the closing tag
      remaining = remaining.slice(closeIdx + '</think>'.length);
      state.insideThink = false;
    } else {
      // Look for opening tag
      const openIdx = remaining.indexOf('<think>');
      if (openIdx === -1) {
        // No think tag, keep all remaining text
        result += remaining;
        break;
      }
      // Keep text before the opening tag
      result += remaining.slice(0, openIdx);
      remaining = remaining.slice(openIdx + '<think>'.length);
      state.insideThink = true;
    }
  }

  return result;
}

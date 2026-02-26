/**
 * Translate Anthropic API requests to OpenAI API format
 */

import type {
  AnthropicRequest,
  AnthropicMessage,
  AnthropicContentBlock,
  AnthropicTool,
  AnthropicToolChoice,
  OpenAIRequest,
  OpenAIMessage,
  OpenAITool,
  OpenAIToolCall,
  OpenAIContentPart,
} from './types.js';

/**
 * Convert Anthropic API request to OpenAI API format
 */
export function translateRequest(anthropic: AnthropicRequest, modelMap?: Record<string, string>): OpenAIRequest {
  const messages: OpenAIMessage[] = [];

  // 1. Handle system message (Anthropic top-level → OpenAI system role)
  if (anthropic.system) {
    const systemContent = extractSystemContent(anthropic.system);
    if (systemContent) {
      messages.push({ role: 'system', content: systemContent });
    }
  }

  // 2. Convert messages
  for (const msg of anthropic.messages) {
    const translated = translateMessage(msg);
    messages.push(...translated);
  }

  // 3. Build OpenAI request
  const request: OpenAIRequest = {
    model: modelMap?.[anthropic.model] ?? anthropic.model,
    messages,
    max_tokens: anthropic.max_tokens,
  };

  // 4. Handle streaming
  if (anthropic.stream !== undefined) {
    request.stream = anthropic.stream;
    // Note: stream_options { include_usage: true } intentionally omitted.
    // LM Studio and many local inference servers return 400 on this parameter.
  }

  // 5. Optional parameters
  if (anthropic.temperature !== undefined) {
    request.temperature = anthropic.temperature;
  }
  if (anthropic.top_p !== undefined) {
    request.top_p = anthropic.top_p;
  }
  if (anthropic.stop_sequences && anthropic.stop_sequences.length > 0) {
    request.stop = anthropic.stop_sequences;
  }
  if (anthropic.metadata?.user_id) {
    request.user = anthropic.metadata.user_id;
  }

  // 6. Tools translation
  if (anthropic.tools && anthropic.tools.length > 0) {
    request.tools = anthropic.tools.map(translateTool);
  }

  // 7. Tool choice translation
  if (anthropic.tool_choice) {
    request.tool_choice = translateToolChoice(anthropic.tool_choice);
  }

  return request;
}

/**
 * Extract text content from Anthropic system field
 */
function extractSystemContent(system: string | AnthropicContentBlock[]): string {
  if (typeof system === 'string') {
    return system;
  }
  // Array of content blocks - extract text
  return system
    .filter((block): block is AnthropicContentBlock & { text: string } => block.type === 'text' && !!block.text)
    .map((block) => block.text)
    .join('\n');
}

/**
 * Translate a single Anthropic message to OpenAI message(s)
 * May return multiple messages (e.g., when handling tool results)
 */
function translateMessage(msg: AnthropicMessage): OpenAIMessage[] {
  const result: OpenAIMessage[] = [];

  // Simple string content
  if (typeof msg.content === 'string') {
    result.push({ role: msg.role, content: msg.content });
    return result;
  }

  // Handle content blocks
  const textParts: string[] = [];
  const imageParts: OpenAIContentPart[] = [];
  const toolCalls: OpenAIToolCall[] = [];
  const toolResults: OpenAIMessage[] = [];

  for (const block of msg.content) {
    switch (block.type) {
      case 'text':
        if (block.text) {
          textParts.push(block.text);
        }
        break;

      case 'tool_use':
        if (block.id && block.name) {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input ?? {}),
            },
          });
        }
        break;

      case 'tool_result':
        if (block.tool_use_id) {
          const resultContent = extractToolResultContent(block);
          toolResults.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: resultContent,
          });
        }
        break;

      case 'image': {
        const source = block.source;
        if (source?.type === 'base64' && source.media_type && source.data) {
          imageParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${source.media_type};base64,${source.data}`,
            },
          });
        }
        break;
      }
    }
  }

  // Build the main message
  if (msg.role === 'assistant') {
    const assistantMessage: OpenAIMessage = {
      role: 'assistant',
      content: textParts.length > 0 ? textParts.join('') : null,
    };
    if (toolCalls.length > 0) {
      assistantMessage.tool_calls = toolCalls;
    }
    result.push(assistantMessage);
  } else if (imageParts.length > 0) {
    // Multimodal user message: use OpenAI content array format
    const contentParts: OpenAIContentPart[] = [];
    if (textParts.length > 0) {
      contentParts.push({ type: 'text', text: textParts.join('') });
    }
    contentParts.push(...imageParts);
    result.push({
      role: 'user',
      content: contentParts,
    });
  } else {
    // Text-only user message
    result.push({
      role: 'user',
      content: textParts.join('') || '',
    });
  }

  // Add tool results as separate messages (must come after assistant message with tool_calls)
  result.push(...toolResults);

  return result;
}

/**
 * Extract content from tool result block
 */
function extractToolResultContent(block: AnthropicContentBlock): string {
  if (typeof block.content === 'string') {
    return block.content;
  }
  if (Array.isArray(block.content)) {
    return block.content
      .filter((b): b is AnthropicContentBlock & { text: string } => b.type === 'text' && !!b.text)
      .map((b) => b.text)
      .join('\n');
  }
  return '';
}

/**
 * Translate Anthropic tool definition to OpenAI format
 */
function translateTool(tool: AnthropicTool): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: sanitizeSchema(tool.input_schema),
    },
  };
}

/**
 * JSON Schema `format` values that local inference servers (LM Studio, Ollama, etc.)
 * commonly reject. Rather than maintaining an allowlist, we strip the `format` property
 * entirely — local servers do not perform format validation and its presence only causes
 * compatibility errors.
 *
 * Examples of rejected values: "uri", "uri-reference", "uri-template", "date-time",
 * "date", "time", "email", "hostname", "ipv4", "ipv6", "regex".
 */
const STRIP_SCHEMA_KEYS = new Set(['format', '$schema']);

/**
 * Sanitize JSON schema for local-server compatibility.
 *
 * Strips:
 *   - `format`  — local servers reject many format values and ignore the rest
 *   - `$schema` — meta-schema declarations are not understood by most local runtimes
 *
 * Recurses into nested objects and array items so that sub-schemas inside
 * `properties`, `items`, `anyOf`, `oneOf`, `allOf`, and `$defs`/`definitions`
 * are also cleaned.
 *
 * Note: `anyOf`/`oneOf`/`allOf`/`$defs`/`definitions` constructs are left in
 * place; some local servers handle them correctly, and stripping them would
 * alter tool semantics.
 */
function sanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // Drop keys that cause local-server rejections
    if (STRIP_SCHEMA_KEYS.has(key)) {
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeSchema(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === 'object' ? sanitizeSchema(item as Record<string, unknown>) : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Translate Anthropic tool_choice to OpenAI format
 */
function translateToolChoice(choice: AnthropicToolChoice): OpenAIRequest['tool_choice'] {
  switch (choice.type) {
    case 'auto':
      return 'auto';
    case 'any':
      // 'required' is not supported by LM Studio and many local inference servers; use 'auto' instead.
      return 'auto';
    case 'tool':
      if (choice.name) {
        return { type: 'function', function: { name: choice.name } };
      }
      return 'auto';
    default:
      return 'auto';
  }
}

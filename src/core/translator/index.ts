/**
 * Anthropic ↔ OpenAI API Translation Module
 *
 * Enables using OpenAI-compatible providers (DeepSeek, Groq, Together AI, etc.)
 * with Claude Code by translating API formats on the fly.
 *
 * ## Architecture
 *
 * ```
 * Claude Code (Anthropic API)
 *       ↓
 * Translation Proxy (localhost:auto)
 *       ↓ translateRequest()
 * OpenAI-compatible Provider
 *       ↓
 * Translation Proxy
 *       ↓ translateResponse() / createStreamingTranslator()
 * Claude Code
 * ```
 *
 * ## Key Translations
 *
 * ### Request (Anthropic → OpenAI)
 * - `system` (top-level) → message with `role: "system"`
 * - `stop_sequences` → `stop`
 * - `tools[].input_schema` → `tools[].function.parameters`
 * - Header `X-Api-Key` → Header `Authorization: Bearer`
 *
 * ### Response (OpenAI → Anthropic)
 * - `choices[0].message.content` → `content: [{type: "text", text: ...}]`
 * - `finish_reason: "stop"` → `stop_reason: "end_turn"`
 * - `finish_reason: "tool_calls"` → `stop_reason: "tool_use"`
 * - `tool_calls[].function.arguments` (string) → `content[].input` (object)
 *
 * ### Streaming
 * - OpenAI: `data: {...}\n` + `data: [DONE]`
 * - Anthropic: Named events (`message_start`, `content_block_delta`, etc.)
 *
 * ## Usage
 *
 * The module is used automatically by cc-mirror when a provider has
 * `requiresTranslation: true`. The wrapper script starts the proxy via launcher.ts.
 *
 * For providers that need translation:
 * 1. Set `requiresTranslation: true` in provider template
 * 2. Set `translationTargetUrl` to the OpenAI-compatible API endpoint
 * 3. The wrapper will use launcher.ts to start proxy before Claude Code
 */

export { translateRequest } from './anthropic-to-openai.js';
export { translateResponse, translateFinishReason, createErrorResponse } from './openai-to-anthropic.js';
export { createStreamingTranslator, formatSSE, type StreamingTranslatorOptions } from './streaming.js';
export { startTranslatorProxy } from './proxy-server.js';
export { main as launchWithTranslation } from './launcher.js';

export type {
  // Anthropic types
  AnthropicRequest,
  AnthropicResponse,
  AnthropicMessage,
  AnthropicContentBlock,
  AnthropicTool,
  AnthropicToolChoice,
  AnthropicErrorResponse,
  AnthropicStreamEvent,
  AnthropicStreamEventType,
  // OpenAI types
  OpenAIRequest,
  OpenAIResponse,
  OpenAIMessage,
  OpenAITool,
  OpenAIToolCall,
  OpenAIErrorResponse,
  OpenAIStreamChunk,
  // Config types
  TranslatorProxyConfig,
  ProxyServerInfo,
  StreamingState,
  ToolCallAccumulator,
} from './types.js';

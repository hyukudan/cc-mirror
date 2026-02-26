/**
 * Type definitions for Anthropic ↔ OpenAI API translation
 */

// ============================================================================
// Anthropic API Types (What Claude Code sends)
// ============================================================================

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | AnthropicContentBlock[];
  is_error?: boolean;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicToolChoice {
  type: 'auto' | 'any' | 'tool';
  name?: string;
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string | AnthropicContentBlock[];
  stop_sequences?: string[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
  metadata?: { user_id?: string };
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

// ============================================================================
// OpenAI API Types (What the provider expects)
// ============================================================================

/** A text content part inside a multimodal OpenAI message */
export interface OpenAITextContentPart {
  type: 'text';
  text: string;
}

/** An image_url content part inside a multimodal OpenAI message */
export interface OpenAIImageContentPart {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export type OpenAIContentPart = OpenAITextContentPart | OpenAIImageContentPart;

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentPart[] | null;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  max_completion_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  user?: string;
  stream_options?: { include_usage?: boolean };
}

export interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIErrorResponse {
  error:
    | string
    | {
        message: string;
        type: string;
        param?: string;
        code?: string;
      };
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface OpenAIStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Error field present in upstream error chunks (e.g., LM Studio) */
  error?: string | { message?: string; type?: string; code?: string };
}

export type AnthropicStreamEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'ping'
  | 'error';

export interface AnthropicStreamEvent {
  type: AnthropicStreamEventType;
  message?: Partial<AnthropicResponse>;
  index?: number;
  content_block?: Partial<AnthropicContentBlock>;
  delta?: {
    type?: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
    stop_reason?: AnthropicResponse['stop_reason'];
    stop_sequence?: string | null;
  };
  usage?: { output_tokens: number };
  error?: { type: string; message: string };
}

// ============================================================================
// Proxy Configuration
// ============================================================================

export interface TranslatorProxyConfig {
  /** Port for the local proxy to listen on (default: 0 = auto-assign) */
  port?: number;
  /** Target OpenAI-compatible API base URL */
  targetBaseUrl: string;
  /** API key for the target provider */
  apiKey: string;
  /** Optional model name mapping (Anthropic model -> OpenAI model) */
  modelMap?: Record<string, string>;
  /** Request timeout in ms (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface ProxyServerInfo {
  /** Actual port the proxy is listening on */
  port: number;
  /** Full base URL for ANTHROPIC_BASE_URL */
  baseUrl: string;
  /** Function to gracefully shutdown the proxy */
  shutdown: () => Promise<void>;
}

// ============================================================================
// Translation State (for streaming)
// ============================================================================

/** Accumulated tool call data during streaming */
export interface ToolCallAccumulator {
  id: string;
  name: string;
  arguments: string;
}

export interface StreamingState {
  messageId: string;
  requestModel: string;
  sentMessageStart: boolean;
  currentBlockIndex: number;
  currentBlockType: 'text' | 'tool_use' | null;
  toolCallAccumulators: Map<number, ToolCallAccumulator>;
  inputTokens: number;
  outputTokens: number;
  /** True while inside a <think>...</think> block from thinking models (e.g. GLM-4.7-Flash) */
  insideThink: boolean;
  /** True once the terminal sequence (content_block_stop + message_delta + message_stop) has been emitted */
  finished: boolean;
}

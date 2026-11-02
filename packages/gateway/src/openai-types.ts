export interface OpenAIChatCompletionRequest {
  model: string;
  messages: {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: {
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }[];
    tool_call_id?: string;
  }[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  n?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: {
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }[];
    };
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | "function_call";
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChatCompletionStreamingResponse {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: "assistant";
      content?: string;
      tool_calls?: {
        index: number;
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }[];
    };
    finish_reason?: "stop" | "length" | "tool_calls" | "content_filter" | "function_call";
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
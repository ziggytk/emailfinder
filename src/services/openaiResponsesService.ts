// OpenAI Responses API Service for intelligent web navigation
import { tools } from './agentTools.ts';

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface OpenAIResponse {
  id: string;
  choices: Array<{
    delta: {
      content?: string;
      tool_calls?: any[];
    };
    finish_reason?: string;
  }>;
}

export class OpenAIResponsesService {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1/chat/completions';
  private model: string = 'gpt-4o-mini';

  constructor() {
    this.apiKey = process.env.VITE_OPENAI_API_KEY || import.meta.env?.VITE_OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found in environment variables');
    }
  }

  /**
   * Create a chat completion with streaming support
   */
  async createChatCompletion(
    messages: OpenAIMessage[],
    onDelta?: (delta: any) => void
  ): Promise<OpenAIResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          tools,
          tool_choice: 'auto',
          stream: true,
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0]) {
                const delta = parsed.choices[0].delta;
                if (delta.content) {
                  fullResponse += delta.content;
                }
                if (onDelta) {
                  onDelta(delta);
                }
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

      return {
        id: 'response-' + Date.now(),
        choices: [{
          delta: { content: fullResponse },
          finish_reason: 'stop'
        }]
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Execute tool calls from OpenAI response
   */
  async executeToolCalls(toolCalls: any[]): Promise<OpenAIMessage[]> {
    const toolMessages: OpenAIMessage[] = [];

    for (const toolCall of toolCalls) {
      const { id, function: func } = toolCall;
      const { name, arguments: args } = func;

      try {
        console.log(`🔧 Executing tool: ${name} with args:`, args);
        
        // Import and execute the tool function
        const { agentTools } = await import('./agentTools.ts');
        const toolFunction = agentTools[name as keyof typeof agentTools];
        
        if (typeof toolFunction === 'function') {
          const parsedArgs = JSON.parse(args);
          const result = await toolFunction(parsedArgs);
          
          toolMessages.push({
            role: 'tool',
            content: result,
            tool_call_id: id,
          });
          
          console.log(`✅ Tool ${name} executed successfully`);
        } else {
          throw new Error(`Tool function ${name} not found`);
        }
      } catch (error) {
        console.error(`❌ Tool execution failed for ${name}:`, error);
        toolMessages.push({
          role: 'tool',
          content: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          tool_call_id: id,
        });
      }
    }

    return toolMessages;
  }

  /**
   * Create a conversation with the AI agent
   */
  async startConversation(
    userMessage: string,
    onUpdate?: (message: string) => void
  ): Promise<string> {
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `You are an intelligent web navigation agent. Your goal is to help users navigate websites and perform tasks.

Available tools:
- open_url: Navigate to a specific URL
- get_dom_text: Get visible text content from the current page
- click_text_like: Click on elements that match text patterns
- wait_for_navigation: Wait for page navigation to complete
- current_url: Get the current page URL

Guidelines:
1. Always start by opening the target URL if provided
2. Use get_dom_text to understand the page content
3. Use click_text_like to interact with elements
4. Use wait_for_navigation after clicks to ensure navigation completes
5. Provide clear status updates to the user
6. If a task fails, explain what went wrong and suggest alternatives

Current task: ${userMessage}`
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    let finalResponse = '';

    try {
      const response = await this.createChatCompletion(messages, (delta) => {
        if (delta.content) {
          finalResponse += delta.content;
          if (onUpdate) {
            onUpdate(finalResponse);
          }
        }
        
        if (delta.tool_calls) {
          // Execute tool calls
          this.executeToolCalls(delta.tool_calls).then(toolMessages => {
            messages.push(...toolMessages);
            // Continue conversation with tool results
            this.continueConversation(messages, onUpdate);
          });
        }
      });

      return finalResponse;
    } catch (error) {
      console.error('Conversation error:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Continue conversation with tool results
   */
  private async continueConversation(
    messages: OpenAIMessage[],
    onUpdate?: (message: string) => void
  ): Promise<void> {
    try {
      const response = await this.createChatCompletion(messages, (delta) => {
        if (delta.content && onUpdate) {
          onUpdate(delta.content);
        }
        
        if (delta.tool_calls) {
          // Execute additional tool calls
          this.executeToolCalls(delta.tool_calls).then(toolMessages => {
            messages.push(...toolMessages);
            this.continueConversation(messages, onUpdate);
          });
        }
      });
    } catch (error) {
      console.error('Continue conversation error:', error);
    }
  }
}

// Export singleton instance
export const openaiResponsesService = new OpenAIResponsesService();

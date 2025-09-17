// Cloudflare Worker entry point for AI Workers integration
// This worker handles requests using Cloudflare's AI Workers binding

// Type definitions for Cloudflare AI Workers
interface Ai {
  run(model: string, input: any): Promise<any>;
}

interface Env {
  MCA: Ai;  // Cloudflare AI Workers binding
  OPENAI_API_KEY?: string;  // Fallback to OpenAI if needed
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Multi-Agent Conversation Generator Worker',
        version: '1.0.0',
        hasAIBinding: !!env.MCA,
        hasOpenAIKey: !!env.OPENAI_API_KEY
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // OpenAI API proxy endpoint
    if (url.pathname === '/api/openai' && request.method === 'POST') {
      try {
        const chatRequest = await request.json() as ChatRequest;

        // Try Cloudflare AI Workers first if available
        if (env.MCA) {
          console.log('Using Cloudflare AI Workers binding');
          
          // Map OpenAI model to Cloudflare AI model
          const cfModel = mapOpenAIModelToCF(chatRequest.model);
          
          const response = await env.MCA.run(cfModel, {
            messages: chatRequest.messages,
            temperature: chatRequest.temperature || 0.8,
            max_tokens: chatRequest.max_tokens || 500,
          });

          // Format response to match OpenAI API structure
          const formattedResponse = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: chatRequest.model,
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: response.response || response.result?.response || 'No response generated'
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          };

          return new Response(JSON.stringify(formattedResponse), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          });
        }

        // Fallback to OpenAI API if AI Workers not available
        if (env.OPENAI_API_KEY) {
          console.log('Falling back to OpenAI API');
          
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chatRequest),
          });

          if (!openaiResponse.ok) {
            const errorText = await openaiResponse.text();
            return new Response(JSON.stringify({ 
              error: 'OpenAI API request failed',
              details: errorText 
            }), {
              status: openaiResponse.status,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            });
          }

          const data = await openaiResponse.json();
          
          return new Response(JSON.stringify(data), {
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            }
          });
        }

        // No AI service available
        return new Response(JSON.stringify({ 
          error: 'No AI service available',
          details: 'Neither Cloudflare AI Workers binding nor OpenAI API key is configured'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });

      } catch (error) {
        console.error('Error processing chat request:', error);
        return new Response(JSON.stringify({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
    }

    // Default response for root path
    if (url.pathname === '/') {
      return new Response('Multi-Agent Conversation Generator Worker is running!', {
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // 404 for other paths
    return new Response('Not Found', { 
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  },
};

// Map OpenAI models to Cloudflare AI models
function mapOpenAIModelToCF(openaiModel: string): string {
  switch (openaiModel) {
    case 'gpt-4':
    case 'gpt-4-turbo':
      return '@cf/meta/llama-2-7b-chat-int8';  // Best available model
    case 'gpt-4o-mini':
    case 'gpt-3.5-turbo':
    default:
      return '@cf/meta/llama-2-7b-chat-int8';  // Default to Llama model
  }
}
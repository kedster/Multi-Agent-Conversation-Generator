// Cloudflare Worker entry point
// This file handles requests for the Worker deployment

export interface Env {
  OPENAI_API_KEY: string;
  ENVIRONMENT: string;
}

// Import the API handlers
import { handleOpenAIRequest } from './api/openai-worker';
import { handleHealthRequest } from './api/health-worker';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Add CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      // Health check endpoint
      if (pathname === '/api/health' && request.method === 'GET') {
        return handleHealthRequest(request, env, corsHeaders);
      }

      // OpenAI API proxy endpoint
      if (pathname === '/api/openai' && request.method === 'POST') {
        return handleOpenAIRequest(request, env, corsHeaders);
      }

      // Default response for unmatched routes
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'The requested endpoint was not found.',
        available_endpoints: [
          'GET /api/health',
          'POST /api/openai'
        ]
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};
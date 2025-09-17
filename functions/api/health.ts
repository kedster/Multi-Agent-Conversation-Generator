// Health check endpoint for Cloudflare Pages Functions
export async function onRequestGet(): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Multi-Agent Conversation Generator API',
    version: '1.0.0'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
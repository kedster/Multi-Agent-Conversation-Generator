// Health check handler for Cloudflare Worker
interface Env {
  ENVIRONMENT?: string;
}

export async function handleHealthRequest(
  request: Request, 
  env: Env, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Multi-Agent Conversation Generator API',
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'unknown',
    endpoints: {
      health: 'GET /api/health',
      openai: 'POST /api/openai'
    },
    uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'N/A'
  };

  return new Response(JSON.stringify(healthData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    }
  });
}
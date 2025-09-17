// Cloudflare Pages Functions middleware
// This middleware adds CORS headers to all requests

interface PagesContext {
  request: Request;
  env: Record<string, any>;
  params: Record<string, string>;
  next: () => Promise<Response>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  // Add CORS headers for all requests
  const response = await context.next();
  
  // Clone the response to modify headers
  const newResponse = new Response(response.body, response);
  
  // Add CORS headers
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return newResponse;
}
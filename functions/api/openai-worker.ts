// OpenAI API handler for Cloudflare Worker
interface Env {
  OPENAI_API_KEY: string;
}

export async function handleOpenAIRequest(
  request: Request, 
  env: Env, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Check for API key
    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        message: 'Please set the OPENAI_API_KEY environment variable'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }

    // Get the request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        message: 'Please provide a valid JSON payload'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request format',
        message: 'Request must include a "messages" array'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }

    // Forward to OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        messages: body.messages,
        temperature: body.temperature || 0.7,
        max_tokens: body.max_tokens || 1000,
        ...body
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      
      return new Response(JSON.stringify({ 
        error: 'OpenAI API request failed',
        status: openaiResponse.status,
        details: errorText 
      }), {
        status: openaiResponse.status,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }

    const data = await openaiResponse.json();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error proxying OpenAI request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      }
    });
  }
}
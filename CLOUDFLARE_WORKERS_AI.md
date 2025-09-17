# Cloudflare Workers AI Integration Guide

This guide explains how to deploy the Multi-Agent Conversation Generator using Cloudflare Workers with AI Workers binding, eliminating the need for an OpenAI API key.

## 🤖 Cloudflare AI Workers vs Cloudflare Pages

This repository supports two deployment approaches:

### Option 1: Cloudflare Workers + AI Workers (Recommended)
- ✅ **No OpenAI API key required**
- ✅ Uses Cloudflare's built-in AI models
- ✅ Cost-effective for high usage
- ✅ Automatic AI model management
- 🔧 Uses the `worker.ts` entry point with `MCA` binding

### Option 2: Cloudflare Pages + Functions (Alternative)
- ⚠️ Requires OpenAI API key
- ⚠️ Costs based on OpenAI usage
- ✅ Uses latest OpenAI models (GPT-4, etc.)
- ✅ More flexible model selection
- 🔧 Uses `functions/` directory approach

## 🚀 Quick Start: Cloudflare Workers Deployment

### Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install globally
   ```bash
   npm install -g wrangler
   ```
3. **Authentication**: Log in to Cloudflare
   ```bash
   wrangler auth login
   ```

### Deployment Steps

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd Multi-Agent-Conversation-Generator
   npm install
   ```

2. **Deploy the Worker**
   ```bash
   npm run deploy:worker
   ```
   
   Or manually:
   ```bash
   wrangler deploy --config wrangler-worker.toml
   ```

3. **Verify Deployment**
   Visit your worker URL:
   ```
   https://multi-agent-conversation-worker.<your-subdomain>.workers.dev/health
   ```
   
   You should see a JSON response indicating the AI binding status.

### Configuration

The Worker configuration is in `wrangler-worker.toml`:

```toml
name = "multi-agent-conversation-worker"
main = "worker.ts"
compatibility_date = "2024-01-01"

[ai]
binding = "MCA"  # This creates the AI Workers binding
```

## 🔧 Worker Architecture

### Entry Point: `worker.ts`

The worker handles these endpoints:

- `GET /health` - Health check and binding status
- `POST /api/openai` - AI chat completions (compatible with OpenAI API format)
- `GET /` - Basic status message

### AI Model Mapping

The worker automatically maps OpenAI model names to Cloudflare AI models:

| OpenAI Model | Cloudflare AI Model |
|--------------|-------------------|
| `gpt-4` | `@cf/meta/llama-2-7b-chat-int8` |
| `gpt-4-turbo` | `@cf/meta/llama-2-7b-chat-int8` |
| `gpt-4o-mini` | `@cf/meta/llama-2-7b-chat-int8` |
| `gpt-3.5-turbo` | `@cf/meta/llama-2-7b-chat-int8` |

### Service Detection

The frontend automatically detects which service to use:

1. **Checks health endpoint** for AI binding availability
2. **Falls back to Pages Functions** if no AI binding
3. **Uses direct OpenAI** in development mode

## 🔄 Fallback to OpenAI (Optional)

For additional reliability, you can configure an OpenAI API key as backup:

```bash
wrangler secret put OPENAI_API_KEY --config wrangler-worker.toml
```

The worker will:
1. **Try AI Workers first** (if available)
2. **Fall back to OpenAI** (if API key provided)
3. **Return error** (if neither available)

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-worker-url.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "hasAIBinding": true,
  "hasOpenAIKey": false
}
```

### 2. Chat Test
```bash
curl -X POST https://your-worker-url.workers.dev/api/openai \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.8,
    "max_tokens": 100
  }'
```

### 3. Frontend Integration

Update your frontend to point to your worker:

In `services/cloudflareAIService.ts`, the `API_BASE_URL` will automatically use your worker URL when deployed.

## 🛠️ Development

### Local Development

1. **Start the worker locally:**
   ```bash
   npm run dev:worker
   ```

2. **Start the frontend:**
   ```bash
   npm run dev
   ```

3. **Update API endpoint** in development to use local worker:
   ```typescript
   const API_BASE_URL = 'http://localhost:8787';
   ```

### Staging Environment

Deploy to staging:
```bash
npm run deploy:worker:staging
```

## 🔍 Troubleshooting

### Common Issues

1. **"No AI service available" error**
   - Verify AI binding is configured: `wrangler deployments list`
   - Check worker logs: `wrangler tail`

2. **CORS errors**
   - The worker includes CORS headers automatically
   - Verify your origin is allowed

3. **Rate limiting**
   - Cloudflare AI Workers have usage limits
   - Monitor usage in Cloudflare dashboard

### Debugging

View worker logs:
```bash
wrangler tail --config wrangler-worker.toml
```

Check binding status:
```bash
curl https://your-worker-url.workers.dev/health | jq .
```

## 💰 Cost Comparison

| Approach | AI Costs | Pros | Cons |
|----------|----------|------|------|
| **AI Workers** | Cloudflare AI pricing | No API key needed, bundled pricing | Limited model selection |
| **OpenAI Proxy** | OpenAI API pricing | Latest models, flexible | Requires API key, per-token billing |

## 📚 Additional Resources

- [Cloudflare AI Workers Documentation](https://developers.cloudflare.com/workers-ai/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [AI Workers Models](https://developers.cloudflare.com/workers-ai/models/)

## 🔄 Migration

### From Pages to Workers

If you're currently using Cloudflare Pages:

1. Deploy the worker alongside your Pages site
2. Test the worker endpoints
3. Update your Pages site to use the worker for AI calls
4. Optionally remove the Pages Functions

### From OpenAI Direct to Workers

1. Deploy the worker
2. The service detection will automatically use Workers when available
3. Keep your OpenAI key as backup (optional)
# Cloudflare Worker Deployment Guide

This guide covers deploying the Multi-Agent Conversation Generator API as a Cloudflare Worker (backend only).

## 🏗️ Worker Architecture

The Worker deployment provides:
- **API Endpoints**: `/api/openai` and `/api/health`
- **CORS Support**: Cross-origin requests enabled
- **Environment Variables**: Secure API key storage
- **Global Distribution**: Cloudflare's edge network

## 📋 Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Install with `npm install -g wrangler`
3. **OpenAI API Key**: Get yours at [OpenAI Platform](https://platform.openai.com/account/api-keys)

## 🚀 Quick Deployment

### Option 1: GitHub Integration (Recommended)

1. **Connect Repository to Cloudflare Workers**:
   - Go to [Cloudflare Workers](https://workers.cloudflare.com/)
   - Click "Create a Service"
   - Choose "Connect to Git"
   - Select your GitHub repository

2. **Configure Build Settings**:
   ```
   Build command: npm run build:worker
   Deploy command: npx wrangler deploy
   Root directory: /
   ```

3. **Set Environment Variables**:
   - In the Workers dashboard, go to your service
   - Navigate to "Settings" → "Variables"
   - Add: `OPENAI_API_KEY` = `your_openai_api_key`

4. **Deploy**: The service will automatically deploy on git pushes

### Option 2: Direct CLI Deployment

1. **Authenticate Wrangler**:
   ```bash
   npx wrangler auth
   ```

2. **Set Environment Variables**:
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   # Enter your OpenAI API key when prompted
   ```

3. **Deploy**:
   ```bash
   npm run deploy:worker
   ```

## 🔧 Configuration Files

### `wrangler.toml`
```toml
name = "multicahtbackend"
main = "functions/index.ts"
compatibility_date = "2024-01-01"

[build]
command = "npm run build:worker"

[vars]
ENVIRONMENT = "production"
```

### `package.json` Scripts
```json
{
  "scripts": {
    "build:worker": "echo 'Worker build complete - using TypeScript sources directly'",
    "deploy:worker": "wrangler deploy",
    "dev:worker": "wrangler dev"
  }
}
```

## 🛠️ API Endpoints

### Health Check
```
GET https://multicahtbackend.your-subdomain.workers.dev/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "Multi-Agent Conversation Generator API",
  "version": "1.0.0",
  "environment": "production"
}
```

### OpenAI Proxy
```
POST https://multicahtbackend.your-subdomain.workers.dev/api/openai
```

Request body:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "gpt-4o-mini",
  "temperature": 0.7
}
```

## 🧪 Local Development

1. **Start development server**:
   ```bash
   npm run dev:worker
   ```

2. **Test endpoints**:
   ```bash
   # Health check
   curl http://localhost:8787/api/health
   
   # OpenAI proxy (requires OPENAI_API_KEY in .dev.vars)
   curl -X POST http://localhost:8787/api/openai \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
   ```

3. **Environment variables for development**:
   Create `.dev.vars` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## 🔒 Security Features

- **API Key Protection**: OpenAI key stored securely in Cloudflare
- **CORS Headers**: Properly configured for web app integration
- **Request Validation**: Input validation and error handling
- **Rate Limiting**: Cloudflare's built-in DDoS protection

## 📊 Monitoring

- **Cloudflare Analytics**: Built-in request analytics
- **Real-time Logs**: View logs in Cloudflare dashboard
- **Error Tracking**: Automatic error logging and alerts

## 💰 Cost

- **Free Tier**: 100,000 requests/day
- **Paid Plans**: $5/month for 10M requests
- **OpenAI Costs**: Separate, based on API usage

## 🔄 Frontend Integration

Update your frontend to use the Worker endpoints:

```javascript
// Replace direct OpenAI calls with Worker proxy
const response = await fetch('https://multicahtbackend.your-subdomain.workers.dev/api/openai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: messages,
    model: 'gpt-4o-mini',
    temperature: 0.7
  })
});
```

## 🛠️ Troubleshooting

### Build Fails
- Ensure all TypeScript files compile without errors
- Check that `functions/index.ts` exports a default Worker handler

### Deployment Fails
- Verify Wrangler is authenticated: `npx wrangler auth`
- Check that `wrangler.toml` configuration is valid
- Ensure you have the correct permissions for the Cloudflare account

### Runtime Errors
- Check environment variables are set correctly
- Review Worker logs in Cloudflare dashboard
- Verify OpenAI API key is valid and has sufficient credits

## 📞 Support

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Issues](https://github.com/kedster/Multi-Agent-Conversation-Generator/issues)
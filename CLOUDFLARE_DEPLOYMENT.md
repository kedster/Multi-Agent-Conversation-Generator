# Cloudflare Deployment Guide

This guide will help you deploy the Multi-Agent Conversation Generator to Cloudflare Pages with Workers for secure API handling.

## 🏗️ Architecture

The application is deployed with the following architecture:

- **Cloudflare Pages**: Hosts the React frontend (static assets)
- **Cloudflare Functions**: Provides serverless API endpoints to proxy OpenAI calls
- **Environment Variables**: Securely stores the OpenAI API key

## 📋 Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **GitHub Repository**: Connected to your Cloudflare account
3. **OpenAI API Key**: Get yours at [OpenAI Platform](https://platform.openai.com/account/api-keys)

## 🚀 Deployment Steps

### 1. Connect GitHub Repository

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click "Create a project"
3. Select "Connect to Git"
4. Choose your GitHub repository
5. Click "Begin setup"

### 2. Configure Build Settings

Set the following build configuration:

- **Project name**: `multi-agent-conversation-generator` (or your preferred name)
- **Production branch**: `main`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave blank)

### 3. Set Environment Variables

In the Cloudflare Pages dashboard:

1. Go to your project settings
2. Navigate to "Environment variables"
3. Add the following variable:
   - **Variable name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
   - **Environment**: Production (and Preview if desired)

### 4. Deploy

1. Click "Save and Deploy"
2. Cloudflare will automatically build and deploy your application
3. Your app will be available at `https://your-project-name.pages.dev`

## 🔧 Configuration Files

The repository includes several configuration files for Cloudflare deployment:

### `functions/` Directory

Cloudflare Pages Functions (ES Module format):

- `functions/_middleware.ts`: Handles CORS headers for all requests
- `functions/api/openai.ts`: Proxies OpenAI API calls securely  
- `functions/api/health.ts`: Health check endpoint for monitoring

**Note**: All functions use ES Module format (`export async function`) for compatibility with Cloudflare's latest requirements. No manual `index.ts` entry point is needed.

### `wrangler.toml`

Configuration file for Wrangler CLI (for local development with `wrangler pages dev`):

```toml
# Cloudflare Pages project configuration
# This project uses Cloudflare Pages with Functions, not standalone Workers
name = "multi-agent-conversation-generator"
pages_build_output_dir = "dist"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"

[env.production]
name = "multi-agent-conversation-generator"
```

⚠️ **Note**: This project uses **Cloudflare Pages Functions** with ES Modules, not standalone Workers. The functions automatically use ES Module format for compatibility with Cloudflare's latest requirements.

### `_cloudflare.toml`

Cloudflare Pages configuration:

- Build settings
- Redirect rules for SPA routing
- Security headers
- Caching rules for assets

## 🔒 Security Features

1. **API Key Protection**: OpenAI API key is stored securely in Cloudflare environment variables
2. **CORS Headers**: Properly configured for cross-origin requests
3. **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
4. **Serverless Proxy**: API calls are proxied through Cloudflare Functions instead of being made directly from the browser

## 🧪 Local Development with Cloudflare

To test the Cloudflare Functions locally:

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Run the development server:
   ```bash
   npm run build
   npm run preview:cloudflare
   ```

3. Set up local environment variables:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your VITE_OPENAI_API_KEY
   ```

## 🔄 Development vs Production

The application automatically detects the environment:

- **Development** (localhost): Uses direct OpenAI API calls
- **Production** (Cloudflare Pages): Uses Cloudflare Functions proxy

This is controlled by the service selection in `services/index.ts`.

## 📊 Monitoring and Analytics

Cloudflare provides built-in analytics for:

- Page views and visitors
- Request performance
- Error rates
- Geographic distribution

Access these in your Cloudflare Pages dashboard.

## 🛠️ Troubleshooting

### Build Failures

1. Check that all environment variables are set correctly
2. Ensure the build command and output directory are correct
3. Review build logs in the Cloudflare Pages dashboard

### Worker/ES Module Issues ⚠️

**Issue**: "Service Worker syntax script to the version upload API, which only supports ES Modules"

**Solution**: This project is configured for Cloudflare Pages with Functions (ES Modules). Ensure you:
1. Deploy via Cloudflare Pages Dashboard, NOT as a standalone Worker
2. Use the `functions/` directory structure for API endpoints
3. Don't manually deploy `functions/index.ts` as a Worker
4. The `wrangler.toml` is for local development only

### API Errors

1. Verify that `OPENAI_API_KEY` is set in environment variables
2. Check the Functions logs in Cloudflare dashboard
3. Ensure your OpenAI account has sufficient credits

### CORS Issues

1. The `_middleware.ts` file handles CORS automatically
2. If you encounter CORS errors, check that the middleware is deployed correctly

## 📈 Performance Optimization

The build includes several optimizations:

1. **Code Splitting**: Vendor libraries are bundled separately
2. **Asset Caching**: Static assets are cached with long expiration times
3. **Compression**: Cloudflare automatically compresses responses
4. **Global CDN**: Content is served from Cloudflare's global network

## 🔄 Updates and Maintenance

To update the application:

1. Push changes to your GitHub repository
2. Cloudflare Pages will automatically rebuild and deploy
3. Check the deployment status in the Cloudflare dashboard

## 💰 Cost Considerations

- **Cloudflare Pages**: Free tier includes 500 builds/month and unlimited requests
- **Cloudflare Functions**: Free tier includes 100,000 requests/day
- **OpenAI API**: Pay-per-use based on your API consumption

For most use cases, the free tiers should be sufficient.

## 📞 Support

If you encounter issues:

1. Check the [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/)
2. Review the [Cloudflare Functions documentation](https://developers.cloudflare.com/pages/platform/functions/)
3. Open an issue in the GitHub repository
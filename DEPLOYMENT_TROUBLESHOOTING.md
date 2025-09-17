# Deployment Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Only seeing background, no UI elements"

This is usually caused by one of these issues:

#### 1. Missing CSS File
**Symptoms**: Blank page with just background color, browser shows CSS 404 errors
**Solution**: Ensure `index.css` exists in the root directory
```bash
# Check if file exists
ls -la index.css

# If missing, create it (basic version provided in repo)
```

#### 2. JavaScript Errors Preventing App Load
**Symptoms**: Blank page, browser console shows JavaScript errors
**Common Causes**:
- Missing environment variables causing service initialization errors
- Import errors or dependency issues

**Solution**: Check browser console for errors and fix them

#### 3. Missing Environment Variables
**Symptoms**: App loads but crashes when trying to use AI features
**Solution**: 
- For development: Set `VITE_OPENAI_API_KEY` in `.env.local`
- For production: Configure API key in Cloudflare dashboard OR set up Worker URL

#### 4. API Endpoint Configuration Issues
**Symptoms**: App loads but API calls fail
**Solutions**:
- For Pages Functions: Ensure functions are in `/functions/api/` directory
- For separate Worker: Set `VITE_WORKER_URL` environment variable
- Check CORS configuration in API handlers

## Deployment Approaches

### Option 1: Cloudflare Pages + Pages Functions (Recommended)
- Frontend and API on same domain
- API endpoints automatically available at `/api/*`
- Set `OPENAI_API_KEY` in Pages environment variables

### Option 2: Cloudflare Pages + Separate Worker
- Frontend on Pages, API on Worker subdomain
- Set `VITE_WORKER_URL=https://your-worker.workers.dev` in Pages environment
- Set `OPENAI_API_KEY` in Worker environment variables

## Quick Debugging Checklist

1. **Check build output**: `npm run build` should complete without errors
2. **Test locally**: `npm run preview` should show working UI
3. **Check browser console**: Look for JavaScript errors
4. **Verify CSS loading**: Check Network tab for CSS 404 errors
5. **Test API endpoints**: Use browser dev tools to check API calls
6. **Check environment variables**: Ensure they're set correctly for your deployment type

## Environment Variables Reference

| Variable | Purpose | Required For |
|----------|---------|--------------|
| `VITE_OPENAI_API_KEY` | Direct OpenAI API access | Local development |
| `VITE_WORKER_URL` | Custom Worker API endpoint | Separate Worker deployment |
| `OPENAI_API_KEY` | Server-side OpenAI access | Cloudflare Functions/Workers |

## Getting Help

If you're still experiencing issues:

1. Check the browser console for specific error messages
2. Verify your Cloudflare deployment configuration
3. Test the API endpoints directly (health check, OpenAI proxy)
4. Review the deployment logs in Cloudflare dashboard
#!/bin/bash

# Cloudflare Pages deployment script

echo "🚀 Deploying Multi-Agent Conversation Generator to Cloudflare Pages..."

# Build the application
echo "📦 Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Files ready for deployment in 'dist' directory"
    echo ""
    echo "📋 Deployment Methods:"
    echo ""
    echo "🌐 Method 1: Cloudflare Pages Dashboard (Recommended)"
    echo "1. Go to https://pages.cloudflare.com/"
    echo "2. Connect your GitHub repository"
    echo "3. Set build command: npm run build"
    echo "4. Set build output directory: dist"
    echo "5. Add environment variable: OPENAI_API_KEY=your_api_key"
    echo "6. Deploy!"
    echo ""
    echo "⚡ Method 2: Wrangler CLI"
    echo "1. npx wrangler pages publish dist"
    echo "2. Follow the prompts to connect your project"
    echo ""
    echo "🔗 Your app will be available at: https://your-project.pages.dev"
    echo ""
    echo "⚠️  Note: This project uses Cloudflare Pages with Functions (ES Modules)"
    echo "   Do NOT deploy as a standalone Cloudflare Worker."
else
    echo "❌ Build failed!"
    exit 1
fi
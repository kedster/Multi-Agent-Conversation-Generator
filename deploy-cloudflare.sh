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
    echo "📋 Next steps:"
    echo "1. Connect your GitHub repository to Cloudflare Pages"
    echo "2. Set the build command to: npm run build"
    echo "3. Set the build output directory to: dist"
    echo "4. Add environment variable: OPENAI_API_KEY=your_api_key"
    echo "5. Deploy!"
    echo ""
    echo "🔗 Your app will be available at: https://your-project.pages.dev"
else
    echo "❌ Build failed!"
    exit 1
fi
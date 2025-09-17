#!/bin/bash

# Deploy Cloudflare Worker with AI Workers binding
echo "Deploying Multi-Agent Conversation Generator to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare first:"
    echo "wrangler auth login"
    exit 1
fi

# Deploy the worker
echo "Deploying worker..."
wrangler deploy --config wrangler-worker.toml

echo ""
echo "Deployment complete!"
echo ""
echo "Your worker is now available at:"
echo "https://multi-agent-conversation-worker.<your-subdomain>.workers.dev"
echo ""
echo "Next steps:"
echo "1. The AI Workers binding 'MCA' should be automatically configured"
echo "2. Optionally set OPENAI_API_KEY as a secret for fallback:"
echo "   wrangler secret put OPENAI_API_KEY --config wrangler-worker.toml"
echo "3. Test your deployment by visiting the health endpoint:"
echo "   https://multi-agent-conversation-worker.<your-subdomain>.workers.dev/health"
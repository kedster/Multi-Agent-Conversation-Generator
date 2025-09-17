#!/bin/bash

# Simple test script for the Cloudflare Worker
# This script tests the worker endpoints to ensure they work correctly

WORKER_URL=${1:-"http://localhost:8787"}

echo "Testing Cloudflare Worker at: $WORKER_URL"
echo "=========================================="

# Test 1: Health Check
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health")
echo "Response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi

echo ""

# Test 2: Root endpoint
echo "2. Testing root endpoint..."
ROOT_RESPONSE=$(curl -s "$WORKER_URL/")
echo "Response: $ROOT_RESPONSE"

if echo "$ROOT_RESPONSE" | grep -q "Worker is running"; then
    echo "✅ Root endpoint passed"
else
    echo "❌ Root endpoint failed"
fi

echo ""

# Test 3: CORS preflight
echo "3. Testing CORS preflight..."
CORS_RESPONSE=$(curl -s -X OPTIONS "$WORKER_URL/api/openai" -H "Origin: http://localhost:3000")
echo "Response: $CORS_RESPONSE"
echo "✅ CORS test completed"

echo ""

# Test 4: API endpoint (this will fail in testing without proper binding, but should return proper error)
echo "4. Testing API endpoint structure..."
API_RESPONSE=$(curl -s -X POST "$WORKER_URL/api/openai" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}')
echo "Response: $API_RESPONSE"

if echo "$API_RESPONSE" | grep -q "error"; then
    echo "✅ API endpoint returns proper error structure"
else
    echo "❓ API endpoint response unclear"
fi

echo ""
echo "Test completed. Check the responses above for any issues."
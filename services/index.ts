// Configuration to determine which OpenAI service to use
// This allows for easy switching between:
// 1. Direct OpenAI calls (development with API key)
// 2. Cloudflare Pages Functions proxy (production with OpenAI API key) 
// 3. Cloudflare AI Workers binding (production with AI Workers)

// Function to detect if we're using Cloudflare AI Workers
async function detectCloudflareAIWorkers(): Promise<boolean> {
  // Only works in browser environment
  if (typeof window === 'undefined') return false;
  
  try {
    const response = await fetch('/api/health', { method: 'GET' });
    const data = await response.json();
    return (data as any)?.hasAIBinding === true;
  } catch (error) {
    return false;
  }
}

// Check if we're running in a Cloudflare Pages environment
const isCloudflarePages = typeof window !== 'undefined' && 
  (window.location.hostname.includes('.pages.dev') || 
   window.location.hostname.includes('cloudflare') ||
   // Also use Cloudflare service if API_KEY is not available (production mode)
   !(import.meta as any)?.env?.VITE_OPENAI_API_KEY);

// Import all services
import * as originalService from './openaiService';
import * as cloudflareService from './cloudflareOpenaiService';
import * as cloudflareAIService from './cloudflareAIService';

// State to track which service to use
let useCloudflareAI = false;
let serviceDetected = false;

// Async function to detect and set the appropriate service
async function detectAndSetService() {
  if (serviceDetected) return;
  
  if (isCloudflarePages) {
    useCloudflareAI = await detectCloudflareAIWorkers();
  }
  
  serviceDetected = true;
}

// Wrapper function to match the original interface
async function cloudflareGetMonitorDecision(
  conversation: any[], 
  agents: any[],
  userName: string,
  agentToExcludeId?: string
) {
  await detectAndSetService();
  
  if (useCloudflareAI) {
    // Use Cloudflare AI Workers
    return await cloudflareAIService.getNextSpeaker(conversation, agents, userName);
  } else {
    // Use Cloudflare Pages Functions (OpenAI proxy)
    return await cloudflareService.getNextSpeaker(conversation, agents, userName);
  }
}

// Wrapper function to match the original getAgentResponse interface
async function cloudflareGetAgentResponse(
  conversation: any[],
  agents: any[],
  agentId: string,
  userName: string
) {
  await detectAndSetService();
  
  const agent = agents.find((a: any) => a.id === agentId);
  if (!agent) {
    throw new Error(`Agent with ID ${agentId} not found.`);
  }
  
  if (useCloudflareAI) {
    // Use Cloudflare AI Workers  
    return await cloudflareAIService.getAgentResponse(agent, conversation, userName);
  } else {
    // Use Cloudflare Pages Functions (OpenAI proxy)
    return await cloudflareService.getAgentResponse(agent, conversation, userName);
  }
}

// Wrapper function for export report
async function cloudflareGenerateExportReport(
  conversationHistory: any[],
  service: any,
  userName: string
) {
  await detectAndSetService();
  
  if (useCloudflareAI) {
    // Use Cloudflare AI Workers
    return await cloudflareAIService.generateExportReport(conversationHistory, service, userName);
  } else {
    // Use Cloudflare Pages Functions (OpenAI proxy)
    return await cloudflareService.generateExportReport(conversationHistory, service, userName);
  }
}

// Export the appropriate service functions
export const getNextSpeaker = isCloudflarePages 
  ? cloudflareGetMonitorDecision 
  : originalService.getMonitorDecision;

export const getAgentResponse = isCloudflarePages 
  ? cloudflareGetAgentResponse 
  : originalService.getAgentResponse;

export const generateExportReport = isCloudflarePages 
  ? cloudflareGenerateExportReport 
  : originalService.generateExportReport;

export { isCloudflarePages };
// Configuration to determine which OpenAI service to use
// This allows for easy switching between direct OpenAI calls (development) 
// and Cloudflare Worker proxy (production)

// Check if we're running in a Cloudflare Pages environment
const isCloudflarePages = typeof window !== 'undefined' && 
  (window.location.hostname.includes('.pages.dev') || 
   window.location.hostname.includes('cloudflare'));

// Check if we have a valid OpenAI API key for direct access
const hasValidApiKey = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return apiKey && apiKey !== 'test_key_for_development' && apiKey.length > 10;
};

// Use direct OpenAI if we have a valid API key, otherwise fallback to Cloudflare or mock
const useDirectOpenAI = hasValidApiKey() && !isCloudflarePages;
const useMockService = !hasValidApiKey() && !isCloudflarePages;

// Import all services
import * as originalService from './openaiService';
import * as cloudflareService from './cloudflareOpenaiService';
import * as mockService from './mockService';

// Wrapper function to match the original interface
async function cloudflareGetMonitorDecision(
  conversation: any[], 
  agents: any[],
  userName: string,
  agentToExcludeId?: string
) {
  // For now, we'll ignore the agentToExcludeId parameter in the Cloudflare version
  // This could be enhanced later to support exclusion
  return await cloudflareService.getNextSpeaker(conversation, agents, userName);
}

// Wrapper function to match the original getAgentResponse interface
async function cloudflareGetAgentResponse(
  conversation: any[],
  agents: any[],
  agentId: string,
  userName: string
) {
  const agent = agents.find((a: any) => a.id === agentId);
  if (!agent) {
    throw new Error(`Agent with ID ${agentId} not found.`);
  }
  return await cloudflareService.getAgentResponse(agent, conversation, userName);
}

// Export the appropriate service functions
export const getNextSpeaker = useDirectOpenAI 
  ? originalService.getMonitorDecision 
  : useMockService 
    ? mockService.getMonitorDecision
    : cloudflareGetMonitorDecision;

export const getAgentResponse = useDirectOpenAI 
  ? originalService.getAgentResponse 
  : useMockService
    ? mockService.getAgentResponse
    : cloudflareGetAgentResponse;

export const generateExportReport = useDirectOpenAI 
  ? originalService.generateExportReport 
  : useMockService
    ? mockService.generateExportReport
    : cloudflareService.generateExportReport;

export { isCloudflarePages, useDirectOpenAI, useMockService };
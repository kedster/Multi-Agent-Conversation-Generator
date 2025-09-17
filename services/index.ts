// Configuration to determine which OpenAI service to use
// This allows for easy switching between direct OpenAI calls (development) 
// and Cloudflare Worker proxy (production)

// Check if we're running in a Cloudflare Pages environment
const isCloudflarePages = typeof window !== 'undefined' && 
  (window.location.hostname.includes('.pages.dev') || 
   window.location.hostname.includes('cloudflare') ||
   // Also use Cloudflare service if API_KEY is not available (production mode)
   !import.meta.env.VITE_OPENAI_API_KEY);

// Import both services
import * as originalService from './openaiService';
import * as cloudflareService from './cloudflareOpenaiService';

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
export const getNextSpeaker = isCloudflarePages 
  ? cloudflareGetMonitorDecision 
  : originalService.getMonitorDecision;

export const getAgentResponse = isCloudflarePages 
  ? cloudflareGetAgentResponse 
  : originalService.getAgentResponse;

export const generateExportReport = isCloudflarePages 
  ? cloudflareService.generateExportReport 
  : originalService.generateExportReport;

export { isCloudflarePages };
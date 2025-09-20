import type { Agent } from '../types';

/**
 * Detects if a user message mentions or calls upon specific agents
 * Returns array of agent IDs that were mentioned
 */
export const detectMentionedAgents = (userMessage: string, agents: Agent[]): string[] => {
  const mentionedAgents: string[] = [];
  const messageLower = userMessage.toLowerCase();
  
  for (const agent of agents) {
    const agentNameLower = agent.name.toLowerCase();
    const agentRoleLower = agent.role.toLowerCase();
    
    // Check for direct name mentions (full name or first name)
    const nameParts = agentNameLower.split(' ');
    const hasNameMention = nameParts.some(namePart => {
      if (namePart.length < 3) return false;
      
      // Must be a word boundary mention, not just contained in another word
      const wordBoundaryPattern = new RegExp(`\\b${namePart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return wordBoundaryPattern.test(userMessage);
    });
    
    if (hasNameMention) {
      mentionedAgents.push(agent.id);
      continue;
    }
    
    // Check for very specific role mentions that are clearly calling out the agent
    const directRoleCallouts = [
      'frontend engineer',
      'backend engineer', 
      'product manager',
      'devops engineer',
      'sre engineer'
    ];
    
    const hasDirectRoleCallout = directRoleCallouts.some(callout => 
      messageLower.includes(callout) && agentRoleLower.includes(callout.split(' ')[0])
    );
    
    if (hasDirectRoleCallout) {
      mentionedAgents.push(agent.id);
      continue;
    }
    
    // Check for common call-out phrases using first name
    const firstName = nameParts[0];
    const callOutPatterns = [
      `to ${firstName}`,
      `ask ${firstName}`,
      `${firstName} what`,
      `${firstName} can`,
      `${firstName} please`,
      `@${firstName}`,
      `hey ${firstName}`,
      `${firstName},`
    ];
    
    const hasCallOut = callOutPatterns.some(pattern => 
      messageLower.includes(pattern)
    );
    
    if (hasCallOut) {
      mentionedAgents.push(agent.id);
    }
  }
  
  return mentionedAgents;
};

/**
 * Determines if an agent should be allowed to speak based on relevance threshold
 */
export const shouldAgentSpeak = (relevance: number, minRelevanceThreshold: number = 4): boolean => {
  return relevance >= minRelevanceThreshold;
};
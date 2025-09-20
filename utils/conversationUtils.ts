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
    
    // Check for direct name mentions
    if (messageLower.includes(agentNameLower)) {
      mentionedAgents.push(agent.id);
      continue;
    }
    
    // Check for role mentions (e.g., "marketing expert", "developer")
    const roleWords = agentRoleLower.split(' ');
    const hasRoleMention = roleWords.some(word => 
      word.length > 3 && messageLower.includes(word)
    );
    
    if (hasRoleMention) {
      mentionedAgents.push(agent.id);
      continue;
    }
    
    // Check for common call-out phrases
    const callOutPatterns = [
      `${agentNameLower}`,
      `to ${agentNameLower}`,
      `ask ${agentNameLower}`,
      `${agentNameLower} what`,
      `${agentNameLower} can`,
      `${agentNameLower} please`,
      `@${agentNameLower}`
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
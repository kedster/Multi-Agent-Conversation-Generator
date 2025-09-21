import type { Agent, MonitorScore } from '../types';

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

/**
 * Determines the speakers with highest relevance (1-2 speakers based on relevance)
 * This function encapsulates the core turn distribution algorithm
 */
export const selectTopSpeakers = (
  scores: MonitorScore[], 
  agents: Agent[], 
  cumulativeScores: Record<string, MonitorScore>,
  skippedTurns: Record<string, number>,
  lastSpeakerIds: string[],
  mentionedAgentIds: string[]
): [string, string?] => {
  // Calculate relevance-focused scores for all agents
  const agentScores = agents.map(agent => {
    const currentScore = scores.find(s => s.agentId === agent.id);
    if (!currentScore) return null;
    
    const isMentioned = mentionedAgentIds.includes(agent.id);
    const isForced = skippedTurns[agent.id] >= 2;
    const wasRecentSpeaker = lastSpeakerIds.includes(agent.id);
    
    // Current relevance is the primary factor (80%), with context as secondary (20%)
    const primaryScore = (currentScore.relevance * 0.8) + (currentScore.context * 0.2);
    
    return {
      agentId: agent.id,
      primaryScore,
      currentRelevance: currentScore.relevance,
      isMentioned,
      isForced,
      wasRecentSpeaker,
      // Agent can speak if: mentioned (rel>=3), forced (rel>=3), or high relevance (rel>=5)
      canSpeak: isMentioned || isForced || currentScore.relevance >= 5
    };
  }).filter(Boolean);

  // Sort by: 1) mentioned first, 2) forced second, 3) by relevance score, 4) avoid recent speakers
  agentScores.sort((a, b) => {
    // Mentioned agents get absolute priority
    if (a!.isMentioned && !b!.isMentioned) return -1;
    if (!a!.isMentioned && b!.isMentioned) return 1;
    
    // Then forced speakers
    if (a!.isForced && !b!.isForced) return -1;
    if (!a!.isForced && b!.isForced) return 1;
    
    // Then by current relevance (most important factor)
    if (Math.abs(a!.currentRelevance - b!.currentRelevance) >= 1) {
      return b!.currentRelevance - a!.currentRelevance;
    }
    
    // Prefer agents who weren't recent speakers
    if (a!.wasRecentSpeaker && !b!.wasRecentSpeaker) return 1;
    if (!a!.wasRecentSpeaker && b!.wasRecentSpeaker) return -1;
    
    // Finally by primary score
    return b!.primaryScore - a!.primaryScore;
  });
  
  // Filter to agents that can speak
  const eligibleSpeakers = agentScores.filter(agent => agent!.canSpeak);
  
  // If no one is eligible, allow the most relevant agent
  const finalCandidates = eligibleSpeakers.length > 0 ? eligibleSpeakers : agentScores.slice(0, 1);
  
  const speaker1 = finalCandidates[0]?.agentId || agents[0].id;
  
  // Select second speaker only if they're highly relevant (>=6) or mentioned/forced
  let speaker2: string | undefined;
  if (finalCandidates.length > 1) {
    const candidate2 = finalCandidates[1];
    if (candidate2!.isMentioned || candidate2!.isForced || candidate2!.currentRelevance >= 6) {
      speaker2 = candidate2!.agentId;
    }
  }
  
  return [speaker1, speaker2];
};
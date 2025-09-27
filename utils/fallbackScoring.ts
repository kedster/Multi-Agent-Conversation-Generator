import type { Agent, Message, MonitorScore } from '../types';
import { ConversationModerator } from './conversationModerator';

/**
 * Fallback scoring when not using ScoreKeeper at checkpoint.
 * Now uses the main conversation moderation algorithm for consistency.
 */
export function generateFallbackScores(
  conversation: Message[], 
  agents: Agent[], 
  userName: string,
  cumulativeScores: Record<string, MonitorScore>
): {scores: MonitorScore[], nextSpeakerAgentId: string, reasoning: string} {
  
  const userMessage = conversation.filter(msg => msg.isUser).pop()?.text || "";
  
  // Generate keyword-based scores using the existing logic
  const scores = generateKeywordBasedScores(userMessage, agents, conversation);
  
  // Create a temporary moderator with current state for consistent speaker selection
  const moderator = new ConversationModerator(agents);
  moderator.setState(cumulativeScores, generateSkippedTurnsFromConversation(conversation, agents));
  
  // Use the main algorithm for speaker selection
  const { speaker1Id } = moderator.selectSpeakers(scores, conversation, userMessage);
  
  const nextSpeaker = agents.find(a => a.id === speaker1Id);
  
  // Sort for reasoning display
  const sortedAgents = [...scores].sort((a, b) => 
    (b.relevance + b.context) - (a.relevance + a.context)
  );
  
  const reasoning = `Fallback scoring: Selected ${nextSpeaker?.name || 'agent'} using keyword relevance and conversation flow analysis. ` +
                  `Top scores: ${sortedAgents.slice(0, 2).map(s => 
                    `${agents.find(a => a.id === s.agentId)?.name}: ${s.relevance + s.context}`
                  ).join(', ')}`;

  return {
    scores,
    nextSpeakerAgentId: speaker1Id,
    reasoning
  };
}

/**
 * Generate keyword-based scores for fallback mode
 */
function generateKeywordBasedScores(userMessage: string, agents: Agent[], conversation: Message[]): MonitorScore[] {
  const userMessageLower = userMessage.toLowerCase();
  
  return agents.map((agent) => {
    // Start with base relevance score
    let relevanceScore = 4;
    let contextScore = 3;
    
    // Boost relevance based on keyword matching with agent roles
    const agentRole = agent.role.toLowerCase();
    const agentName = agent.name.toLowerCase();
    
    // Database/Backend related keywords
    if (userMessageLower.includes('database') || userMessageLower.includes('data model') || 
        userMessageLower.includes('optimization') || userMessageLower.includes('scale') ||
        userMessageLower.includes('backend') || userMessageLower.includes('api')) {
      if (agentRole.includes('backend') || agentName.includes('backend')) {
        relevanceScore = Math.min(10, relevanceScore + 5);
        contextScore = Math.min(10, contextScore + 3);
      }
    }
    
    // Frontend related keywords
    if (userMessageLower.includes('frontend') || userMessageLower.includes('ui') || 
        userMessageLower.includes('react') || userMessageLower.includes('component') ||
        userMessageLower.includes('design') || userMessageLower.includes('user interface')) {
      if (agentRole.includes('frontend') || agentName.includes('frontend')) {
        relevanceScore = Math.min(10, relevanceScore + 5);
        contextScore = Math.min(10, contextScore + 3);
      }
    }
    
    // DevOps/Infrastructure related keywords
    if (userMessageLower.includes('deployment') || userMessageLower.includes('infrastructure') || 
        userMessageLower.includes('devops') || userMessageLower.includes('docker') ||
        userMessageLower.includes('kubernetes') || userMessageLower.includes('ci/cd')) {
      if (agentRole.includes('devops') || agentRole.includes('sre') || agentName.includes('devops')) {
        relevanceScore = Math.min(10, relevanceScore + 5);
        contextScore = Math.min(10, contextScore + 3);
      }
    }
    
    // Product/Business related keywords
    if (userMessageLower.includes('user') || userMessageLower.includes('business') || 
        userMessageLower.includes('feature') || userMessageLower.includes('requirements') ||
        userMessageLower.includes('product') || userMessageLower.includes('customer')) {
      if (agentRole.includes('product') || agentName.includes('product')) {
        relevanceScore = Math.min(10, relevanceScore + 5);
        contextScore = Math.min(10, contextScore + 3);
      }
    }
    
    // Adjust based on conversation flow (favor agents who haven't spoken recently)
    const recentMessages = conversation.slice(-6); // Last 6 messages
    const agentRecentMessages = recentMessages.filter(msg => msg.agentId === agent.id).length;
    
    // Penalize agents who have spoken too recently
    if (agentRecentMessages >= 2) {
      relevanceScore = Math.max(1, relevanceScore - 2);
      contextScore = Math.max(1, contextScore - 1);
    }
    
    // Small boost for agents who are mentioned by name in the user message
    if (userMessageLower.includes(agentName)) {
      relevanceScore = Math.min(10, relevanceScore + 2);
      contextScore = Math.min(10, contextScore + 1);
    }
    
    return {
      agentId: agent.id,
      relevance: relevanceScore,
      context: contextScore
    };
  });
}

/**
 * Generate skipped turns approximation from conversation history
 */
function generateSkippedTurnsFromConversation(conversation: Message[], agents: Agent[]): Record<string, number> {
  const skippedTurns: Record<string, number> = {};
  agents.forEach(agent => { skippedTurns[agent.id] = 0; });
  
  // Simple heuristic: count consecutive non-participation
  const recentSpeakers = conversation
    .filter(msg => !msg.isUser)
    .slice(-4) // Look at last 4 agent messages
    .map(msg => msg.agentId);
    
  agents.forEach(agent => {
    if (!recentSpeakers.includes(agent.id)) {
      skippedTurns[agent.id] = Math.min(2, recentSpeakers.length); // Cap at 2 for forced speaking
    }
  });
  
  return skippedTurns;
}
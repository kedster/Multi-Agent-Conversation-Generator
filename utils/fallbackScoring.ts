import type { Agent, Message, MonitorScore } from '../types';

// Fallback scoring when not using ScoreKeeper at checkpoint
export function generateFallbackScores(
  conversation: Message[], 
  agents: Agent[], 
  userName: string,
  cumulativeScores: Record<string, MonitorScore>
): {scores: MonitorScore[], nextSpeakerAgentId: string, reasoning: string} {
  
  const userMessage = conversation.filter(msg => msg.isUser).pop()?.text || "";
  const userMessageLower = userMessage.toLowerCase();
  
  const scores = agents.map((agent) => {
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
  
  // Select the agent with the highest combined score as next speaker
  const sortedAgents = [...scores].sort((a, b) => 
    (b.relevance + b.context) - (a.relevance + a.context)
  );
  
  const nextSpeakerAgentId = sortedAgents[0].agentId;
  const nextSpeaker = agents.find(a => a.id === nextSpeakerAgentId);
  
  const reasoning = `Fallback scoring: Selected ${nextSpeaker?.name || 'agent'} based on keyword relevance and conversation flow. ` +
                  `Top scores: ${sortedAgents.slice(0, 2).map(s => 
                    `${agents.find(a => a.id === s.agentId)?.name}: ${s.relevance + s.context}`
                  ).join(', ')}`;

  return {
    scores,
    nextSpeakerAgentId,
    reasoning
  };
}
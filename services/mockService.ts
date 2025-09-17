import type { Agent, Message, MonitorScore, Service } from '../types';

// Mock service for development/testing when no API key is available
// This provides reasonable but fake responses to test the conversation flow

const mockResponses = [
  "That's a great question! Based on my experience, I think we should start by defining the core user requirements.",
  "I agree with the previous point. We also need to consider the technical architecture from the beginning.",
  "From a deployment perspective, I'd recommend we think about scalability and security early on.",
  "Let me add that we should validate our assumptions with real user feedback before we go too far down any path.",
  "I think we're on the right track. The key is to balance speed with quality.",
  "That makes sense. We should also consider the long-term maintenance implications.",
  "Good point! I'd like to add that performance should be a first-class consideration.",
  "Absolutely. And we need to make sure our solution can handle the expected load.",
];

let responseIndex = 0;

function getRandomResponse(agentName: string): string {
  const response = mockResponses[responseIndex % mockResponses.length];
  responseIndex++;
  return `${response} (This is a mock response for development - ${agentName})`;
}

export const getMonitorDecision = async (
  conversation: Message[], 
  agents: Agent[],
  userName: string,
  agentToExcludeId?: string
): Promise<{
  scores: MonitorScore[];
  reasoning: string;
  nextSpeakerAgentId: string;
}> => {
  // Simulate some delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const availableAgents = agentToExcludeId 
    ? agents.filter(a => a.id !== agentToExcludeId)
    : agents;
  
  // Generate mock scores for all agents
  const scores: MonitorScore[] = agents.map(agent => ({
    agentId: agent.id,
    relevance: Math.floor(Math.random() * 5) + 6, // 6-10
    context: Math.floor(Math.random() * 5) + 6,   // 6-10
  }));
  
  // Select a random agent from available ones
  const nextSpeaker = availableAgents[Math.floor(Math.random() * availableAgents.length)];
  
  return {
    scores,
    reasoning: "Mock decision for development - selected based on random criteria",
    nextSpeakerAgentId: nextSpeaker.id
  };
};

export const getAgentResponse = async (
  conversation: Message[], 
  agents: Agent[], 
  agentId: string, 
  userName: string
): Promise<string> => {
  // Simulate some delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const agent = agents.find(a => a.id === agentId);
  if (!agent) {
    throw new Error(`Agent with ID ${agentId} not found.`);
  }
  
  return getRandomResponse(agent.name);
};

export const generateExportReport = async (
  conversation: Message[], 
  service: Service, 
  userName: string
): Promise<string> => {
  // Simulate some delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return `
    <html>
      <head>
        <title>Mock Report - ${service.name}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .conversation { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Mock Report: ${service.name} Discussion</h1>
        <p><strong>Participants:</strong> ${userName} and AI agents</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        
        <h2>Discussion Summary</h2>
        <p>This is a mock report generated for development purposes. In a real implementation, this would contain a summary of the conversation and key decisions made.</p>
        
        <div class="conversation">
          <h3>Conversation Overview</h3>
          <p>Messages in conversation: ${conversation.length}</p>
          <p>This mock report demonstrates the export functionality when no OpenAI API key is configured.</p>
        </div>
        
        <h2>Next Steps</h2>
        <ul>
          <li>Configure a valid OpenAI API key for real AI responses</li>
          <li>Test the conversation flow with actual AI agents</li>
          <li>Review the generated reports for quality</li>
        </ul>
      </body>
    </html>
  `;
};
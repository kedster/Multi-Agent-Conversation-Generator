import type { Agent, Message, MonitorScore, Service } from '../types';

// Configuration for API endpoint
const API_BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin  // Use current domain in browser
  : 'http://localhost:8787'; // Default Wrangler dev server port

// Helper function to make API calls to our Cloudflare Worker with AI binding
async function callCloudflareAI(messages: any[], temperature: number = 0.8, maxTokens: number = 500, responseFormat?: any) {
  const body: any = {
    model: 'gpt-4o-mini', // This will be mapped to CF AI model in the worker
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetch(`${API_BASE_URL}/api/openai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    const errorMessage = (errorData as any)?.error || `API request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

function formatConversationHistory(conversation: Message[], userName: string): string {
    if (conversation.length === 0) return "The conversation has not started yet.";
    // Filter out initial context messages for a cleaner history
    const filteredConversation = conversation.filter(msg => !msg.text.startsWith('*Starts with the context:'));
    return filteredConversation.map(msg => 
        msg.isUser ? `${userName}: ${msg.text}` : `${msg.agentName}: ${msg.text}`
    ).join('\n');
}

function formatAgentProfiles(agents: Agent[]): string {
    return agents.map(agent => 
        `Agent ID: ${agent.id}\nName: ${agent.name}\nRole: ${agent.role}`
    ).join('\n\n');
}

interface MonitorDecision {
    scores: MonitorScore[];
    reasoning: string;
    nextSpeakerAgentId: string;
}

export const getNextSpeaker = async (
    conversation: Message[], 
    agents: Agent[], 
    userName: string
): Promise<MonitorDecision> => {
    const conversationHistory = formatConversationHistory(conversation, userName);
    const agentProfiles = formatAgentProfiles(agents);
    
    const prompt = `You are a conversation monitor for a multi-agent discussion. Your job is to decide which agent should speak next based on the current conversation context and each agent's expertise and engagement level.

Current Conversation:
${conversationHistory}

Available Agents:
${agentProfiles}

Analyze the conversation and rate each agent on:
1. Relevance (1-10): How relevant is this agent to the current topic?
2. Engagement (1-10): How engaged/interested would this agent be?
3. Expertise (1-10): How much expertise does this agent have on the topic?

Then select the best agent to speak next and provide reasoning.

Respond with a JSON object containing:
- scores: array of objects with agentId, relevance, engagement, expertise
- reasoning: brief explanation
- nextSpeakerAgentId: the selected agent's ID`;

    try {
        const response = await callCloudflareAI([
            {
                role: "system",
                content: "You are a conversation monitor. Respond only with valid JSON."
            },
            {
                role: "user",
                content: prompt
            }
        ], 0.3, 800);
        
        const content = (response as any)?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No response content received from AI");
        }
        
        // Try to parse JSON, with fallback handling
        let decision;
        try {
            decision = JSON.parse(content);
        } catch (e) {
            // If JSON parsing fails, create a fallback response
            const fallbackScores = agents.map(agent => ({
                agentId: agent.id,
                relevance: 5,
                engagement: 5,
                expertise: 5
            }));
            
            return {
                scores: fallbackScores,
                reasoning: "Fallback selection due to JSON parsing error",
                nextSpeakerAgentId: agents[0].id
            };
        }
        
        // Validate the response structure
        if (!decision.scores || !Array.isArray(decision.scores) || !decision.nextSpeakerAgentId || !decision.reasoning) {
            throw new Error("Invalid response structure from AI");
        }
        
        return decision;
    } catch (error) {
        console.error("Error getting next speaker:", error);
        // Fallback: return the first agent
        const fallbackScores = agents.map(agent => ({
            agentId: agent.id,
            relevance: 5,
            engagement: 5,
            expertise: 5
        }));
        
        return {
            scores: fallbackScores,
            reasoning: "Fallback selection due to API error",
            nextSpeakerAgentId: agents[0].id
        };
    }
};

export const getAgentResponse = async (
    agent: Agent, 
    conversation: Message[], 
    userName: string
): Promise<string> => {
    const conversationHistory = formatConversationHistory(conversation, userName);
    
    const prompt = `You are participating in a multi-agent conversation simulation. Here is the conversation so far:

${conversationHistory}

Your character details:
- Name: ${agent.name}
- Role: ${agent.role}
- Starting Context: ${agent.startingContext}

Guidelines:
- Stay in character based on your role and personality
- Respond naturally to the conversation flow
- Reference previous messages when relevant
- Keep responses concise but meaningful (2-3 sentences typically)
- Don't repeat what others have already said
- Show your unique perspective based on your role

It is now your turn to speak. As ${agent.name}, continue the conversation naturally. Refer to the user as ${userName} when appropriate. Do not repeat what others have said. Provide only your response, without your name or any preamble. Your response should be a single, coherent message.`;

    try {
        const response = await callCloudflareAI([
            {
                role: "system",
                content: `You are role-playing as ${agent.name}. ${agent.role}`
            },
            {
                role: "user",
                content: prompt
            }
        ], 0.8, 500);
        
        const content = (response as any)?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No response content received from AI");
        }
        
        return content.trim();
    } catch (error) {
        console.error(`Error getting response for agent ${agent.name}:`, error);
        throw new Error(`Agent ${agent.name} failed to generate a response.`);
    }
};

export const generateExportReport = async (
    conversationHistory: Message[], 
    service: Service, 
    userName: string
): Promise<string> => {
    const formattedHistory = formatConversationHistory(conversationHistory, userName);
    
    const prompt = `You are tasked with creating a professional report based on a multi-agent conversation. Use the conversation transcript below to generate a well-structured HTML document.

Guidelines for HTML Generation:
- Generate clean, semantic HTML without any CSS styling (styling will be applied externally)
- The HTML should be a single block that can be embedded inside a styled container. Do not include <html> or <body> tags.
- Use <h2> for the main title and <h3> for section titles. Use <p>, <ul>, <li>, and <strong> for clear structure.

Conversation Transcript:
${formattedHistory}

Generate a professional report for the theme "${service.name}" with appropriate sections and structure.`;
    
    try {
        const response = await callCloudflareAI([
            {
                role: "system",
                content: "You are an expert executive assistant. Generate clean, professional HTML reports."
            },
            {
                role: "user",
                content: prompt
            }
        ], 0.3, 2000);
        
        const content = (response as any)?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No response content received from AI");
        }
        
        return content.trim();
    } catch (error) {
        console.error("Error generating export report:", error);
        throw new Error("The AI failed to generate a report from the conversation.");
    }
};
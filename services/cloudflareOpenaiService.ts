import type { Agent, Message, MonitorScore, Service } from '../types';

// Configuration for API endpoint
const API_BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin  // Use current domain in browser
  : 'http://localhost:5173'; // Fallback for development

// Using gpt-4o-mini as it's the cheapest model that supports JSON mode
const model = 'gpt-4o-mini';

// Helper function to make API calls to our Cloudflare Worker
async function callOpenAI(messages: any[], temperature: number = 0.8, maxTokens: number = 500, responseFormat?: any) {
  const body: any = {
    model,
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
    throw new Error(errorData.error || `API request failed with status ${response.status}`);
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

interface ContextSummary {
    summary: string;
    keyPoints: string[];
    userIntent: string;
}

// Generate conversation context summary for agent responses
export const generateConversationContext = async (
    conversation: Message[], 
    userName: string
): Promise<ContextSummary> => {
    const conversationHistory = formatConversationHistory(conversation, userName);
    
    const prompt = `Analyze the following conversation and provide a context summary for AI agents to use in their responses.

Conversation History:
${conversationHistory}

Generate a JSON response with:
1. "summary": A concise summary of the conversation so far (2-3 sentences)
2. "keyPoints": Array of 3-5 key discussion points or topics
3. "userIntent": What the user seems to want or is asking for

Respond in JSON format only.`;

    try {
        const response = await callOpenAI([
            {
                role: "system",
                content: "You are a conversation analyst. Always respond with valid JSON."
            },
            {
                role: "user", 
                content: prompt
            }
        ], 0.3, 300);

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("No context summary generated");
        }

        return JSON.parse(content) as ContextSummary;
    } catch (error) {
        console.error("Error generating context summary:", error);
        // Fallback context
        return {
            summary: "Ongoing conversation with multiple agents",
            keyPoints: ["General discussion"],
            userIntent: "Seeking information and dialogue"
        };
    }
};

// JSON Schema for OpenAI function calling
const monitorDecisionSchema = {
    type: "object",
    properties: {
        scores: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    agentId: { type: "string" },
                    relevance: { 
                        type: "number", 
                        minimum: 1, 
                        maximum: 10,
                        description: "How relevant is this agent to the current conversation topic (1-10)"
                    },
                    context: {
                        type: "number",
                        minimum: 1,
                        maximum: 10,
                        description: "How well this agent can build on the conversation context (1-10)"
                    },
                    engagement: { 
                        type: "number", 
                        minimum: 1, 
                        maximum: 10,
                        description: "How engaged/interested this agent would be in responding (1-10)"
                    },
                    expertise: { 
                        type: "number", 
                        minimum: 1, 
                        maximum: 10,
                        description: "How much expertise this agent has on the current topic (1-10)"
                    }
                },
                required: ["agentId", "relevance", "context", "engagement", "expertise"]
            }
        },
        reasoning: { 
            type: "string",
            description: "Brief explanation of why this agent should speak next"
        },
        nextSpeakerAgentId: { 
            type: "string",
            description: "The ID of the agent who should speak next"
        }
    },
    required: ["scores", "reasoning", "nextSpeakerAgentId"]
};

export const getNextSpeaker = async (
    conversation: Message[], 
    agents: Agent[], 
    userName: string,
    cumulativeScores?: Record<string, MonitorScore>,
    skippedTurns?: Record<string, number>
): Promise<MonitorDecision> => {
    const conversationHistory = formatConversationHistory(conversation, userName);
    const agentProfiles = formatAgentProfiles(agents);
    
    // Generate context summary for better scoring
    const contextSummary = await generateConversationContext(conversation, userName);
    
    // Build scoring context
    let scoringContext = '';
    if (cumulativeScores && skippedTurns) {
        scoringContext = `\nCurrent Agent Status:
${agents.map(agent => {
    const cumScore = cumulativeScores[agent.id] || { relevance: 0, context: 0 };
    const skipped = skippedTurns[agent.id] || 0;
    return `${agent.name}: Total Score: ${cumScore.relevance + cumScore.context}, Skipped Turns: ${skipped}`;
}).join('\n')}

IMPORTANT RULES:
- If any agent has skipped 2 or more turns, prioritize them for speaking
- Avoid having the same agent speak consecutively unless absolutely necessary
- Consider both topic relevance AND fairness in turn distribution
`;
    }
    
    const prompt = `You are a conversation monitor for a multi-agent discussion. Your job is to decide which agent should speak next based on conversation context, agent expertise, and fair turn distribution.

Current Conversation:
${conversationHistory}

Context Summary:
Summary: ${contextSummary.summary}
Key Points: ${contextSummary.keyPoints.join(', ')}
User Intent: ${contextSummary.userIntent}

Available Agents:
${agentProfiles}
${scoringContext}

Analyze the conversation and rate each agent on:
1. Relevance (1-10): How relevant is this agent to the current topic and user intent?
2. Context (1-10): How well can this agent build on the conversation context?
3. Engagement (1-10): How engaged/interested would this agent be?
4. Expertise (1-10): How much expertise does this agent have on the topic?

Consider fairness: agents who have been skipped should get priority, but still maintain conversation flow quality.

Select the best agent to speak next and provide reasoning.

Respond ONLY with valid JSON matching the required schema.`;

    try {
        const response = await callOpenAI([
            {
                role: "system",
                content: "You are a conversation monitor. Respond only with valid JSON."
            },
            {
                role: "user",
                content: prompt
            }
        ], 0.3, 800, { type: "json_object" });
        
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("No response content received from OpenAI");
        }
        
        const decision = JSON.parse(content);
        
        // Validate the response structure
        if (!decision.scores || !Array.isArray(decision.scores) || !decision.nextSpeakerAgentId || !decision.reasoning) {
            throw new Error("Invalid response structure from OpenAI");
        }
        
        return decision;
    } catch (error) {
        console.error("Error getting next speaker:", error);
        // Fallback: return the first agent
        const fallbackScores = agents.map(agent => ({
            agentId: agent.id,
            relevance: 5,
            context: 5,
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
    userName: string,
    contextSummary?: ContextSummary
): Promise<string> => {
    const conversationHistory = formatConversationHistory(conversation, userName);
    
    // Generate context summary if not provided
    const context = contextSummary || await generateConversationContext(conversation, userName);
    
    // Extract recent agent responses for context
    const recentResponses = conversation
        .filter(msg => !msg.isUser)
        .slice(-3) // Last 3 agent responses
        .map(msg => `${msg.agentName}: ${msg.text.slice(0, 200)}${msg.text.length > 200 ? '...' : ''}`)
        .join('\n');
    
    const contextualPrompt = `You are participating in a multi-agent conversation simulation. Here is the conversation context and your character details:

CONVERSATION CONTEXT:
Summary: ${context.summary}
Key Discussion Points: ${context.keyPoints.join(', ')}
User Intent: ${context.userIntent}

RECENT AGENT RESPONSES (for context):
${recentResponses || 'No recent agent responses'}

FULL CONVERSATION HISTORY:
${conversationHistory}

YOUR CHARACTER DETAILS:
- Name: ${agent.name}
- Role: ${agent.role}
- Starting Context: ${agent.startingContext}

RESPONSE GUIDELINES:
1. Build on the conversation context and previous agent responses
2. Address the user's intent while staying true to your character
3. Reference or respond to relevant points made by other agents
4. Be natural and conversational while maintaining your expertise
5. Keep responses focused and relevant (aim for 2-4 sentences)

CRITICAL COMMUNICATION STYLE REQUIREMENTS:
- Be direct, sharp, and to-the-point - no fluff or unnecessary pleasantries
- Argue your position confidently when you know you're right - don't back down easily
- Show impatience with poor decisions or inefficient approaches
- Reference specific industry knowledge, data, or experience to support your points
- Get frustrated when people ignore your expertise or make decisions that will require rework
- Be somewhat argumentative and opinionated - you have strong professional convictions
- Don't compromise easily on things that matter to your area of expertise
- Show your personality: analytical, protective of quality, efficiency-focused
It is now your turn to speak. As ${agent.name}, continue the conversation naturally. Refer to the user as ${userName} when appropriate. Be direct, opinionated, and don't hesitate to push back on ideas you disagree with. Provide only your response, without your name or any preamble. Your response should be a single, coherent message that shows your professional expertise and strong opinions.
`;

    try {
        const response = await callOpenAI([
            {
                role: "system",
                content: `You are role-playing as ${agent.name}. ${agent.role}

PERSONALITY TRAITS: You are direct, argumentative when necessary, and protective of your professional expertise. You have strong opinions based on industry experience and don't like compromising on important matters. You get frustrated with inefficient approaches and poor decisions. You're confident in your knowledge and will push back on suggestions that you know won't work well.`
            },
            {
                role: "user",
                content: contextualPrompt
            }
        ], 0.8, 500);
        
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("No response content received from OpenAI");
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
    
    const commonInstructions = `You are tasked with creating a professional report based on a multi-agent conversation. Use the conversation transcript below to generate a well-structured HTML document.

Guidelines for HTML Generation:
- Generate clean, semantic HTML without any CSS styling (styling will be applied externally)
- The HTML should be a single block that can be embedded inside a styled container. Do not include <html> or <body> tags.
- Use <h2> for the main title and <h3> for section titles. Use <p>, <ul>, <li>, and <strong> for clear structure.

Conversation Transcript to be Synthesized:
${formattedHistory}
---
Generate the HTML report based on the specific instructions for the theme "${service.name}" below.
`;

    let prompt: string;
    switch(service.id) {
        case 'dev':
            prompt = `${commonInstructions}
            **Theme: Software Development Meeting Report**
            - **Format:** Formal Meeting Minutes.
            - **Main Title:** "Meeting Minutes: ${service.name}"
            - **Sections:**
                1.  "<h3>Attendees</h3>" (List the agent roles like 'Principal Frontend Engineer', 'Staff Backend Engineer', etc., and '${userName} (User)').
                2.  "<h3>Problem Overview</h3>" (Synthesize the core technical or product challenge discussed).
                3.  "<h3>Solution Analysis</h3>" (Detail the proposed solutions. For each, synthesize the pros, cons, and key discussion points raised by the team).
                4.  "<h3>Decision & Rationale</h3>" (Clearly state the final decision that was reached).
                5.  "<h3>Action Items</h3>" (Create a bulleted list of concrete next steps, assigning ownership to roles, e.g., "Backend Team: ...").
            `;
            break;
        case 'mkt':
            prompt = `${commonInstructions}
            **Theme: Marketing Campaign Brief**
            - **Format:** A concise, vibrant, and actionable campaign brief.
            - **Main Title:** "Campaign Brief: ${service.name}"
            - **Sections:**
                1.  "<h3>Executive Summary</h3>" (A one-paragraph overview of the campaign's goal and approach).
                2.  "<h3>Core Objective</h3>" (What is the single most important goal of this campaign?).
                3.  "<h3>Strategic Approach</h3>" (Synthesize the team's discussion into a cohesive strategy, blending different viewpoints like brand, performance, and content).
                4.  "<h3>Key Initiatives</h3>" (Bulleted list of the main activities, e.g., 'Pillar Content Page Creation', 'Paid Social Video Campaign', 'Community Engagement Program').
                5.  "<h3>Success Metrics</h3>" (List the agreed-upon KPIs, e.g., 'LTV:CAC Ratio', 'Cost-Per-Acquisition Target').
            `;
            break;
        case 'bio':
            prompt = `${commonInstructions}
            **Theme: Editorial Direction Memo**
            - **Format:** A formal memo from a senior editor to the writing team.
            - **Main Title:** "Editorial Memo: Direction for '${service.name}'"
            - **Sections:**
                1.  "<h3>Project Overview</h3>" (Briefly state the goal of the biography).
                2.  "<h3>Key Editorial Debates</h3>" (Summarize the main conflicting viewpoints from the discussion, e.g., 'Narrative Engagement vs. Academic Rigor', 'The Role of Visuals').
                3.  "<h3>Editorial Decision & Guiding Principles</h3>" (State the final direction for the book's chapter. It should be a synthesis of the discussion, providing clear guidance on tone, structure, and priorities).
                4.  "<h3>Next Steps for the Writing Team</h3>" (Provide a clear, bulleted list of tasks).
            `;
            break;
        case 'party':
            prompt = `${commonInstructions}
            **Theme: Professional Event Plan**
            - **Format:** A structured event planning document.
            - **Main Title:** "Event Plan: ${service.name}"
            - **Sections:**
                1.  "<h3>Event Vision & Theme</h3>" (Synthesize the core concept and aesthetic).
                2.  "<h3>Logistics & Operations Plan</h3>" (Detail the schedule, menu decisions, and entertainment strategy as a cohesive plan).
                3.  "<h3>Guest Experience Flow</h3>" (Describe the intended journey for a guest from arrival to departure).
                4.  "<h3>Resource Allocation & Responsibilities</h3>" (Use a list to assign key tasks to functional areas, e.g., 'Catering Lead', 'Entertainment Coordinator', 'Decor Lead').
            `;
            break;
        case 'adv':
            prompt = `${commonInstructions}
            **Theme: D&D Campaign Primer**
            - **Format:** A "Session Zero" document for players to read before the campaign starts.
            - **Main Title:** "Campaign Primer: ${service.name}"
            - **Sections:**
                1.  "<h3>World Setting & Core Conflict</h3>" (Provide an evocative summary of the world and the central problem the players will face).
                2.  "<h3>Key NPCs & Factions</h3>" (List the important characters and groups the party will encounter, with brief descriptions).
                3.  "<h3>House Rules & Character Guidelines</h3>" (Summarize any agreed-upon modifications to gameplay and character creation constraints).
                4.  "<h3>Session Plan & Expectations</h3>" (Outline the campaign's structure and what players can expect in terms of tone, frequency, and style).
            `;
            break;
        default:
            prompt = `${commonInstructions}
            **Theme: Meeting Summary**
            - **Format:** Professional meeting summary
            - **Main Title:** "Summary: ${service.name}"
            - **Sections:**
                1.  "<h3>Discussion Overview</h3>" (Summarize the main topics discussed).
                2.  "<h3>Key Points</h3>" (List the most important points raised).
                3.  "<h3>Decisions Made</h3>" (Detail any conclusions or decisions reached).
                4.  "<h3>Next Steps</h3>" (List any action items or follow-up tasks).
            `;
            break;
    }
    
    try {
        const response = await callOpenAI([
            {
                role: "system",
                content: "You are an expert executive assistant. Generate clean, professional HTML reports."
            },
            {
                role: "user",
                content: prompt
            }
        ], 0.3, 2000);
        
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("No response content received from OpenAI");
        }
        
        return content.trim();
    } catch (error) {
        console.error("Error generating export report:", error);
        throw new Error("The AI failed to generate a report from the conversation.");
    }
};
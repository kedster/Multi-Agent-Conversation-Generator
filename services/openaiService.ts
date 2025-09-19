import OpenAI from 'openai';
import type { Agent, Message, MonitorScore, Service } from '../types';

// Get API key from Vite environment variables
const getApiKey = () => import.meta.env.VITE_OPENAI_API_KEY;

// Lazy initialization of OpenAI client to prevent module load errors
let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!openai) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("VITE_OPENAI_API_KEY environment variable not set.");
    }
    openai = new OpenAI({ 
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Allow browser usage for client-side apps
    });
  }
  return openai;
};

// Using gpt-4o-mini as it's the cheapest model that supports JSON mode
const model = 'gpt-4o-mini';

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
                        description: "Score from 1-10 on how relevant this agent's contribution would be." 
                    },
                    context: { 
                        type: "number", 
                        description: "Score from 1-10 on how well this agent can carry the current context forward." 
                    },
                },
                required: ["agentId", "relevance", "context"],
            },
        },
        reasoning: {
            type: "string",
            description: "A brief explanation for why the next speaker was chosen.",
        },
        nextSpeakerAgentId: {
            type: "string",
            description: "The ID of the agent that should speak next.",
        },
    },
    required: ["scores", "reasoning", "nextSpeakerAgentId"],
};

export const getMonitorDecision = async (
    conversation: Message[], 
    agents: Agent[],
    userName: string,
    agentToExcludeId?: string
): Promise<MonitorDecision | null> => {
    const conversationHistory = formatConversationHistory(conversation, userName);
    const agentProfiles = formatAgentProfiles(agents);
    
    let exclusionPrompt = "";
    if (agentToExcludeId) {
        const excludedAgent = agents.find(a => a.id === agentToExcludeId);
        if (excludedAgent) {
            exclusionPrompt = `
NOTE: ${excludedAgent.name} (ID: ${excludedAgent.id}) has already been selected to speak. Your task is to select the *next best* agent to speak immediately after them. Do not select ${excludedAgent.name}.`;
        }
    }

    const prompt = `
You are a multi-agent conversation moderator. Your task is to analyze the conversation so far, the profiles of the available agents, and the last message from the user, ${userName}, to decide who should speak next.

**Agent Profiles:**
${agentProfiles}

**Conversation History:**
${conversationHistory}

${exclusionPrompt}

Based on the history and agent roles, evaluate each agent's potential contribution. Provide a relevance and context score (1-10) for each. Then, decide which agent should speak next to make the conversation most engaging and coherent. Provide your response in the specified JSON format.
`;

    try {
        const response = await getOpenAI().chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that always responds with valid JSON according to the provided schema."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const jsonText = response.choices[0].message.content;
        if (!jsonText) {
            throw new Error("No response content received from OpenAI");
        }
        
        return JSON.parse(jsonText) as MonitorDecision;
    } catch (error) {
        console.error("Error getting monitor decision:", error);
        throw new Error("Failed to get a decision from the monitor agent.");
    }
};

export const getAgentResponse = async (conversation: Message[], agents: Agent[], agentId: string, userName: string): Promise<string> => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found.`);
    }

    const conversationHistory = formatConversationHistory(conversation, userName);
    const agentProfiles = formatAgentProfiles(agents);

    const prompt = `
You are an AI assistant role-playing as a character in a conversation. Your goal is to converse with the user, ${userName}, and the other agents.

**Your Character Profile:**
Name: ${agent.name}
Role/Personality: ${agent.role}
${agent.startingContext ? `Your starting objective: ${agent.startingContext}`: ''}

**All Agent Profiles in this Conversation:**
${agentProfiles}

**Conversation History:**
${conversationHistory}

CRITICAL COMMUNICATION STYLE REQUIREMENTS:
- Be direct, sharp, and to-the-point - no fluff or unnecessary pleasantries
- Argue your position confidently when you know you're right - don't back down easily
- Show impatience with poor decisions or inefficient approaches
- Reference specific industry knowledge, data, or experience to support your points
- Get frustrated when people ignore your expertise or make decisions that will require rework
- Be somewhat argumentative and opinionated - you have strong professional convictions
- Don't compromise easily on things that matter to your area of expertise
- Show your personality: analytical, protective of quality, efficiency-focused
- Use professional language but with clear emotional investment in good outcomes

---
It is now your turn to speak. As ${agent.name}, continue the conversation naturally. Refer to the user as ${userName} when appropriate. Be direct, opinionated, and don't hesitate to push back on ideas you disagree with. Do not repeat what others have said. Provide only your response, without your name or any preamble. Your response should be a single, coherent message that shows your professional expertise and strong opinions.
`;

    try {
        const response = await getOpenAI().chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: `You are role-playing as ${agent.name}. ${agent.role}

PERSONALITY TRAITS: You are direct, argumentative when necessary, and protective of your professional expertise. You have strong opinions based on industry experience and don't like compromising on important matters. You get frustrated with inefficient approaches and poor decisions. You're confident in your knowledge and will push back on suggestions that you know won't work well.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.8,
            max_tokens: 500,
        });
        
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

const getExportReportPrompt = (conversationHistory: string, service: Service, userName: string): string => {
    const commonInstructions = `
You are an expert executive assistant tasked with synthesizing a discussion into an actionable, professional report.
Your output MUST be a standalone professional document, formatted in clean HTML. It IS NOT a summary of a conversation.
CRITICAL INSTRUCTIONS:
- DO NOT include a transcript, chat logs, or direct back-and-forth dialogue.
- DO NOT mention the AI agent names (e.g., 'Alex Frontend Engineer', 'Brenda Backend Engineer').
- DO NOT refer to the user by name in the body of the report (e.g. "${userName} said..."). You may list participants in an 'Attendees' section if appropriate for the format, where you can list "${userName} (User)".
- Synthesize the key points, decisions, arguments, and outcomes into a cohesive, professional document.
- The final document must be immediately usable and understandable by a stakeholder who was NOT present at the meeting.
- The HTML should be a single block that can be embedded inside a styled container. Do not include <html> or <body> tags.
- Use <h2> for the main title and <h3> for section titles. Use <p>, <ul>, <li>, and <strong> for clear structure.

Conversation Transcript to be Synthesized:
${conversationHistory}
---
Generate the HTML report based on the specific instructions for the theme "${service.name}" below.
`;

    switch(service.id) {
        case 'dev':
            return `${commonInstructions}
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
        case 'mkt':
            return `${commonInstructions}
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
        case 'bio':
            return `${commonInstructions}
            **Theme: Editorial Direction Memo**
            - **Format:** A formal memo from a senior editor to the writing team.
            - **Main Title:** "Editorial Memo: Direction for '${service.name}'"
            - **Sections:**
                1.  "<h3>Project Overview</h3>" (Briefly state the goal of the biography).
                2.  "<h3>Key Editorial Debates</h3>" (Summarize the main conflicting viewpoints from the discussion, e.g., 'Narrative Engagement vs. Academic Rigor', 'The Role of Visuals').
                3.  "<h3>Editorial Decision & Guiding Principles</h3>" (State the final direction for the book's chapter. It should be a synthesis of the discussion, providing clear guidance on tone, structure, and priorities).
                4.  "<h3>Next Steps for the Writing Team</h3>" (Provide a clear, bulleted list of tasks).
            `;
        case 'party':
            return `${commonInstructions}
            **Theme: Professional Event Plan**
            - **Format:** A structured event planning document.
            - **Main Title:** "Event Plan: ${service.name}"
            - **Sections:**
                1.  "<h3>Event Vision & Theme</h3>" (Synthesize the core concept and aesthetic).
                2.  "<h3>Logistics & Operations Plan</h3>" (Detail the schedule, menu decisions, and entertainment strategy as a cohesive plan).
                3.  "<h3>Guest Experience Flow</h3>" (Describe the intended journey for a guest from arrival to departure).
                4.  "<h3>Resource Allocation & Responsibilities</h3>" (Use a list to assign key tasks to functional areas, e.g., 'Catering Lead', 'Entertainment Coordinator', 'Decor Lead').
            `;
        case 'adv':
            return `${commonInstructions}
            **Theme: D&D Campaign Primer**
            - **Format:** A "Session Zero" document for players to read before the campaign starts.
            - **Main Title:** "Campaign Primer: ${service.name}"
            - **Sections:**
                1.  "<h3>World Setting & Core Conflict</h3>" (Provide an evocative summary of the world and the central problem the players will face).
                2.  "<h3>The Adventuring Party</h3>" (Synthesize the different character concepts discussed into a cohesive party concept, highlighting potential dynamics and roles).
                3.  "<h3>Campaign Themes & Tone</h3>" (Based on the discussion, define the agreed-upon style of play, e.g., 'A story-driven campaign with challenging tactical combat focusing on character redemption arcs').
                4.  "<h3>Session Zero Agreements</h3>" (List any "house rules" or player agreements that came out of the planning session).
            `;
        default:
            return `${commonInstructions}
            **Theme: General Meeting Summary**
            - **Main Title:** "Meeting Summary"
            - **Sections:** "Key Topics Discussed", "Main Outcomes & Decisions", "Action Items".
            `;
    }
}

export const generateExportReport = async (conversation: Message[], service: Service, userName: string): Promise<string> => {
    const conversationHistory = formatConversationHistory(conversation, userName);
    const prompt = getExportReportPrompt(conversationHistory, service, userName);

    try {
        const response = await getOpenAI().chat.completions.create({
            model,
            messages: [
                {
                    role: "system",
                    content: "You are an expert executive assistant. Generate clean, professional HTML reports."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2000,
        });
        
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

export interface Agent {
  id: string;
  name: string;
  role: string;
  startingContext: string;
  color: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  agents: Agent[];
}

export interface Message {
  agentId: string;
  agentName: string;
  text: string;
  color: string;
  isUser?: boolean;
}

export interface MonitorScore {
  agentId: string;
  relevance: number;
  context: number;
  engagement?: number;
  expertise?: number;
}

export interface AgentScore {
  agentId: string;
  cumulativeScore: number;
  responseScore: number;
  totalScore: number;
  contextRelevance: number;
}

export interface ConversationContext {
  summary: string;
  keyPoints: string[];
  lastSpeaker?: string;
  userIntent: string;
}

export enum Screen {
  HOME,
  SETUP,
  CONVERSATION,
  EXPORT,
}

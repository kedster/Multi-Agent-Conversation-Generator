
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
}

export enum Screen {
  HOME,
  SETUP,
  CONVERSATION,
  EXPORT,
}

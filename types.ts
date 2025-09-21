
import React from 'react';

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

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface Message {
  agentId: string;
  agentName: string;
  text: string;
  color: string;
  isUser?: boolean;
  tokenUsage?: TokenUsage;
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

export interface AgentTokenStats {
  agentId: string;
  agentName: string;
  totalTokens: number;
  totalCost: number;
  callCount: number;
}

export interface ConversationContext {
  summary: string;
  keyPoints: string[];
  lastSpeaker?: string;
  userIntent: string;
}

export interface AgentConfiguration {
  id: string;
  name: string;
  agents: Agent[];
  createdAt: string;
  updatedAt: string;
}

export enum Screen {
  HOME,
  SETUP,
  CONVERSATION,
  EXPORT,
}

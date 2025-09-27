import type { Agent, MonitorScore } from '../types';

/**
 * Utility functions for managing conversation scores and turn distribution.
 * These functions provide reusable logic for score calculations and state management.
 */

/**
 * Initialize cumulative scores for all agents
 */
export const initializeCumulativeScores = (agents: Agent[]): Record<string, MonitorScore> => {
  return Object.fromEntries(
    agents.map(agent => [agent.id, { agentId: agent.id, relevance: 0, context: 0 }])
  );
};

/**
 * Initialize skipped turns counter for all agents
 */
export const initializeSkippedTurns = (agents: Agent[]): Record<string, number> => {
  return Object.fromEntries(agents.map(a => [a.id, 0]));
};

/**
 * Update cumulative scores with new turn scores
 */
export const updateCumulativeScores = (
  prevScores: Record<string, MonitorScore>,
  turnScores: MonitorScore[]
): Record<string, MonitorScore> => {
  const newScores = { ...prevScores };
  turnScores.forEach(score => {
    if (newScores[score.agentId]) {
      newScores[score.agentId] = {
        agentId: score.agentId,
        relevance: newScores[score.agentId].relevance + score.relevance,
        context: newScores[score.agentId].context + score.context,
      };
    }
  });
  return newScores;
};

/**
 * Update skipped turns after speaker selection
 */
export const updateSkippedTurns = (
  prevSkipped: Record<string, number>,
  agents: Agent[],
  speakerIds: string[]
): Record<string, number> => {
  const newSkipped = { ...prevSkipped };
  agents.forEach(agent => {
    if (speakerIds.includes(agent.id)) {
      newSkipped[agent.id] = 0; // Reset for speakers
    } else {
      newSkipped[agent.id]++; // Increment for others
    }
  });
  return newSkipped;
};

/**
 * Calculate total score for an agent (cumulative + current)
 */
export const calculateTotalScore = (
  agentId: string, 
  currentScores: MonitorScore[], 
  cumulativeScores: Record<string, MonitorScore>
): number => {
  const currentScore = currentScores.find(s => s.agentId === agentId);
  const cumulative = cumulativeScores[agentId] || { agentId, relevance: 0, context: 0 };
  
  if (!currentScore) return 0;
  
  return (cumulative.relevance + cumulative.context) + (currentScore.relevance + currentScore.context);
};

/**
 * Determine if an agent should be allowed to speak based on relevance threshold
 */
export const shouldAgentSpeak = (relevance: number, minRelevanceThreshold: number = 4): boolean => {
  return relevance >= minRelevanceThreshold;
};

/**
 * Enhanced scoring configuration for dynamic threshold adjustment
 */
export interface ScoringConfig {
  mentionedThreshold: number;    // Minimum relevance for mentioned agents
  forcedThreshold: number;       // Minimum relevance for forced agents  
  highRelevanceThreshold: number; // Minimum relevance for regular speakers
  secondSpeakerThreshold: number; // Minimum relevance for second speaker
  relevanceWeight: number;       // Weight for relevance vs context (0.0-1.0)
  contextWeight: number;         // Weight for context vs relevance (0.0-1.0)
}

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  mentionedThreshold: 3,
  forcedThreshold: 3,
  highRelevanceThreshold: 5,
  secondSpeakerThreshold: 6,
  relevanceWeight: 0.8,
  contextWeight: 0.2
};

/**
 * Create a scoring configuration with custom overrides
 */
export const createScoringConfig = (overrides: Partial<ScoringConfig> = {}): ScoringConfig => {
  return { ...DEFAULT_SCORING_CONFIG, ...overrides };
};
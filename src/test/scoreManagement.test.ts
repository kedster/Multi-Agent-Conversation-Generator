import { describe, it, expect } from 'vitest';
import {
  initializeCumulativeScores,
  initializeSkippedTurns,
  updateCumulativeScores,
  updateSkippedTurns,
  calculateTotalScore,
  shouldAgentSpeak,
  createScoringConfig,
  DEFAULT_SCORING_CONFIG
} from '../../utils/scoreManagement';
import type { Agent, MonitorScore } from '../../types';

describe('Score Management Utilities', () => {
  const testAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Alex Morgan',
      role: 'Frontend Engineer',
      startingContext: 'Lead frontend developer',
      color: '#3b82f6'
    },
    {
      id: 'agent-2',
      name: 'Brenda Chen',
      role: 'Backend Engineer',
      startingContext: 'Senior backend developer',
      color: '#10b981'
    },
    {
      id: 'agent-3',
      name: 'Carlos Rodriguez',
      role: 'Product Manager',
      startingContext: 'Product strategy lead',
      color: '#f59e0b'
    }
  ];

  describe('Initialization Functions', () => {
    it('should initialize cumulative scores correctly', () => {
      const cumulativeScores = initializeCumulativeScores(testAgents);

      expect(cumulativeScores).toHaveProperty('agent-1');
      expect(cumulativeScores).toHaveProperty('agent-2');
      expect(cumulativeScores).toHaveProperty('agent-3');
      
      expect(cumulativeScores['agent-1']).toEqual({
        agentId: 'agent-1',
        relevance: 0,
        context: 0
      });
      
      expect(cumulativeScores['agent-2']).toEqual({
        agentId: 'agent-2',
        relevance: 0,
        context: 0
      });
      
      expect(cumulativeScores['agent-3']).toEqual({
        agentId: 'agent-3',
        relevance: 0,
        context: 0
      });
    });

    it('should initialize skipped turns correctly', () => {
      const skippedTurns = initializeSkippedTurns(testAgents);

      expect(skippedTurns).toHaveProperty('agent-1');
      expect(skippedTurns).toHaveProperty('agent-2');
      expect(skippedTurns).toHaveProperty('agent-3');
      
      expect(skippedTurns['agent-1']).toBe(0);
      expect(skippedTurns['agent-2']).toBe(0);
      expect(skippedTurns['agent-3']).toBe(0);
    });
  });

  describe('Update Functions', () => {
    it('should update cumulative scores correctly', () => {
      const initialScores: Record<string, MonitorScore> = {
        'agent-1': { agentId: 'agent-1', relevance: 5, context: 3 },
        'agent-2': { agentId: 'agent-2', relevance: 4, context: 4 }
      };

      const turnScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 3, context: 2 },
        { agentId: 'agent-2', relevance: 6, context: 1 }
      ];

      const updatedScores = updateCumulativeScores(initialScores, turnScores);

      expect(updatedScores['agent-1']).toEqual({
        agentId: 'agent-1',
        relevance: 8, // 5 + 3
        context: 5    // 3 + 2
      });

      expect(updatedScores['agent-2']).toEqual({
        agentId: 'agent-2', 
        relevance: 10, // 4 + 6
        context: 5     // 4 + 1
      });
    });

    it('should update skipped turns correctly after speaker selection', () => {
      const initialSkipped = {
        'agent-1': 1,
        'agent-2': 2,
        'agent-3': 0
      };

      const speakerIds = ['agent-2']; // Only agent-2 speaks

      const updatedSkipped = updateSkippedTurns(initialSkipped, testAgents, speakerIds);

      expect(updatedSkipped['agent-1']).toBe(2); // Incremented
      expect(updatedSkipped['agent-2']).toBe(0); // Reset (speaker)
      expect(updatedSkipped['agent-3']).toBe(1); // Incremented
    });

    it('should handle multiple speakers correctly', () => {
      const initialSkipped = {
        'agent-1': 1,
        'agent-2': 2,
        'agent-3': 1
      };

      const speakerIds = ['agent-1', 'agent-3']; // Two speakers

      const updatedSkipped = updateSkippedTurns(initialSkipped, testAgents, speakerIds);

      expect(updatedSkipped['agent-1']).toBe(0); // Reset (speaker)
      expect(updatedSkipped['agent-2']).toBe(3); // Incremented
      expect(updatedSkipped['agent-3']).toBe(0); // Reset (speaker)
    });
  });

  describe('Score Calculation', () => {
    it('should calculate total score correctly', () => {
      const currentScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 7, context: 5 }
      ];

      const cumulativeScores: Record<string, MonitorScore> = {
        'agent-1': { agentId: 'agent-1', relevance: 10, context: 8 }
      };

      const totalScore = calculateTotalScore('agent-1', currentScores, cumulativeScores);
      
      // Total should be (10 + 8) + (7 + 5) = 30
      expect(totalScore).toBe(30);
    });

    it('should handle missing agent scores gracefully', () => {
      const currentScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 7, context: 5 }
      ];

      const cumulativeScores: Record<string, MonitorScore> = {};

      // Should return 0 for missing agent
      const totalScore = calculateTotalScore('agent-2', currentScores, cumulativeScores);
      expect(totalScore).toBe(0);
    });

    it('should handle missing current score', () => {
      const currentScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 7, context: 5 }
      ];

      const cumulativeScores: Record<string, MonitorScore> = {
        'agent-2': { agentId: 'agent-2', relevance: 10, context: 8 }
      };

      // Should return 0 when current score is missing
      const totalScore = calculateTotalScore('agent-2', currentScores, cumulativeScores);
      expect(totalScore).toBe(0);
    });
  });

  describe('Agent Speaking Logic', () => {
    it('should determine if agent should speak based on relevance', () => {
      expect(shouldAgentSpeak(5, 4)).toBe(true);
      expect(shouldAgentSpeak(3, 4)).toBe(false);
      expect(shouldAgentSpeak(4, 4)).toBe(true);
    });

    it('should use default threshold when not provided', () => {
      expect(shouldAgentSpeak(5)).toBe(true);  // >= 4 (default)
      expect(shouldAgentSpeak(3)).toBe(false); // < 4 (default)
      expect(shouldAgentSpeak(4)).toBe(true);  // >= 4 (default)
    });
  });

  describe('Scoring Configuration', () => {
    it('should provide correct default configuration', () => {
      expect(DEFAULT_SCORING_CONFIG).toEqual({
        mentionedThreshold: 3,
        forcedThreshold: 3,
        highRelevanceThreshold: 5,
        secondSpeakerThreshold: 6,
        relevanceWeight: 0.8,
        contextWeight: 0.2
      });
    });

    it('should create custom configuration with overrides', () => {
      const customConfig = createScoringConfig({
        mentionedThreshold: 2,
        highRelevanceThreshold: 7
      });

      expect(customConfig).toEqual({
        mentionedThreshold: 2,         // Override
        forcedThreshold: 3,            // Default
        highRelevanceThreshold: 7,     // Override
        secondSpeakerThreshold: 6,     // Default
        relevanceWeight: 0.8,          // Default
        contextWeight: 0.2             // Default
      });
    });

    it('should create default configuration when no overrides provided', () => {
      const defaultConfig = createScoringConfig();
      expect(defaultConfig).toEqual(DEFAULT_SCORING_CONFIG);
    });

    it('should handle partial overrides correctly', () => {
      const partialConfig = createScoringConfig({
        relevanceWeight: 0.7,
        contextWeight: 0.3
      });

      expect(partialConfig.relevanceWeight).toBe(0.7);
      expect(partialConfig.contextWeight).toBe(0.3);
      expect(partialConfig.mentionedThreshold).toBe(3); // Should keep default
    });
  });
});
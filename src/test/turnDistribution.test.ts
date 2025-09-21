import { describe, it, expect } from 'vitest';
import { selectTopSpeakers } from '../../utils/conversationUtils';
import type { Agent, MonitorScore } from '../../types';

describe('selectTopSpeakers', () => {
  // Sample agents for testing
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
    },
    {
      id: 'agent-4',
      name: 'Diana Kim',
      role: 'DevOps Engineer',
      startingContext: 'Infrastructure specialist',
      color: '#ef4444'
    }
  ];

  const defaultCumulativeScores: Record<string, MonitorScore> = {
    'agent-1': { agentId: 'agent-1', relevance: 5, context: 3 },
    'agent-2': { agentId: 'agent-2', relevance: 4, context: 4 },
    'agent-3': { agentId: 'agent-3', relevance: 3, context: 5 },
    'agent-4': { agentId: 'agent-4', relevance: 2, context: 2 }
  };

  const defaultSkippedTurns: Record<string, number> = {
    'agent-1': 0,
    'agent-2': 0,
    'agent-3': 0,
    'agent-4': 0
  };

  it('should select agent with highest relevance when no special conditions', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 6, context: 5 },
      { agentId: 'agent-2', relevance: 8, context: 4 }, // Highest relevance
      { agentId: 'agent-3', relevance: 4, context: 6 },
      { agentId: 'agent-4', relevance: 3, context: 3 }
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [], // No recent speakers
      [] // No mentioned agents
    );

    expect(speaker1).toBe('agent-2');
    expect(speaker2).toBe('agent-1'); // Agent-1 has relevance >= 6, so becomes second speaker
  });

  it('should prioritize mentioned agents over higher relevance', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 4, context: 5 }, // Mentioned but lower relevance
      { agentId: 'agent-2', relevance: 8, context: 4 }, // Higher relevance but not mentioned
      { agentId: 'agent-3', relevance: 5, context: 6 },
      { agentId: 'agent-4', relevance: 3, context: 3 }
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [],
      ['agent-1'] // Agent-1 is mentioned
    );

    expect(speaker1).toBe('agent-1'); // Mentioned agent gets priority
  });

  it('should prioritize forced speakers (skipped >= 2 turns)', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 8, context: 5 }, // High relevance but not forced
      { agentId: 'agent-2', relevance: 6, context: 4 },
      { agentId: 'agent-3', relevance: 5, context: 6 },
      { agentId: 'agent-4', relevance: 4, context: 3 } // Low relevance but forced (2 skipped turns)
    ];

    const skippedTurns = {
      'agent-1': 0,
      'agent-2': 1,
      'agent-3': 1,
      'agent-4': 2 // Forced to speak
    };

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      skippedTurns,
      [],
      []
    );

    expect(speaker1).toBe('agent-4'); // Forced agent gets priority
  });

  it('should avoid recent speakers when possible', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 6, context: 5 }, // Recent speaker but same relevance as agent-2
      { agentId: 'agent-2', relevance: 6, context: 4 }, // Not recent, same relevance
      { agentId: 'agent-3', relevance: 5, context: 6 },
      { agentId: 'agent-4', relevance: 4, context: 3 }
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      ['agent-1'], // Agent-1 was a recent speaker
      []
    );

    expect(speaker1).toBe('agent-2'); // Non-recent speaker preferred when relevance is equal
  });

  it('should select two speakers when second speaker has high relevance', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 8, context: 5 },
      { agentId: 'agent-2', relevance: 7, context: 4 }, // High enough for second speaker
      { agentId: 'agent-3', relevance: 5, context: 6 },
      { agentId: 'agent-4', relevance: 4, context: 3 }
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [],
      []
    );

    expect(speaker1).toBe('agent-1');
    expect(speaker2).toBe('agent-2'); // Second speaker has relevance >= 6
  });

  it('should select two speakers when second speaker is mentioned', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 8, context: 5 },
      { agentId: 'agent-2', relevance: 4, context: 4 }, // Lower relevance but mentioned
      { agentId: 'agent-3', relevance: 5, context: 6 },
      { agentId: 'agent-4', relevance: 4, context: 3 }
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [],
      ['agent-2'] // Agent-2 is mentioned
    );

    expect(speaker1).toBe('agent-2'); // Mentioned agent is first speaker
    expect(speaker2).toBe('agent-1'); // Highest relevance agent is second
  });

  it('should select two speakers when second speaker is forced', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 8, context: 5 },
      { agentId: 'agent-2', relevance: 5, context: 4 },
      { agentId: 'agent-3', relevance: 4, context: 6 },
      { agentId: 'agent-4', relevance: 3, context: 3 } // Low relevance but forced
    ];

    const skippedTurns = {
      'agent-1': 0,
      'agent-2': 1,
      'agent-3': 1,
      'agent-4': 2 // Forced to speak
    };

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      skippedTurns,
      [],
      []
    );

    expect(speaker1).toBe('agent-4'); // Forced agent is first
    expect(speaker2).toBe('agent-1'); // High relevance agent is second
  });

  it('should only select eligible speakers (relevance >= 5 or mentioned/forced)', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 3, context: 5 }, // Low relevance, not eligible
      { agentId: 'agent-2', relevance: 2, context: 4 }, // Low relevance, not eligible
      { agentId: 'agent-3', relevance: 6, context: 6 }, // High relevance, eligible
      { agentId: 'agent-4', relevance: 1, context: 3 } // Low relevance, not eligible
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [],
      []
    );

    expect(speaker1).toBe('agent-3'); // Only eligible speaker
    expect(speaker2).toBeUndefined(); // No second eligible speaker
  });

  it('should fallback to highest scoring agent when no one is eligible', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 2, context: 5 },
      { agentId: 'agent-2', relevance: 4, context: 4 }, // Highest relevance but still low
      { agentId: 'agent-3', relevance: 1, context: 6 },
      { agentId: 'agent-4', relevance: 3, context: 3 }
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [],
      []
    );

    expect(speaker1).toBe('agent-2'); // Best of the ineligible agents
    expect(speaker2).toBeUndefined();
  });

  it('should handle multiple mentioned agents correctly', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 5, context: 5 }, // Mentioned
      { agentId: 'agent-2', relevance: 6, context: 4 }, // Mentioned
      { agentId: 'agent-3', relevance: 8, context: 6 }, // Not mentioned but higher relevance
      { agentId: 'agent-4', relevance: 4, context: 3 }
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [],
      ['agent-1', 'agent-2'] // Both mentioned
    );

    expect(speaker1).toBe('agent-2'); // Higher relevance among mentioned agents
    expect(speaker2).toBe('agent-1'); // Second mentioned agent
  });

  it('should handle empty scores array gracefully', () => {
    const scores: MonitorScore[] = [];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [],
      []
    );

    expect(speaker1).toBe('agent-1'); // Fallback to first agent
    expect(speaker2).toBeUndefined();
  });

  it('should use primary score calculation correctly (80% relevance, 20% context)', () => {
    const scores: MonitorScore[] = [
      { agentId: 'agent-1', relevance: 6, context: 2 }, // Primary score: 4.8 + 0.4 = 5.2
      { agentId: 'agent-2', relevance: 5, context: 6 }, // Primary score: 4.0 + 1.2 = 5.2 (same)
      { agentId: 'agent-3', relevance: 7, context: 1 }, // Primary score: 5.6 + 0.2 = 5.8 (highest)
      { agentId: 'agent-4', relevance: 4, context: 4 }
    ];

    const [speaker1, speaker2] = selectTopSpeakers(
      scores,
      testAgents,
      defaultCumulativeScores,
      defaultSkippedTurns,
      [],
      []
    );

    expect(speaker1).toBe('agent-3'); // Highest primary score
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { TokenTracker, calculateCost, formatCost } from '../../utils/tokenTracker';
import type { TokenUsage } from '../../types';

describe('TokenTracker', () => {
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker();
  });

  it('should calculate cost correctly for token usage', () => {
    const tokenUsage: TokenUsage = {
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500
    };

    const cost = calculateCost(tokenUsage);
    // Cost = (1000/1000 * 0.000150) + (500/1000 * 0.000600) = 0.00015 + 0.0003 = 0.00045
    expect(cost).toBeCloseTo(0.00045);
  });

  it('should format cost correctly', () => {
    expect(formatCost(0.0005)).toBe('<$0.001'); // 0.0005 rounds to 0.001, but since it's < 0.001, shows <$0.001
    expect(formatCost(0.00001)).toBe('<$0.001');
    expect(formatCost(0.001)).toBe('$0.001');
    expect(formatCost(0.12345)).toBe('$0.123');
  });

  it('should track usage for multiple agents', () => {
    const tokenUsage1: TokenUsage = {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    };

    const tokenUsage2: TokenUsage = {
      prompt_tokens: 200,
      completion_tokens: 100,
      total_tokens: 300
    };

    tracker.trackUsage('agent1', 'Agent 1', tokenUsage1);
    tracker.trackUsage('agent2', 'Agent 2', tokenUsage2);

    const stats = tracker.getAllStats();
    expect(stats).toHaveLength(2);
    
    const agent1Stats = tracker.getAgentStats('agent1');
    expect(agent1Stats).not.toBeNull();
    expect(agent1Stats!.totalTokens).toBe(150);
    expect(agent1Stats!.callCount).toBe(1);
  });

  it('should accumulate usage for same agent', () => {
    const tokenUsage1: TokenUsage = {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    };

    const tokenUsage2: TokenUsage = {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    };

    tracker.trackUsage('agent1', 'Agent 1', tokenUsage1);
    tracker.trackUsage('agent1', 'Agent 1', tokenUsage2);

    const stats = tracker.getAgentStats('agent1');
    expect(stats!.totalTokens).toBe(300);
    expect(stats!.callCount).toBe(2);
  });

  it('should calculate total cost across all agents', () => {
    const tokenUsage: TokenUsage = {
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500
    };

    tracker.trackUsage('agent1', 'Agent 1', tokenUsage);
    tracker.trackUsage('agent2', 'Agent 2', tokenUsage);

    const totalCost = tracker.getTotalCost();
    expect(totalCost).toBeCloseTo(0.0009); // 2 * 0.00045
  });

  it('should reset all statistics', () => {
    const tokenUsage: TokenUsage = {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    };

    tracker.trackUsage('agent1', 'Agent 1', tokenUsage);
    tracker.reset();

    expect(tracker.getAllStats()).toHaveLength(0);
    expect(tracker.getTotalCost()).toBe(0);
  });

  it('should generate formatted summary', () => {
    const tokenUsage: TokenUsage = {
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500
    };

    tracker.trackUsage('agent1', 'Agent 1', tokenUsage);
    tracker.trackUsage('agent2', 'Agent 2', tokenUsage);

    const summary = tracker.getFormattedSummary();
    expect(summary).toHaveLength(3); // 2 agents + total
    expect(summary[2]).toContain('Total: 3000 tokens');
  });
});
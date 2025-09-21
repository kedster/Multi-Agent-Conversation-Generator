import type { TokenUsage, AgentTokenStats } from '../types';

// Token pricing for gpt-4o-mini (in dollars per 1000 tokens)
const GPT_4O_MINI_PRICING = {
  input: 0.000150,   // $0.150 per 1M input tokens
  output: 0.000600   // $0.600 per 1M output tokens
};

// Calculate cost based on token usage
export function calculateCost(tokenUsage: TokenUsage): number {
  const inputCost = (tokenUsage.prompt_tokens / 1000) * GPT_4O_MINI_PRICING.input;
  const outputCost = (tokenUsage.completion_tokens / 1000) * GPT_4O_MINI_PRICING.output;
  return inputCost + outputCost;
}

// Format cost as currency
export function formatCost(cost: number): string {
  if (cost < 0.001) {
    return '<$0.001';
  }
  return `$${cost.toFixed(3)}`;
}

// Token tracker class to manage per-agent statistics
export class TokenTracker {
  private agentStats = new Map<string, AgentTokenStats>();

  // Track token usage for an agent
  trackUsage(agentId: string, agentName: string, tokenUsage: TokenUsage): void {
    const existing = this.agentStats.get(agentId);
    const cost = calculateCost(tokenUsage);
    
    if (existing) {
      existing.totalTokens += tokenUsage.total_tokens;
      existing.totalCost += cost;
      existing.callCount += 1;
    } else {
      this.agentStats.set(agentId, {
        agentId,
        agentName,
        totalTokens: tokenUsage.total_tokens,
        totalCost: cost,
        callCount: 1
      });
    }
  }

  // Get stats for a specific agent
  getAgentStats(agentId: string): AgentTokenStats | null {
    return this.agentStats.get(agentId) || null;
  }

  // Get all agent statistics
  getAllStats(): AgentTokenStats[] {
    return Array.from(this.agentStats.values());
  }

  // Get total cost across all agents
  getTotalCost(): number {
    return Array.from(this.agentStats.values())
      .reduce((total, stats) => total + stats.totalCost, 0);
  }

  // Get total tokens across all agents
  getTotalTokens(): number {
    return Array.from(this.agentStats.values())
      .reduce((total, stats) => total + stats.totalTokens, 0);
  }

  // Reset all statistics
  reset(): void {
    this.agentStats.clear();
  }

  // Get formatted summary for display
  getFormattedSummary(): string[] {
    const stats = this.getAllStats().sort((a, b) => b.totalCost - a.totalCost);
    
    const lines = stats.map(stat => 
      `${stat.agentName}: ${stat.totalTokens} tokens (${formatCost(stat.totalCost)})`
    );
    
    const totalCost = this.getTotalCost();
    const totalTokens = this.getTotalTokens();
    
    lines.push(`Total: ${totalTokens} tokens (${formatCost(totalCost)})`);
    
    return lines;
  }
}

// Global instance for the application
export const globalTokenTracker = new TokenTracker();
import type { Agent, Message, MonitorScore } from '../types';
import { detectMentionedAgents } from './conversationUtils';

/**
 * Centralized conversation moderation logic for better maintainability and scalability.
 * Handles speaker selection, turn distribution, and score management.
 */
export class ConversationModerator {
  private agents: Agent[];
  private cumulativeScores: Record<string, MonitorScore>;
  private skippedTurns: Record<string, number>;

  constructor(agents: Agent[]) {
    this.agents = agents;
    this.cumulativeScores = this.initializeCumulativeScores();
    this.skippedTurns = this.initializeSkippedTurns();
  }

  /**
   * Initialize cumulative scores for all agents
   */
  private initializeCumulativeScores(): Record<string, MonitorScore> {
    return Object.fromEntries(
      this.agents.map(agent => [agent.id, { agentId: agent.id, relevance: 0, context: 0 }])
    );
  }

  /**
   * Initialize skipped turns counter for all agents
   */
  private initializeSkippedTurns(): Record<string, number> {
    return Object.fromEntries(this.agents.map(a => [a.id, 0]));
  }

  /**
   * Update cumulative scores with new turn scores
   */
  private updateCumulativeScores(turnScores: MonitorScore[]): void {
    turnScores.forEach(score => {
      if (this.cumulativeScores[score.agentId]) {
        this.cumulativeScores[score.agentId] = {
          agentId: score.agentId,
          relevance: this.cumulativeScores[score.agentId].relevance + score.relevance,
          context: this.cumulativeScores[score.agentId].context + score.context,
        };
      }
    });
  }

  /**
   * Update skipped turns after speaker selection
   */
  private updateSkippedTurns(speakerIds: string[]): void {
    this.agents.forEach(agent => {
      if (speakerIds.includes(agent.id)) {
        this.skippedTurns[agent.id] = 0; // Reset for speakers
      } else {
        this.skippedTurns[agent.id]++; // Increment for others
      }
    });
  }

  /**
   * Calculate total score for an agent (cumulative + current)
   */
  calculateTotalScore(agentId: string, currentScores: MonitorScore[]): number {
    const currentScore = currentScores.find(s => s.agentId === agentId);
    const cumulative = this.cumulativeScores[agentId] || { agentId, relevance: 0, context: 0 };
    
    if (!currentScore) return 0;
    
    return (cumulative.relevance + cumulative.context) + (currentScore.relevance + currentScore.context);
  }

  /**
   * Core speaker selection algorithm with dynamic relevance scoring
   */
  selectSpeakers(
    turnScores: MonitorScore[],
    conversation: Message[],
    userMessage: string
  ): { speaker1Id: string; speaker2Id?: string; mentionedAgents: string[] } {
    // Detect mentioned agents from user message
    const mentionedAgents = detectMentionedAgents(userMessage, this.agents);
    
    // Get recent speakers to avoid succession
    const lastSpeakers = conversation
      .filter(msg => !msg.isUser)
      .slice(-2)
      .map(msg => msg.agentId);

    // Calculate relevance-focused scores for all agents
    const agentScores = this.agents.map(agent => {
      const currentScore = turnScores.find(s => s.agentId === agent.id);
      if (!currentScore) return null;
      
      const isMentioned = mentionedAgents.includes(agent.id);
      const isForced = this.skippedTurns[agent.id] >= 2;
      const wasRecentSpeaker = lastSpeakers.includes(agent.id);
      
      // Current relevance is the primary factor (80%), with context as secondary (20%)
      const primaryScore = (currentScore.relevance * 0.8) + (currentScore.context * 0.2);
      
      return {
        agentId: agent.id,
        primaryScore,
        currentRelevance: currentScore.relevance,
        isMentioned,
        isForced,
        wasRecentSpeaker,
        // Agent can speak if: mentioned (rel>=3), forced (rel>=3), or high relevance (rel>=5)
        canSpeak: isMentioned || isForced || currentScore.relevance >= 5
      };
    }).filter(Boolean);

    // Sort by priority: mentioned > forced > relevance > avoid recent speakers > primary score
    agentScores.sort((a, b) => {
      // Mentioned agents get absolute priority
      if (a!.isMentioned && !b!.isMentioned) return -1;
      if (!a!.isMentioned && b!.isMentioned) return 1;
      
      // Then forced speakers
      if (a!.isForced && !b!.isForced) return -1;
      if (!a!.isForced && b!.isForced) return 1;
      
      // Then by current relevance (most important factor)
      if (Math.abs(a!.currentRelevance - b!.currentRelevance) >= 1) {
        return b!.currentRelevance - a!.currentRelevance;
      }
      
      // Prefer agents who weren't recent speakers
      if (a!.wasRecentSpeaker && !b!.wasRecentSpeaker) return 1;
      if (!a!.wasRecentSpeaker && b!.wasRecentSpeaker) return -1;
      
      // Finally by primary score
      return b!.primaryScore - a!.primaryScore;
    });
    
    // Filter to agents that can speak
    const eligibleSpeakers = agentScores.filter(agent => agent!.canSpeak);
    
    // If no one is eligible, allow the most relevant agent
    const finalCandidates = eligibleSpeakers.length > 0 ? eligibleSpeakers : agentScores.slice(0, 1);
    
    const speaker1Id = finalCandidates[0]?.agentId || this.agents[0].id;
    
    // Select second speaker only if they're highly relevant (>=6) or mentioned/forced
    let speaker2Id: string | undefined;
    if (finalCandidates.length > 1) {
      const candidate2 = finalCandidates[1];
      if (candidate2!.isMentioned || candidate2!.isForced || candidate2!.currentRelevance >= 6) {
        speaker2Id = candidate2!.agentId;
      }
    }
    
    return {
      speaker1Id,
      speaker2Id,
      mentionedAgents
    };
  }

  /**
   * Process a turn with scoring and speaker selection
   */
  processTurn(
    turnScores: MonitorScore[],
    conversation: Message[],
    userMessage: string
  ): {
    speaker1Id: string;
    speaker2Id?: string;
    mentionedAgents: string[];
    cumulativeScores: Record<string, MonitorScore>;
    skippedTurns: Record<string, number>;
  } {
    // Select speakers for this turn
    const { speaker1Id, speaker2Id, mentionedAgents } = this.selectSpeakers(
      turnScores,
      conversation,
      userMessage
    );

    // Update internal state
    this.updateCumulativeScores(turnScores);
    this.updateSkippedTurns([speaker1Id, ...(speaker2Id ? [speaker2Id] : [])]);

    return {
      speaker1Id,
      speaker2Id,
      mentionedAgents,
      cumulativeScores: { ...this.cumulativeScores },
      skippedTurns: { ...this.skippedTurns }
    };
  }

  /**
   * Reset moderator state (useful for new conversations)
   */
  reset(): void {
    this.cumulativeScores = this.initializeCumulativeScores();
    this.skippedTurns = this.initializeSkippedTurns();
  }

  /**
   * Get current state snapshots
   */
  getState(): {
    cumulativeScores: Record<string, MonitorScore>;
    skippedTurns: Record<string, number>;
  } {
    return {
      cumulativeScores: { ...this.cumulativeScores },
      skippedTurns: { ...this.skippedTurns }
    };
  }

  /**
   * Set state (useful for restoring from saved state)
   */
  setState(
    cumulativeScores: Record<string, MonitorScore>,
    skippedTurns: Record<string, number>
  ): void {
    this.cumulativeScores = { ...cumulativeScores };
    this.skippedTurns = { ...skippedTurns };
  }
}
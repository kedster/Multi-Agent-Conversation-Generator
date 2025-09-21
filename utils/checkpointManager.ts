import type { Message, Agent } from '../types';

// Configuration for checkpoint intervals
export const CHECKPOINT_CONFIG = {
  // Call ScoreKeeper every N user messages (0 = every turn, like current behavior)
  scoreKeeperInterval: 2, // Every 2 user turns
  
  // Call ReportBot every N user messages (0 = only at conversation end)
  reportBotInterval: 0, // Only at end
  
  // Minimum messages before first checkpoint
  minMessagesForCheckpoint: 3,
  
  // Always call on conversation end
  alwaysCallOnEnd: true
};

export interface CheckpointManager {
  shouldCallScoreKeeper(conversation: Message[], lastCheckpoint?: number): boolean;
  shouldCallReportBot(conversation: Message[], lastCheckpoint?: number): boolean;
  getLastCheckpointIndex(conversation: Message[]): number;
  isConversationEnd(isEndingConversation: boolean): boolean;
}

export class ConversationCheckpointManager implements CheckpointManager {
  private lastScorekeeperCheckpoint: number = -1;
  private lastReportBotCheckpoint: number = -1;

  shouldCallScoreKeeper(conversation: Message[], isEndingConversation: boolean = false): boolean {
    // Always call on conversation end if configured
    if (isEndingConversation && CHECKPOINT_CONFIG.alwaysCallOnEnd) {
      return true;
    }

    // If interval is 0, call every turn (current behavior)
    if (CHECKPOINT_CONFIG.scoreKeeperInterval === 0) {
      return true;
    }

    const userMessages = conversation.filter(msg => msg.isUser);
    const userMessageCount = userMessages.length;

    // Don't call if we haven't reached minimum messages
    if (userMessageCount < CHECKPOINT_CONFIG.minMessagesForCheckpoint) {
      return false;
    }

    // Check if we've reached the interval since last checkpoint
    const messagesSinceLastCheckpoint = userMessageCount - this.lastScorekeeperCheckpoint;
    
    if (messagesSinceLastCheckpoint >= CHECKPOINT_CONFIG.scoreKeeperInterval) {
      this.lastScorekeeperCheckpoint = userMessageCount;
      return true;
    }

    return false;
  }

  shouldCallReportBot(conversation: Message[], isEndingConversation: boolean = false): boolean {
    // Always call on conversation end if configured
    if (isEndingConversation && CHECKPOINT_CONFIG.alwaysCallOnEnd) {
      return true;
    }

    // If interval is 0, only call at conversation end
    if (CHECKPOINT_CONFIG.reportBotInterval === 0) {
      return false;
    }

    const userMessages = conversation.filter(msg => msg.isUser);
    const userMessageCount = userMessages.length;

    // Don't call if we haven't reached minimum messages
    if (userMessageCount < CHECKPOINT_CONFIG.minMessagesForCheckpoint) {
      return false;
    }

    // Check if we've reached the interval since last checkpoint
    const messagesSinceLastCheckpoint = userMessageCount - this.lastReportBotCheckpoint;
    
    if (messagesSinceLastCheckpoint >= CHECKPOINT_CONFIG.reportBotInterval) {
      this.lastReportBotCheckpoint = userMessageCount;
      return true;
    }

    return false;
  }

  getLastCheckpointIndex(conversation: Message[]): number {
    const userMessages = conversation.filter(msg => msg.isUser);
    return Math.max(this.lastScorekeeperCheckpoint, this.lastReportBotCheckpoint);
  }

  isConversationEnd(isEndingConversation: boolean): boolean {
    return isEndingConversation;
  }

  // Reset checkpoint tracking (useful when starting new conversation)
  reset(): void {
    this.lastScorekeeperCheckpoint = -1;
    this.lastReportBotCheckpoint = -1;
  }

  // Get current checkpoint status for debugging
  getCheckpointStatus(conversation: Message[]): {
    userMessageCount: number;
    lastScorekeeperCheckpoint: number;
    lastReportBotCheckpoint: number;
    nextScorekeeperIn: number;
    nextReportBotIn: number;
  } {
    const userMessageCount = conversation.filter(msg => msg.isUser).length;
    
    const nextScorekeeperIn = CHECKPOINT_CONFIG.scoreKeeperInterval === 0 
      ? 0 
      : Math.max(0, CHECKPOINT_CONFIG.scoreKeeperInterval - (userMessageCount - this.lastScorekeeperCheckpoint));
    
    const nextReportBotIn = CHECKPOINT_CONFIG.reportBotInterval === 0 
      ? -1 // Only at end
      : Math.max(0, CHECKPOINT_CONFIG.reportBotInterval - (userMessageCount - this.lastReportBotCheckpoint));

    return {
      userMessageCount,
      lastScorekeeperCheckpoint: this.lastScorekeeperCheckpoint,
      lastReportBotCheckpoint: this.lastReportBotCheckpoint,
      nextScorekeeperIn,
      nextReportBotIn
    };
  }
}

// Global checkpoint manager instance
export const globalCheckpointManager = new ConversationCheckpointManager();
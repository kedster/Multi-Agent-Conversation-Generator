import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationCheckpointManager, CHECKPOINT_CONFIG } from '../../utils/checkpointManager';
import type { Message } from '../../types';

describe('ConversationCheckpointManager', () => {
  let manager: ConversationCheckpointManager;
  
  beforeEach(() => {
    manager = new ConversationCheckpointManager();
  });

  const createUserMessage = (text: string): Message => ({
    agentId: 'user',
    agentName: 'TestUser',
    text,
    color: '#blue',
    isUser: true
  });

  const createAgentMessage = (agentId: string, text: string): Message => ({
    agentId,
    agentName: `Agent ${agentId}`,
    text,
    color: '#red'
  });

  it('should allow ScoreKeeper calls every configured interval', () => {
    const conversation: Message[] = [
      createUserMessage('Message 1'),
      createAgentMessage('agent1', 'Response 1'),
      createUserMessage('Message 2'),
      createAgentMessage('agent2', 'Response 2'),
      createUserMessage('Message 3'),
      createAgentMessage('agent3', 'Response 3'),
      createUserMessage('Message 4'),
      createAgentMessage('agent1', 'Response 4'),
      createUserMessage('Message 5'),
      createAgentMessage('agent2', 'Response 5')
    ];

    // First call should not trigger (less than min messages)
    expect(manager.shouldCallScoreKeeper(conversation.slice(0, 1))).toBe(false);
    
    // Should trigger after reaching min messages and interval (3 user messages)
    expect(manager.shouldCallScoreKeeper(conversation.slice(0, 5))).toBe(true);
    
    // Should not trigger again until next interval (4 user messages, but checkpoint was at 3)
    expect(manager.shouldCallScoreKeeper(conversation.slice(0, 7))).toBe(false);
    
    // Should trigger again after another interval (5 user messages = 3 + 2)
    expect(manager.shouldCallScoreKeeper(conversation)).toBe(true);
  });

  it('should handle ReportBot calls according to configuration', () => {
    const conversation: Message[] = [
      createUserMessage('Message 1'),
      createAgentMessage('agent1', 'Response 1'),
      createUserMessage('Message 2'),
      createAgentMessage('agent2', 'Response 2')
    ];

    // With default config (interval: 0), should not call during conversation
    expect(manager.shouldCallReportBot(conversation, false)).toBe(false);
    
    // Should call on conversation end
    expect(manager.shouldCallReportBot(conversation, true)).toBe(true);
  });

  it('should always call on conversation end when configured', () => {
    const conversation: Message[] = [
      createUserMessage('Message 1')
    ];

    // Even with minimal conversation, should call on end
    expect(manager.shouldCallScoreKeeper(conversation, true)).toBe(true);
    expect(manager.shouldCallReportBot(conversation, true)).toBe(true);
  });

  it('should reset checkpoint tracking', () => {
    const conversation: Message[] = [
      createUserMessage('Message 1'),
      createAgentMessage('agent1', 'Response 1'),
      createUserMessage('Message 2'),
      createAgentMessage('agent2', 'Response 2'),
      createUserMessage('Message 3')
    ];

    // Trigger a checkpoint
    manager.shouldCallScoreKeeper(conversation);
    
    // Reset should clear history
    manager.reset();
    
    // Should be able to call again immediately after reset
    expect(manager.shouldCallScoreKeeper(conversation)).toBe(true);
  });

  it('should provide checkpoint status information', () => {
    const conversation: Message[] = [
      createUserMessage('Message 1'),
      createAgentMessage('agent1', 'Response 1'),
      createUserMessage('Message 2'),
      createAgentMessage('agent2', 'Response 2'),
      createUserMessage('Message 3')
    ];

    const status = manager.getCheckpointStatus(conversation);
    
    expect(status.userMessageCount).toBe(3);
    expect(status.nextScorekeeperIn).toBeGreaterThanOrEqual(0);
    expect(status.nextReportBotIn).toBe(-1); // End only
  });

  it('should handle conversation with no user messages', () => {
    const conversation: Message[] = [
      createAgentMessage('agent1', 'Response 1'),
      createAgentMessage('agent2', 'Response 2')
    ];

    expect(manager.shouldCallScoreKeeper(conversation)).toBe(false);
    expect(manager.shouldCallReportBot(conversation)).toBe(false);
  });

  it('should respect minimum messages threshold', () => {
    const conversation: Message[] = [
      createUserMessage('Message 1'),
      createUserMessage('Message 2')
    ];

    // Should not call if under minimum threshold
    expect(manager.shouldCallScoreKeeper(conversation)).toBe(false);
  });
});
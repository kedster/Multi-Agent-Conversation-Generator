import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationModerator } from '../../utils/conversationModerator';
import type { Agent, MonitorScore, Message } from '../../types';

describe('ConversationModerator', () => {
  let moderator: ConversationModerator;
  let testAgents: Agent[];
  let testConversation: Message[];

  beforeEach(() => {
    testAgents = [
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
    
    testConversation = [
      {
        agentId: 'user',
        agentName: 'User',
        text: 'Hello everyone!',
        color: '#000',
        isUser: true
      },
      {
        agentId: 'agent-1',
        agentName: 'Alex Morgan',
        text: 'Hi there!',
        color: '#3b82f6'
      }
    ];
    
    moderator = new ConversationModerator(testAgents);
  });

  describe('Initialization', () => {
    it('should initialize with correct agents', () => {
      const state = moderator.getState();
      
      expect(state.cumulativeScores).toHaveProperty('agent-1');
      expect(state.cumulativeScores).toHaveProperty('agent-2');
      expect(state.cumulativeScores).toHaveProperty('agent-3');
      
      expect(state.skippedTurns).toHaveProperty('agent-1');
      expect(state.skippedTurns).toHaveProperty('agent-2');
      expect(state.skippedTurns).toHaveProperty('agent-3');
    });

    it('should start with zero scores and skipped turns', () => {
      const state = moderator.getState();
      
      expect(state.cumulativeScores['agent-1']).toEqual({
        agentId: 'agent-1',
        relevance: 0,
        context: 0
      });
      
      expect(state.skippedTurns['agent-1']).toBe(0);
    });
  });

  describe('Speaker Selection', () => {
    it('should select the most relevant speaker', () => {
      const turnScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 8, context: 5 },
        { agentId: 'agent-2', relevance: 6, context: 4 },
        { agentId: 'agent-3', relevance: 5, context: 6 }
      ];

      const result = moderator.selectSpeakers(turnScores, testConversation, 'What should we do next?');
      
      expect(result.speaker1Id).toBe('agent-1');
      expect(result.mentionedAgents).toEqual([]);
    });

    it('should prioritize mentioned agents', () => {
      const turnScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 8, context: 5 },
        { agentId: 'agent-2', relevance: 4, context: 4 },
        { agentId: 'agent-3', relevance: 5, context: 6 }
      ];

      const result = moderator.selectSpeakers(turnScores, testConversation, 'Brenda, what do you think?');
      
      expect(result.speaker1Id).toBe('agent-2'); // Brenda mentioned
      expect(result.mentionedAgents).toContain('agent-2');
    });

    it('should select two speakers when conditions are met', () => {
      const turnScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 8, context: 5 },
        { agentId: 'agent-2', relevance: 7, context: 4 }, // High relevance >= 6
        { agentId: 'agent-3', relevance: 5, context: 6 }
      ];

      const result = moderator.selectSpeakers(turnScores, testConversation, 'What should we do?');
      
      expect(result.speaker1Id).toBe('agent-1');
      expect(result.speaker2Id).toBe('agent-2');
    });

    it('should handle forced speakers (>=2 skipped turns)', () => {
      // Set up a situation where agent-3 has been skipped
      moderator.setState(
        moderator.getState().cumulativeScores,
        { 'agent-1': 0, 'agent-2': 1, 'agent-3': 2 } // agent-3 forced
      );

      const turnScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 8, context: 5 },
        { agentId: 'agent-2', relevance: 6, context: 4 },
        { agentId: 'agent-3', relevance: 4, context: 3 } // Lower relevance but forced
      ];

      const result = moderator.selectSpeakers(turnScores, testConversation, 'Let\'s continue');
      
      expect(result.speaker1Id).toBe('agent-3'); // Forced speaker gets priority
    });
  });

  describe('Turn Processing', () => {
    it('should process a complete turn and update state', () => {
      const turnScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 7, context: 5 },
        { agentId: 'agent-2', relevance: 5, context: 4 }, // Below 6, won't be second speaker
        { agentId: 'agent-3', relevance: 4, context: 6 }
      ];

      // Use a clean conversation without agent-1 as recent speaker
      const cleanConversation: Message[] = [
        {
          agentId: 'user',
          agentName: 'User',
          text: 'What should we do next?',
          color: '#000',
          isUser: true
        }
      ];

      const result = moderator.processTurn(turnScores, cleanConversation, 'What should we do next?');
      
      expect(result.speaker1Id).toBe('agent-1');
      expect(result.speaker2Id).toBeUndefined(); // No second speaker
      expect(result.cumulativeScores['agent-1'].relevance).toBe(7);
      expect(result.skippedTurns['agent-1']).toBe(0); // Speaker's skip count reset
      expect(result.skippedTurns['agent-2']).toBe(1); // Non-speaker incremented
      expect(result.skippedTurns['agent-3']).toBe(1); // Non-speaker incremented
    });

    it('should handle dual speakers correctly in state updates', () => {
      const turnScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 8, context: 5 },
        { agentId: 'agent-2', relevance: 7, context: 4 },
        { agentId: 'agent-3', relevance: 5, context: 6 }
      ];

      const result = moderator.processTurn(turnScores, testConversation, 'Alex and Brenda, what do you think?');
      
      // Both mentioned agents should be selected
      expect(result.speaker1Id).toBe('agent-1');
      expect(result.speaker2Id).toBe('agent-2');
      
      // Both speakers should have reset skip counts
      expect(result.skippedTurns['agent-1']).toBe(0);
      expect(result.skippedTurns['agent-2']).toBe(0);
      expect(result.skippedTurns['agent-3']).toBe(1); // Only non-speaker incremented
    });
  });

  describe('Score Calculation', () => {
    it('should calculate total scores correctly', () => {
      const currentScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 7, context: 5 }
      ];

      // Set some cumulative scores
      moderator.setState(
        { 'agent-1': { agentId: 'agent-1', relevance: 10, context: 8 }, 
          'agent-2': { agentId: 'agent-2', relevance: 0, context: 0 },
          'agent-3': { agentId: 'agent-3', relevance: 0, context: 0 } },
        moderator.getState().skippedTurns
      );

      const totalScore = moderator.calculateTotalScore('agent-1', currentScores);
      
      // Should be (10 + 8) + (7 + 5) = 30
      expect(totalScore).toBe(30);
    });

    it('should return 0 for missing agent scores', () => {
      const currentScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 7, context: 5 }
      ];

      const totalScore = moderator.calculateTotalScore('agent-2', currentScores);
      expect(totalScore).toBe(0);
    });
  });

  describe('State Management', () => {
    it('should reset state correctly', () => {
      // First, modify the state
      const turnScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 7, context: 5 }
      ];
      moderator.processTurn(turnScores, testConversation, 'Test message');
      
      // Verify state was modified
      const modifiedState = moderator.getState();
      expect(modifiedState.cumulativeScores['agent-1'].relevance).toBe(7);
      
      // Reset and verify
      moderator.reset();
      const resetState = moderator.getState();
      expect(resetState.cumulativeScores['agent-1'].relevance).toBe(0);
      expect(resetState.skippedTurns['agent-1']).toBe(0);
    });

    it('should set and get state correctly', () => {
      const newCumulativeScores = {
        'agent-1': { agentId: 'agent-1', relevance: 15, context: 10 },
        'agent-2': { agentId: 'agent-2', relevance: 8, context: 6 },
        'agent-3': { agentId: 'agent-3', relevance: 12, context: 9 }
      };
      const newSkippedTurns = { 'agent-1': 1, 'agent-2': 0, 'agent-3': 2 };
      
      moderator.setState(newCumulativeScores, newSkippedTurns);
      const state = moderator.getState();
      
      expect(state.cumulativeScores).toEqual(newCumulativeScores);
      expect(state.skippedTurns).toEqual(newSkippedTurns);
    });
  });
});
import { describe, it, expect, vi } from 'vitest';
import type { Agent, Message, MonitorScore } from '../../types';

describe('Agent Scoring System Integration', () => {
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

  const sampleConversation: Message[] = [
    {
      agentId: 'user',
      agentName: 'TestUser',
      text: 'What should we focus on for the frontend architecture?',
      color: '#7dd3fc',
      isUser: true
    },
    {
      agentId: 'agent-1',
      agentName: 'Alex Morgan',
      text: 'We should prioritize component reusability and performance.',
      color: '#3b82f6'
    }
  ];

  describe('Score Calculation and Accumulation', () => {
    it('should calculate total score correctly', () => {
      const calculateTotalScore = (
        agentId: string, 
        currentScores: MonitorScore[], 
        cumulativeScores: Record<string, MonitorScore>
      ) => {
        const currentScore = currentScores.find(s => s.agentId === agentId);
        const cumulative = cumulativeScores[agentId] || { agentId, relevance: 0, context: 0 };
        
        if (!currentScore) return 0;
        
        return (cumulative.relevance + cumulative.context) + (currentScore.relevance + currentScore.context);
      };

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
      const calculateTotalScore = (
        agentId: string, 
        currentScores: MonitorScore[], 
        cumulativeScores: Record<string, MonitorScore>
      ) => {
        const currentScore = currentScores.find(s => s.agentId === agentId);
        const cumulative = cumulativeScores[agentId] || { agentId, relevance: 0, context: 0 };
        
        if (!currentScore) return 0;
        
        return (cumulative.relevance + cumulative.context) + (currentScore.relevance + currentScore.context);
      };

      const currentScores: MonitorScore[] = [
        { agentId: 'agent-1', relevance: 7, context: 5 }
      ];

      const cumulativeScores: Record<string, MonitorScore> = {};

      // Should return 0 for missing agent
      const totalScore = calculateTotalScore('agent-2', currentScores, cumulativeScores);
      expect(totalScore).toBe(0);
    });

    it('should initialize cumulative scores correctly', () => {
      const initializeCumulativeScores = (agents: Agent[]): Record<string, MonitorScore> => {
        return Object.fromEntries(
          agents.map(agent => [agent.id, { agentId: agent.id, relevance: 0, context: 0 }])
        );
      };

      const cumulativeScores = initializeCumulativeScores(testAgents);

      expect(cumulativeScores).toHaveProperty('agent-1');
      expect(cumulativeScores).toHaveProperty('agent-2');  
      expect(cumulativeScores).toHaveProperty('agent-3');
      
      expect(cumulativeScores['agent-1']).toEqual({
        agentId: 'agent-1',
        relevance: 0,
        context: 0
      });
    });

    it('should update cumulative scores correctly', () => {
      const updateCumulativeScores = (
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
  });

  describe('Skipped Turns Management', () => {
    it('should initialize skipped turns correctly', () => {
      const initializeSkippedTurns = (agents: Agent[]): Record<string, number> => {
        return Object.fromEntries(agents.map(a => [a.id, 0]));
      };

      const skippedTurns = initializeSkippedTurns(testAgents);

      expect(skippedTurns).toHaveProperty('agent-1');
      expect(skippedTurns).toHaveProperty('agent-2');
      expect(skippedTurns).toHaveProperty('agent-3');
      
      expect(skippedTurns['agent-1']).toBe(0);
      expect(skippedTurns['agent-2']).toBe(0);
      expect(skippedTurns['agent-3']).toBe(0);
    });

    it('should update skipped turns correctly after speaker selection', () => {
      const updateSkippedTurns = (
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
      const updateSkippedTurns = (
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

      const initialSkipped = {
        'agent-1': 1,
        'agent-2': 3,
        'agent-3': 2
      };

      const speakerIds = ['agent-1', 'agent-3']; // Both speak

      const updatedSkipped = updateSkippedTurns(initialSkipped, testAgents, speakerIds);

      expect(updatedSkipped['agent-1']).toBe(0); // Reset (speaker)
      expect(updatedSkipped['agent-2']).toBe(4); // Incremented
      expect(updatedSkipped['agent-3']).toBe(0); // Reset (speaker)
    });
  });

  describe('Conversation Analysis Integration', () => {
    it('should format conversation history correctly', () => {
      const formatConversationHistory = (conversation: Message[], userName: string): string => {
        if (conversation.length === 0) return "The conversation has not started yet.";
        
        const filteredConversation = conversation.filter(msg => !msg.text.startsWith('*Starts with the context:'));
        return filteredConversation.map(msg => 
          msg.isUser ? `${userName}: ${msg.text}` : `${msg.agentName}: ${msg.text}`
        ).join('\n');
      };

      const formattedHistory = formatConversationHistory(sampleConversation, 'TestUser');

      const expected = "TestUser: What should we focus on for the frontend architecture?\n" +
                     "Alex Morgan: We should prioritize component reusability and performance.";

      expect(formattedHistory).toBe(expected);
    });

    it('should handle empty conversation', () => {
      const formatConversationHistory = (conversation: Message[], userName: string): string => {
        if (conversation.length === 0) return "The conversation has not started yet.";
        
        const filteredConversation = conversation.filter(msg => !msg.text.startsWith('*Starts with the context:'));
        return filteredConversation.map(msg => 
          msg.isUser ? `${userName}: ${msg.text}` : `${msg.agentName}: ${msg.text}`
        ).join('\n');
      };

      const formattedHistory = formatConversationHistory([], 'TestUser');
      expect(formattedHistory).toBe("The conversation has not started yet.");
    });

    it('should filter out context messages', () => {
      const formatConversationHistory = (conversation: Message[], userName: string): string => {
        if (conversation.length === 0) return "The conversation has not started yet.";
        
        const filteredConversation = conversation.filter(msg => !msg.text.startsWith('*Starts with the context:'));
        return filteredConversation.map(msg => 
          msg.isUser ? `${userName}: ${msg.text}` : `${msg.agentName}: ${msg.text}`
        ).join('\n');
      };

      const conversationWithContext: Message[] = [
        {
          agentId: 'system',
          agentName: 'System',
          text: '*Starts with the context: Initial setup',
          color: '#gray'
        },
        ...sampleConversation
      ];

      const formattedHistory = formatConversationHistory(conversationWithContext, 'TestUser');

      // Should not include the context message
      expect(formattedHistory).not.toContain('*Starts with the context:');
      expect(formattedHistory).toContain('TestUser: What should we focus on');
    });

    it('should format agent profiles correctly', () => {
      const formatAgentProfiles = (agents: Agent[]): string => {
        return agents.map(agent => 
          `Agent ID: ${agent.id}\nName: ${agent.name}\nRole: ${agent.role}`
        ).join('\n\n');
      };

      const agentProfiles = formatAgentProfiles(testAgents.slice(0, 2));

      expect(agentProfiles).toContain('Agent ID: agent-1');
      expect(agentProfiles).toContain('Name: Alex Morgan');
      expect(agentProfiles).toContain('Role: Frontend Engineer');
      expect(agentProfiles).toContain('Agent ID: agent-2');
      expect(agentProfiles).toContain('Name: Brenda Chen');
      expect(agentProfiles).toContain('Role: Backend Engineer');
    });
  });

  describe('Monitor Decision Validation', () => {
    it('should validate monitor decision structure', () => {
      const isValidMonitorDecision = (decision: any): boolean => {
        return (
          decision &&
          Array.isArray(decision.scores) &&
          typeof decision.reasoning === 'string' &&
          typeof decision.nextSpeakerAgentId === 'string' &&
          decision.scores.every((score: any) => 
            typeof score.agentId === 'string' &&
            typeof score.relevance === 'number' &&
            typeof score.context === 'number' &&
            score.relevance >= 1 && score.relevance <= 10 &&
            score.context >= 1 && score.context <= 10
          )
        );
      };

      const validDecision = {
        scores: [
          { agentId: 'agent-1', relevance: 7, context: 5 },
          { agentId: 'agent-2', relevance: 6, context: 8 }
        ],
        reasoning: 'Agent-1 has relevant frontend expertise',
        nextSpeakerAgentId: 'agent-1'
      };

      expect(isValidMonitorDecision(validDecision)).toBe(true);

      const invalidDecision = {
        scores: [
          { agentId: 'agent-1', relevance: 11, context: 5 } // Invalid relevance
        ],
        reasoning: 'Test',
        nextSpeakerAgentId: 'agent-1'
      };

      expect(isValidMonitorDecision(invalidDecision)).toBe(false);
    });

    it('should handle missing monitor decision gracefully', () => {
      const isValidMonitorDecision = (decision: any): boolean => {
        if (!decision) return false;
        return (
          Array.isArray(decision.scores) &&
          typeof decision.reasoning === 'string' &&
          typeof decision.nextSpeakerAgentId === 'string'
        );
      };

      expect(isValidMonitorDecision(null)).toBe(false);
      expect(isValidMonitorDecision(undefined)).toBe(false);
      expect(isValidMonitorDecision({})).toBe(false);
    });
  });
});
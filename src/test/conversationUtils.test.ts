import { describe, it, expect } from 'vitest';
import { detectMentionedAgents, shouldAgentSpeak } from '../../utils/conversationUtils';
import type { Agent } from '../../types';

describe('conversationUtils', () => {
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

  describe('detectMentionedAgents', () => {
    it('should detect direct name mentions', () => {
      const userMessage = "Alex, what do you think about this approach?";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-1');
      expect(mentionedAgents).toHaveLength(1);
    });

    it('should detect full name mentions', () => {
      const userMessage = "I agree with Alex Morgan on this point";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-1');
    });

    it('should detect multiple agent mentions', () => {
      const userMessage = "Alex and Brenda, could you both weigh in?";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-1');
      expect(mentionedAgents).toContain('agent-2');
      expect(mentionedAgents).toHaveLength(2);
    });

    it('should detect role-based mentions', () => {
      const userMessage = "I need the frontend engineer to review this";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-1');
    });

    it('should detect specific role callouts', () => {
      const userMessage = "The backend engineer should handle the API";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-2');
    });

    it('should detect call-out phrases', () => {
      const userMessage = "Hey Alex, what are your thoughts?";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-1');
    });

    it('should detect @ mentions', () => {
      const userMessage = "@Carlos please prioritize this feature";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-3');
    });

    it('should detect comma-separated mentions', () => {
      const userMessage = "Carlos, can you help with product specs?";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-3');
    });

    it('should not detect partial word matches', () => {
      const userMessage = "I alexed the configuration file";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).not.toContain('agent-1');
    });

    it('should handle case insensitive matching', () => {
      const userMessage = "alex and BRENDA should collaborate";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toContain('agent-1');
      expect(mentionedAgents).toContain('agent-2');
    });

    it('should return empty array when no agents mentioned', () => {
      const userMessage = "This is a general comment about the project";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toHaveLength(0);
    });

    it('should handle empty message', () => {
      const userMessage = "";
      const mentionedAgents = detectMentionedAgents(userMessage, testAgents);
      expect(mentionedAgents).toHaveLength(0);
    });

    it('should ignore short names (less than 3 characters)', () => {
      const shortNameAgent: Agent = {
        id: 'agent-short',
        name: 'Al Smith',
        role: 'Tester',
        startingContext: 'Test agent',
        color: '#000000'
      };
      const userMessage = "Al is working on this";
      const mentionedAgents = detectMentionedAgents(userMessage, [shortNameAgent]);
      expect(mentionedAgents).toHaveLength(0);
    });
  });

  describe('shouldAgentSpeak', () => {
    it('should return true when relevance meets minimum threshold', () => {
      expect(shouldAgentSpeak(4, 4)).toBe(true);
      expect(shouldAgentSpeak(5, 4)).toBe(true);
      expect(shouldAgentSpeak(10, 4)).toBe(true);
    });

    it('should return false when relevance is below threshold', () => {
      expect(shouldAgentSpeak(3, 4)).toBe(false);
      expect(shouldAgentSpeak(1, 4)).toBe(false);
      expect(shouldAgentSpeak(0, 4)).toBe(false);
    });

    it('should use default threshold of 4 when not specified', () => {
      expect(shouldAgentSpeak(4)).toBe(true);
      expect(shouldAgentSpeak(3)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(shouldAgentSpeak(-1, 0)).toBe(false);
      expect(shouldAgentSpeak(0, 0)).toBe(true);
      expect(shouldAgentSpeak(Number.MAX_VALUE, 5)).toBe(true);
    });

    it('should work with different threshold values', () => {
      expect(shouldAgentSpeak(5, 6)).toBe(false);
      expect(shouldAgentSpeak(6, 6)).toBe(true);
      expect(shouldAgentSpeak(2, 1)).toBe(true);
    });
  });
});
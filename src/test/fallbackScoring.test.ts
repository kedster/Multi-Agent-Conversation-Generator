import { describe, it, expect } from 'vitest';
import { generateFallbackScores } from '../../utils/fallbackScoring';
import type { Agent, Message, MonitorScore } from '../../types';

describe('FallbackScoring', () => {
  const mockAgents: Agent[] = [
    {
      id: 'frontend',
      name: 'Alex Frontend Engineer',
      role: 'Frontend Engineer specializing in React and TypeScript',
      startingContext: 'Frontend context',
      color: '#blue'
    },
    {
      id: 'backend',
      name: 'Brenda Backend Engineer', 
      role: 'Backend Engineer specializing in databases and APIs',
      startingContext: 'Backend context',
      color: '#green'
    },
    {
      id: 'devops',
      name: 'Charles SRE/DevOps',
      role: 'DevOps Engineer specializing in infrastructure',
      startingContext: 'DevOps context',
      color: '#red'
    }
  ];

  const mockCumulativeScores: Record<string, MonitorScore> = {
    frontend: { agentId: 'frontend', relevance: 5, context: 4 },
    backend: { agentId: 'backend', relevance: 6, context: 5 },
    devops: { agentId: 'devops', relevance: 4, context: 3 }
  };

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

  it('should boost backend agent relevance for database-related queries', () => {
    const conversation = [createUserMessage('What database should we use for this project?')];
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    const backendAgent = result.scores.find(s => s.agentId === 'backend');
    const frontendAgent = result.scores.find(s => s.agentId === 'frontend');
    
    expect(backendAgent!.relevance).toBeGreaterThan(frontendAgent!.relevance);
    expect(result.nextSpeakerAgentId).toBe('backend');
  });

  it('should boost frontend agent relevance for UI-related queries', () => {
    const conversation = [createUserMessage('How should we structure our React components?')];
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    const frontendAgent = result.scores.find(s => s.agentId === 'frontend');
    const backendAgent = result.scores.find(s => s.agentId === 'backend');
    
    expect(frontendAgent!.relevance).toBeGreaterThan(backendAgent!.relevance);
    expect(result.nextSpeakerAgentId).toBe('frontend');
  });

  it('should boost DevOps agent relevance for infrastructure queries', () => {
    const conversation = [createUserMessage('How should we set up our deployment pipeline?')];
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    const devopsAgent = result.scores.find(s => s.agentId === 'devops');
    const backendAgent = result.scores.find(s => s.agentId === 'backend');
    
    expect(devopsAgent!.relevance).toBeGreaterThan(backendAgent!.relevance);
    expect(result.nextSpeakerAgentId).toBe('devops');
  });

  it('should penalize agents who have spoken recently', () => {
    const conversation = [
      createUserMessage('Initial question'),
      createAgentMessage('backend', 'Backend response 1'),
      createAgentMessage('backend', 'Backend response 2'),
      createUserMessage('What about databases?')
    ];
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    const backendAgent = result.scores.find(s => s.agentId === 'backend');
    
    // Backend agent should be penalized for speaking too recently
    expect(backendAgent!.relevance).toBeLessThan(9); // Should be reduced from base + boost
  });

  it('should boost agents mentioned by name', () => {
    const conversation = [createUserMessage('Alex, what do you think about the frontend architecture?')];
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    const frontendAgent = result.scores.find(s => s.agentId === 'frontend');
    
    // Should get both frontend keyword boost and name mention boost
    expect(frontendAgent!.relevance).toBeGreaterThanOrEqual(9); // Base 4 + keyword 5 + mention 2 = 11, capped at 10
    expect(result.nextSpeakerAgentId).toBe('frontend');
  });

  it('should return all agent scores', () => {
    const conversation = [createUserMessage('General question about the project')];
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    expect(result.scores).toHaveLength(mockAgents.length);
    expect(result.scores.every(s => s.agentId && s.relevance && s.context)).toBe(true);
  });

  it('should include reasoning in the result', () => {
    const conversation = [createUserMessage('What database should we use?')];
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    expect(result.reasoning).toContain('Fallback scoring');
    expect(result.reasoning).toContain('Brenda Backend Engineer');
    expect(result.reasoning.length).toBeGreaterThan(20);
  });

  it('should handle empty conversation gracefully', () => {
    const conversation: Message[] = [];
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    expect(result.scores).toHaveLength(mockAgents.length);
    expect(result.nextSpeakerAgentId).toBeDefined();
    expect(result.reasoning).toBeDefined();
  });

  it('should respect score caps', () => {
    const conversation = [createUserMessage('backend database api optimization')]; // Multiple backend keywords
    
    const result = generateFallbackScores(conversation, mockAgents, 'TestUser', mockCumulativeScores);
    
    const backendAgent = result.scores.find(s => s.agentId === 'backend');
    
    // Even with multiple boosts, should be capped at 10
    expect(backendAgent!.relevance).toBeLessThanOrEqual(10);
    expect(backendAgent!.context).toBeLessThanOrEqual(10);
  });
});
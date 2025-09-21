import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveAgentConfiguration, getSavedConfigurations, deleteAgentConfiguration, updateAgentConfiguration } from '../../utils/agentConfigUtils';
import type { Agent } from '../../types';

const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Test Agent 1',
    role: 'Developer',
    startingContext: 'Working on frontend',
    color: '#3b82f6'
  },
  {
    id: 'agent-2', 
    name: 'Test Agent 2',
    role: 'Designer',
    startingContext: 'Designing UI',
    color: '#10b981'
  }
];

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-123')
  }
});

describe('AgentConfigUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveAgentConfiguration', () => {
    it('should save a new configuration', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const mockDate = '2024-01-01T00:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      const result = saveAgentConfiguration('Test Config', mockAgents);

      expect(result).toEqual({
        id: 'test-uuid-123',
        name: 'Test Config',
        agents: mockAgents,
        createdAt: mockDate,
        updatedAt: mockDate,
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'agent-configurations',
        JSON.stringify([result])
      );
    });

    it('should add to existing configurations', () => {
      const existingConfig = {
        id: 'existing-1',
        name: 'Existing Config',
        agents: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([existingConfig]));
      
      const result = saveAgentConfiguration('New Config', mockAgents);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'agent-configurations',
        JSON.stringify([existingConfig, result])
      );
    });

    it('should trim whitespace from configuration name', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = saveAgentConfiguration('  Test Config  ', mockAgents);
      
      expect(result.name).toBe('Test Config');
    });
  });

  describe('getSavedConfigurations', () => {
    it('should return empty array when no configurations exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getSavedConfigurations();
      
      expect(result).toEqual([]);
    });

    it('should return parsed configurations', () => {
      const mockConfigs = [
        {
          id: 'config-1',
          name: 'Config 1',
          agents: mockAgents,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfigs));
      
      const result = getSavedConfigurations();
      
      expect(result).toEqual(mockConfigs);
    });

    it('should return empty array on parse error', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = getSavedConfigurations();
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading saved configurations:', expect.any(Error));
    });
  });

  describe('deleteAgentConfiguration', () => {
    it('should remove configuration by id', () => {
      const configs = [
        { id: 'config-1', name: 'Config 1', agents: [], createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
        { id: 'config-2', name: 'Config 2', agents: [], createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(configs));
      
      deleteAgentConfiguration('config-1');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'agent-configurations',
        JSON.stringify([configs[1]])
      );
    });
  });

  describe('updateAgentConfiguration', () => {
    it('should update existing configuration', () => {
      const configs = [
        {
          id: 'config-1',
          name: 'Old Name',
          agents: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(configs));
      const mockDate = '2024-01-02T00:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
      
      const result = updateAgentConfiguration('config-1', 'New Name', mockAgents);
      
      expect(result).toEqual({
        id: 'config-1',
        name: 'New Name',
        agents: mockAgents,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: mockDate,
      });
    });

    it('should return null for non-existent configuration', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      
      const result = updateAgentConfiguration('non-existent', 'New Name', mockAgents);
      
      expect(result).toBe(null);
    });
  });
});
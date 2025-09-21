import type { Agent, AgentConfiguration } from '../types';

const STORAGE_KEY = 'agent-configurations';

export const saveAgentConfiguration = (name: string, agents: Agent[]): AgentConfiguration => {
  const configurations = getSavedConfigurations();
  const timestamp = new Date().toISOString();
  
  const newConfig: AgentConfiguration = {
    id: crypto.randomUUID(),
    name: name.trim(),
    agents: agents.map(agent => ({ ...agent })), // Deep copy
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  
  const updatedConfigs = [...configurations, newConfig];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfigs));
  
  return newConfig;
};

export const getSavedConfigurations = (): AgentConfiguration[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading saved configurations:', error);
    return [];
  }
};

export const deleteAgentConfiguration = (id: string): void => {
  const configurations = getSavedConfigurations();
  const updatedConfigs = configurations.filter(config => config.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfigs));
};

export const updateAgentConfiguration = (id: string, name: string, agents: Agent[]): AgentConfiguration | null => {
  const configurations = getSavedConfigurations();
  const configIndex = configurations.findIndex(config => config.id === id);
  
  if (configIndex === -1) {
    return null;
  }
  
  const updatedConfig: AgentConfiguration = {
    ...configurations[configIndex],
    name: name.trim(),
    agents: agents.map(agent => ({ ...agent })), // Deep copy
    updatedAt: new Date().toISOString(),
  };
  
  configurations[configIndex] = updatedConfig;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configurations));
  
  return updatedConfig;
};
import React, { useState, useEffect } from 'react';
import type { Agent, Service, AgentConfiguration } from '../types';
import { DEFAULT_SERVICES } from '../constants';
import { ArrowLeftIcon } from './icons';
import { saveAgentConfiguration, getSavedConfigurations, deleteAgentConfiguration } from '../utils/agentConfigUtils';

interface SetupScreenProps {
  service: Service;
  onStartSimulation: (agents: Agent[], name: string) => void;
  onBack: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ service, onStartSimulation, onBack }) => {
  const [agents, setAgents] = useState<Agent[]>(service.agents);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(service.id);
  const [userName, setUserName] = useState<string>('');
  const [savedConfigurations, setSavedConfigurations] = useState<AgentConfiguration[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [showLoadDialog, setShowLoadDialog] = useState<boolean>(false);
  const [configName, setConfigName] = useState<string>('');

  useEffect(() => {
    const newService = DEFAULT_SERVICES.find(s => s.id === selectedServiceId);
    if (newService) {
        setAgents(newService.agents);
    }
  }, [selectedServiceId]);

  useEffect(() => {
    setSavedConfigurations(getSavedConfigurations());
  }, []);


  const handleAgentChange = (index: number, field: keyof Agent, value: string) => {
    const updatedAgents = [...agents];
    updatedAgents[index] = { ...updatedAgents[index], [field]: value };
    setAgents(updatedAgents);
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedServiceId(e.target.value);
  };

  const handleSaveConfiguration = () => {
    if (!configName.trim()) {
      alert('Please enter a name for the configuration.');
      return;
    }
    
    try {
      saveAgentConfiguration(configName, agents);
      setSavedConfigurations(getSavedConfigurations());
      setConfigName('');
      setShowSaveDialog(false);
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration. Please try again.');
    }
  };

  const handleLoadConfiguration = (config: AgentConfiguration) => {
    setAgents(config.agents.map(agent => ({ ...agent }))); // Deep copy
    setShowLoadDialog(false);
  };

  const handleDeleteConfiguration = (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      try {
        deleteAgentConfiguration(id);
        setSavedConfigurations(getSavedConfigurations());
      } catch (error) {
        console.error('Error deleting configuration:', error);
        alert('Error deleting configuration. Please try again.');
      }
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors">
        <ArrowLeftIcon />
        Back to Scenarios
      </button>

      <header className="mb-8">
        <h1 className="text-4xl font-extrabold mb-2">Configure Agents</h1>
        <p className="text-gray-400">Customize the agents for your conversation simulation.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
            <label htmlFor="service-select" className="block text-sm font-medium text-gray-300 mb-2">Conversation Theme</label>
            <select 
              id="service-select" 
              value={selectedServiceId} 
              onChange={handleServiceChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                {DEFAULT_SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>
        <div>
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
            <input
              id="user-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>
      </div>

      {/* Configuration Management Section */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Agent Configuration Management</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Save Current Configuration
          </button>
          <button
            onClick={() => setShowLoadDialog(true)}
            disabled={savedConfigurations.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Load Saved Configuration ({savedConfigurations.length})
          </button>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Save Agent Configuration</h3>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Enter configuration name..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleSaveConfiguration()}
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveConfiguration}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setShowSaveDialog(false); setConfigName(''); }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 border border-gray-700 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Load Saved Configuration</h3>
            {savedConfigurations.length === 0 ? (
              <p className="text-gray-400 mb-4">No saved configurations found.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {savedConfigurations.map((config) => (
                  <div key={config.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{config.name}</h4>
                        <p className="text-sm text-gray-400">
                          {config.agents.length} agents • Created: {new Date(config.createdAt).toLocaleDateString()}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          Agents: {config.agents.map(a => a.name).join(', ')}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleLoadConfiguration(config)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteConfiguration(config.id)}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowLoadDialog(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {agents.map((agent, index) => (
          <div key={agent.id} className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
            <div className="flex items-center mb-4">
               <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: agent.color }}></div>
               <h3 className="text-xl font-bold">{`Agent ${index + 1}`}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor={`name-${index}`} className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  id={`name-${index}`}
                  value={agent.name}
                  onChange={(e) => handleAgentChange(index, 'name', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor={`role-${index}`} className="block text-sm font-medium text-gray-300 mb-1">Role / Personality</label>
                <textarea
                  id={`role-${index}`}
                  rows={3}
                  value={agent.role}
                  onChange={(e) => handleAgentChange(index, 'role', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor={`context-${index}`} className="block text-sm font-medium text-gray-300 mb-1">Starting Context</label>
                <textarea
                  id={`context-${index}`}
                  rows={2}
                  value={agent.startingContext}
                  onChange={(e) => handleAgentChange(index, 'startingContext', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => onStartSimulation(agents, userName)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Start Simulation
        </button>
      </div>
    </div>
  );
};

export default SetupScreen;
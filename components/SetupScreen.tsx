import React, { useState, useEffect } from 'react';
import type { Agent, Service } from '../types';
import { DEFAULT_SERVICES } from '../constants';
import { ArrowLeftIcon } from './icons';

interface SetupScreenProps {
  service: Service;
  onStartSimulation: (agents: Agent[], name: string) => void;
  onBack: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ service, onStartSimulation, onBack }) => {
  const [agents, setAgents] = useState<Agent[]>(service.agents);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(service.id);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const newService = DEFAULT_SERVICES.find(s => s.id === selectedServiceId);
    if (newService) {
        setAgents(newService.agents);
    }
  }, [selectedServiceId]);


  const handleAgentChange = (index: number, field: keyof Agent, value: string) => {
    const updatedAgents = [...agents];
    updatedAgents[index] = { ...updatedAgents[index], [field]: value };
    setAgents(updatedAgents);
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedServiceId(e.target.value);
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
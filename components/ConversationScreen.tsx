import React, { useState, useEffect, useRef } from 'react';
import type { Agent, Message, MonitorScore, Service } from '../types';
import { getNextSpeaker, getAgentResponse } from '../services';
import { UserIcon, SendIcon, FileExportIcon } from './icons';

interface ConversationScreenProps {
  agents: Agent[];
  initialConversation: Message[];
  onEndConversation: (conversation: Message[]) => void;
  userName: string;
  service: Service;
}

const ConversationScreen: React.FC<ConversationScreenProps> = ({ agents, initialConversation, onEndConversation, userName }) => {
  const [conversation, setConversation] = useState<Message[]>(initialConversation);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Your turn. Start the conversation!');
  const [cumulativeScores, setCumulativeScores] = useState<Record<string, MonitorScore>>(() =>
    Object.fromEntries(
      agents.map(agent => [agent.id, { agentId: agent.id, relevance: 0, context: 0 }])
    )
  );
  const [skippedTurns, setSkippedTurns] = useState<Record<string, number>>(() =>
    Object.fromEntries(agents.map(a => [a.id, 0]))
  );
  const [nextAgentId, setNextAgentId] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: Message = {
      agentId: 'user',
      agentName: userName,
      text: userInput,
      color: '#7dd3fc', // light blue
      isUser: true,
    };
    
    const conversationAfterUser = [...conversation, userMessage];
    setConversation(conversationAfterUser);
    setUserInput('');
    setIsLoading(true);

    try {
        let agent1Id: string | undefined;
        let agent2Id: string | undefined;
        let turnScores: MonitorScore[] = [];

        // 1. "Fair Turn" Logic: Check if any agent must speak
        const forcedAgentId = agents.find(a => skippedTurns[a.id] >= 2)?.id;

        if (forcedAgentId) {
            agent1Id = forcedAgentId;
            const agent1 = agents.find(a => a.id === agent1Id);
            setStatusMessage(`Monitor is giving ${agent1?.name} a chance to speak...`);
            // Monitor decides the *second* speaker
            const monitorDecision = await getNextSpeaker(conversationAfterUser, agents, userName);
             if (!monitorDecision || !monitorDecision.nextSpeakerAgentId || !monitorDecision.scores) {
                throw new Error("Invalid response from monitor agent.");
            }
            agent2Id = monitorDecision.nextSpeakerAgentId;
            turnScores = monitorDecision.scores;
        } else {
            // 2. Normal Logic: Monitor decides both speakers
            setStatusMessage('Monitor is analyzing the conversation...');
            const monitorDecision = await getNextSpeaker(conversationAfterUser, agents, userName);
            if (!monitorDecision || !monitorDecision.nextSpeakerAgentId || !monitorDecision.scores) {
                throw new Error("Invalid response from monitor agent.");
            }
            agent1Id = monitorDecision.nextSpeakerAgentId;
            agent2Id = monitorDecision.scores
                .filter(s => s.agentId !== agent1Id)
                .sort((a, b) => (b.relevance + b.context) - (a.relevance + a.context))[0]?.agentId;
            turnScores = monitorDecision.scores;
        }

      if (!agent1Id || !agent2Id) {
          throw new Error("Could not determine agents to speak.");
      }
      
      const agent1 = agents.find(a => a.id === agent1Id);
      const agent2 = agents.find(a => a.id === agent2Id);

      if (!agent1 || !agent2) {
          throw new Error("Invalid agent selected by the monitor.");
      }

      // 3. Update scores and turn counters
      setCumulativeScores(prevScores => {
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
      });
      
      setSkippedTurns(prevSkipped => {
          const newSkipped = { ...prevSkipped };
          agents.forEach(agent => {
              if (agent.id === agent1Id || agent.id === agent2Id) {
                  newSkipped[agent.id] = 0;
              } else {
                  newSkipped[agent.id]++;
              }
          });
          return newSkipped;
      });


      // 4. First agent generates a response
      setNextAgentId(agent1Id);
      setStatusMessage(`${agent1.name} is thinking...`);
      const response1Text = await getAgentResponse(conversationAfterUser, agents, agent1Id, userName);
      
      const agent1Message: Message = {
        agentId: agent1.id, agentName: agent1.name, text: response1Text, color: agent1.color,
      };
      const conversationAfterAgent1 = [...conversationAfterUser, agent1Message];
      setConversation(conversationAfterAgent1);

      // 5. Second agent generates a response
      setNextAgentId(agent2Id);
      setStatusMessage(`${agent2.name} is thinking...`);
      const response2Text = await getAgentResponse(conversationAfterAgent1, agents, agent2Id, userName);

       const agent2Message: Message = {
        agentId: agent2.id, agentName: agent2.name, text: response2Text, color: agent2.color,
      };
      setConversation(prev => [...prev, agent2Message]);

    } catch (error) {
      const errorMessage: Message = {
          agentId: 'system',
          agentName: 'System',
          text: `An error occurred: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
          color: '#ef4444'
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStatusMessage('Your turn to speak.');
      setNextAgentId(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-6 animate-fade-in">
      {/* Main Chat Panel */}
      <div className="flex flex-col flex-1 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Conversation Simulation</h2>
        </header>
        <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
          {conversation.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.isUser ? 'justify-end' : ''}`}>
               {!msg.isUser && <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: msg.color }}></div>}
               <div className={`max-w-md p-3 rounded-lg ${msg.isUser ? 'bg-blue-800 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                <p className="font-bold text-sm mb-1" style={{ color: msg.isUser ? '#a5f3fc' : msg.color }}>{msg.agentName}</p>
                <p className="text-white whitespace-pre-wrap">{msg.text}</p>
               </div>
               {msg.isUser && <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 mt-1 flex items-center justify-center"><UserIcon /></div>}
            </div>
          ))}
           {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1 bg-gray-700 animate-pulse" style={{ backgroundColor: agents.find(a=> a.id === nextAgentId)?.color }}></div>
              <div className="max-w-md p-3 rounded-lg bg-gray-700 rounded-bl-none">
                <div className="h-4 w-24 bg-gray-600 rounded animate-pulse mb-2"></div>
                <div className="h-3 w-48 bg-gray-600 rounded animate-pulse"></div>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleUserSubmit} className="p-4 border-t border-gray-700 flex items-center gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={isLoading ? "Agents are responding..." : `Speak as ${userName}...`}
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
            disabled={isLoading}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled={isLoading || !userInput.trim()}>
            <SendIcon />
          </button>
        </form>
      </div>

      {/* Side Panel */}
      <aside className="w-full md:w-80 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6 flex flex-col gap-6">
        <div>
          <h3 className="text-lg font-bold mb-3">Simulation Control</h3>
          <div className="flex gap-2">
            <button onClick={() => onEndConversation(conversation)} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 font-bold py-2 px-4 rounded-lg transition-colors">
                <FileExportIcon /> End & Export
            </button>
          </div>
        </div>
        <div>
            <h3 className="text-lg font-bold mb-3">Status</h3>
            <div className="bg-gray-900 p-3 rounded-lg">
                <p className="text-sm text-gray-300">{statusMessage}</p>
                {isLoading && <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2"><div className="bg-blue-500 h-1.5 rounded-full animate-pulse"></div></div>}
            </div>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-3">Monitor Scores (Cumulative)</h3>
          <div className="space-y-3">
            {agents.map(agent => {
              const score = cumulativeScores[agent.id];
              const skipped = skippedTurns[agent.id];
              const isNext = agent.id === nextAgentId;
              return (
                <div key={agent.id} className={`p-3 rounded-lg transition-all duration-300 ${isNext ? 'bg-blue-900/50 ring-2 ring-blue-500' : 'bg-gray-900'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm" style={{ color: agent.color }}>{agent.name}</span>
                    {isNext && <span className="text-xs font-bold text-blue-400">SPEAKING</span>}
                  </div>
                  <div className="text-xs space-y-1 text-gray-400">
                    <p>Total Relevance: {score?.relevance ?? 0}</p>
                    <p>Total Context: {score?.context ?? 0}</p>
                    <p>Skipped Turns: {skipped ?? 0}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ConversationScreen;
import React, { useState, useEffect, useRef } from 'react';
import type { Agent, Message, MonitorScore, Service } from '../types';
import { getNextSpeaker, getAgentResponse } from '../services';
import { UserIcon, SendIcon, FileExportIcon } from './icons';
import { detectMentionedAgents, shouldAgentSpeak } from '../utils/conversationUtils';

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
  const [mentionedAgents, setMentionedAgents] = useState<string[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Function to calculate total score for an agent
  const calculateTotalScore = (agentId: string, currentScores: MonitorScore[], cumulativeScores: Record<string, MonitorScore>) => {
    const currentScore = currentScores.find(s => s.agentId === agentId);
    const cumulative = cumulativeScores[agentId] || { agentId, relevance: 0, context: 0 };
    
    if (!currentScore) return 0;
    
    // Total score = (cumulative relevance + context) + (current relevance + context)
    return (cumulative.relevance + cumulative.context) + (currentScore.relevance + currentScore.context);
  };

  // Function to determine the speakers with highest relevance (1-2 speakers based on relevance)
  const selectTopSpeakers = (
    scores: MonitorScore[], 
    agents: Agent[], 
    cumulativeScores: Record<string, MonitorScore>,
    skippedTurns: Record<string, number>,
    lastSpeakerIds: string[],
    mentionedAgentIds: string[]
  ): [string, string?] => {
    // Calculate relevance-focused scores for all agents
    const agentScores = agents.map(agent => {
      const currentScore = scores.find(s => s.agentId === agent.id);
      if (!currentScore) return null;
      
      const isMentioned = mentionedAgentIds.includes(agent.id);
      const isForced = skippedTurns[agent.id] >= 2;
      const wasRecentSpeaker = lastSpeakerIds.includes(agent.id);
      
      // Current relevance is the primary factor (80%), with context as secondary (20%)
      const primaryScore = (currentScore.relevance * 0.8) + (currentScore.context * 0.2);
      
      return {
        agentId: agent.id,
        primaryScore,
        currentRelevance: currentScore.relevance,
        isMentioned,
        isForced,
        wasRecentSpeaker,
        // Agent can speak if: mentioned (rel>=3), forced (rel>=3), or high relevance (rel>=5)
        canSpeak: isMentioned || isForced || currentScore.relevance >= 5
      };
    }).filter(Boolean);

    // Sort by: 1) mentioned first, 2) forced second, 3) by relevance score, 4) avoid recent speakers
    agentScores.sort((a, b) => {
      // Mentioned agents get absolute priority
      if (a.isMentioned && !b.isMentioned) return -1;
      if (!a.isMentioned && b.isMentioned) return 1;
      
      // Then forced speakers
      if (a.isForced && !b.isForced) return -1;
      if (!a.isForced && b.isForced) return 1;
      
      // Then by current relevance (most important factor)
      if (Math.abs(a.currentRelevance - b.currentRelevance) >= 1) {
        return b.currentRelevance - a.currentRelevance;
      }
      
      // Prefer agents who weren't recent speakers
      if (a.wasRecentSpeaker && !b.wasRecentSpeaker) return 1;
      if (!a.wasRecentSpeaker && b.wasRecentSpeaker) return -1;
      
      // Finally by primary score
      return b.primaryScore - a.primaryScore;
    });
    
    // Filter to agents that can speak
    const eligibleSpeakers = agentScores.filter(agent => agent.canSpeak);
    
    // If no one is eligible, allow the most relevant agent
    const finalCandidates = eligibleSpeakers.length > 0 ? eligibleSpeakers : agentScores.slice(0, 1);
    
    const speaker1 = finalCandidates[0]?.agentId || agents[0].id;
    
    // Select second speaker only if they're highly relevant (>=6) or mentioned/forced
    let speaker2: string | undefined;
    if (finalCandidates.length > 1) {
      const candidate2 = finalCandidates[1];
      if (candidate2.isMentioned || candidate2.isForced || candidate2.currentRelevance >= 6) {
        speaker2 = candidate2.agentId;
      }
    }
    
    return [speaker1, speaker2];
  };

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
    
    // Detect if user mentioned any specific agents
    const newMentionedAgents = detectMentionedAgents(userInput, agents);
    setMentionedAgents(newMentionedAgents);
    
    setUserInput('');
    setIsLoading(true);

    try {
      // Get the last 2 speakers to prevent succession
      const lastSpeakers = conversationAfterUser
        .filter(msg => !msg.isUser)
        .slice(-2)
        .map(msg => msg.agentId);

      // 1. Monitor analyzes conversation and scores all agents
      setStatusMessage('Monitor is analyzing conversation context...');
      const monitorDecision = await getNextSpeaker(
        conversationAfterUser, 
        agents, 
        userName, 
        undefined, // agentToExcludeId - not used in our new system
        cumulativeScores,
        skippedTurns
      );

      if (!monitorDecision || !monitorDecision.scores) {
        throw new Error("Invalid response from monitor agent.");
      }

      const turnScores = monitorDecision.scores;

      // 2. Determine the speakers with highest relevance (1-2 speakers)
      const [speaker1Id, speaker2Id] = selectTopSpeakers(
        turnScores,
        agents,
        cumulativeScores,
        skippedTurns,
        lastSpeakers,
        newMentionedAgents
      );

      const speaker1 = agents.find(a => a.id === speaker1Id);
      const speaker2 = speaker2Id ? agents.find(a => a.id === speaker2Id) : null;
      
      if (!speaker1) {
        throw new Error("Could not determine primary speaker.");
      }

      // 3. Update cumulative scores
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

      // 4. Update skipped turns
      setSkippedTurns(prevSkipped => {
        const newSkipped = { ...prevSkipped };
        agents.forEach(agent => {
          if (agent.id === speaker1Id || agent.id === speaker2Id) {
            newSkipped[agent.id] = 0; // Reset for speakers
          } else {
            newSkipped[agent.id]++; // Increment for others
          }
        });
        return newSkipped;
      });

      // 5. Generate responses (single or dual based on selection)
      setNextAgentId(speaker1Id);
      
      if (speaker2) {
        setStatusMessage(`${speaker1.name} and ${speaker2.name} are thinking...`);
        
        // Parallel API calls for both agents to maintain separate context
        const [response1, response2] = await Promise.all([
          getAgentResponse(conversationAfterUser, agents, speaker1Id, userName),
          getAgentResponse(conversationAfterUser, agents, speaker2Id, userName)
        ]);
        
        const speaker1Message: Message = {
          agentId: speaker1.id,
          agentName: speaker1.name,
          text: response1,
          color: speaker1.color,
        };
        
        const speaker2Message: Message = {
          agentId: speaker2.id,
          agentName: speaker2.name,
          text: response2,
          color: speaker2.color,
        };
        
        // Add both messages to conversation
        setConversation(prev => [...prev, speaker1Message, speaker2Message]);
      } else {
        // Single speaker response
        setStatusMessage(`${speaker1.name} is thinking...`);
        
        const response1 = await getAgentResponse(conversationAfterUser, agents, speaker1Id, userName);
        
        const speaker1Message: Message = {
          agentId: speaker1.id,
          agentName: speaker1.name,
          text: response1,
          color: speaker1.color,
        };
        
        // Add single message to conversation
        setConversation(prev => [...prev, speaker1Message]);
      }

      // Clear mentioned agents after they've been processed
      setMentionedAgents([]);

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
              const isMentioned = mentionedAgents.includes(agent.id);
              return (
                <div key={agent.id} className={`p-3 rounded-lg transition-all duration-300 ${
                  isNext ? 'bg-blue-900/50 ring-2 ring-blue-500' : 
                  isMentioned ? 'bg-purple-900/50 ring-2 ring-purple-500' :
                  'bg-gray-900'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm" style={{ color: agent.color }}>{agent.name}</span>
                    <div className="flex gap-2">
                      {isNext && <span className="text-xs font-bold text-blue-400">SPEAKING</span>}
                      {isMentioned && <span className="text-xs font-bold text-purple-400">MENTIONED</span>}
                    </div>
                  </div>
                  <div className="text-xs space-y-1 text-gray-400">
                    <p>Total Relevance: {score?.relevance ?? 0}</p>
                    <p>Total Context: {score?.context ?? 0}</p>
                    <p>Combined Score: {(score?.relevance ?? 0) + (score?.context ?? 0)}</p>
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
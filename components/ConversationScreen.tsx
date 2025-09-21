import React, { useState, useEffect, useRef } from 'react';
import type { Agent, Message, MonitorScore, Service, AgentTokenStats } from '../types';
import { getNextSpeaker, getAgentResponseWithTokens } from '../services';
import { UserIcon, SendIcon, FileExportIcon } from './icons';
import { detectMentionedAgents, shouldAgentSpeak, selectTopSpeakers } from '../utils/conversationUtils';
import { globalTokenTracker } from '../utils/tokenTracker';
import { globalCheckpointManager, CHECKPOINT_CONFIG } from '../utils/checkpointManager';
import { generateFallbackScores } from '../utils/fallbackScoring';
import TokenUsageDisplay from './TokenUsageDisplay';

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
  const [tokenStats, setTokenStats] = useState<AgentTokenStats[]>([]);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Update token statistics
  const updateTokenStats = () => {
    const stats = globalTokenTracker.getAllStats();
    const totalCostValue = globalTokenTracker.getTotalCost();
    const totalTokensValue = globalTokenTracker.getTotalTokens();
    
    setTokenStats(stats);
    setTotalCost(totalCostValue);
    setTotalTokens(totalTokensValue);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Reset checkpoint manager when conversation is reset
  useEffect(() => {
    globalCheckpointManager.reset();
  }, [initialConversation]);

  // Function to calculate total score for an agent
  const calculateTotalScore = (agentId: string, currentScores: MonitorScore[], cumulativeScores: Record<string, MonitorScore>) => {
    const currentScore = currentScores.find(s => s.agentId === agentId);
    const cumulative = cumulativeScores[agentId] || { agentId, relevance: 0, context: 0 };
    
    if (!currentScore) return 0;
    
    // Total score = (cumulative relevance + context) + (current relevance + context)
    return (cumulative.relevance + cumulative.context) + (currentScore.relevance + currentScore.context);
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

      // 1. Check if we should use ScoreKeeper (checkpoint-based) or fallback scoring
      const shouldUseScoreKeeper = globalCheckpointManager.shouldCallScoreKeeper(conversationAfterUser, false);
      let monitorDecision;
      
      if (shouldUseScoreKeeper) {
        // Use ScoreKeeper at checkpoints
        setStatusMessage('Monitor is analyzing conversation context...');
        monitorDecision = await getNextSpeaker(
          conversationAfterUser, 
          agents, 
          userName, 
          undefined, // agentToExcludeId - not used in our new system
          cumulativeScores,
          skippedTurns
        );

        // Track ScoreKeeper token usage if available
        if (monitorDecision.tokenUsage) {
          globalTokenTracker.trackUsage('scorekeeper', 'ScoreKeeper', monitorDecision.tokenUsage);
          updateTokenStats();
        }
      } else {
        // Use fallback scoring for cost efficiency
        setStatusMessage('Using cached scoring for efficiency...');
        const fallbackResult = generateFallbackScores(conversationAfterUser, agents, userName, cumulativeScores);
        monitorDecision = {
          scores: fallbackResult.scores,
          reasoning: fallbackResult.reasoning,
          nextSpeakerAgentId: fallbackResult.nextSpeakerAgentId
        };
      }

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
        const [result1, result2] = await Promise.all([
          getAgentResponseWithTokens(conversationAfterUser, agents, speaker1Id, userName),
          getAgentResponseWithTokens(conversationAfterUser, agents, speaker2Id, userName)
        ]);
        
        // Track token usage for both agents
        globalTokenTracker.trackUsage(speaker1.id, speaker1.name, result1.tokenUsage);
        globalTokenTracker.trackUsage(speaker2.id, speaker2.name, result2.tokenUsage);
        
        const speaker1Message: Message = {
          agentId: speaker1.id,
          agentName: speaker1.name,
          text: result1.response,
          color: speaker1.color,
          tokenUsage: result1.tokenUsage,
        };
        
        const speaker2Message: Message = {
          agentId: speaker2.id,
          agentName: speaker2.name,
          text: result2.response,
          color: speaker2.color,
          tokenUsage: result2.tokenUsage,
        };
        
        // Add both messages to conversation
        setConversation(prev => [...prev, speaker1Message, speaker2Message]);
        
        // Update token statistics
        updateTokenStats();
      } else {
        // Single speaker response
        setStatusMessage(`${speaker1.name} is thinking...`);
        
        const result1 = await getAgentResponseWithTokens(conversationAfterUser, agents, speaker1Id, userName);
        
        // Track token usage
        globalTokenTracker.trackUsage(speaker1.id, speaker1.name, result1.tokenUsage);
        
        const speaker1Message: Message = {
          agentId: speaker1.id,
          agentName: speaker1.name,
          text: result1.response,
          color: speaker1.color,
          tokenUsage: result1.tokenUsage,
        };
        
        // Add single message to conversation
        setConversation(prev => [...prev, speaker1Message]);
        
        // Update token statistics  
        updateTokenStats();
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
        
        {/* Token Usage Display */}
        <TokenUsageDisplay
          agentStats={tokenStats}
          totalCost={totalCost}
          totalTokens={totalTokens}
          className="compact"
        />
        
        {/* Checkpoint Status Display */}
        <div className="bg-gray-900 p-3 rounded-lg">
          <h4 className="text-sm font-bold mb-2 text-yellow-400">⚡ Cost Optimization</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <div>ScoreKeeper: Every {CHECKPOINT_CONFIG.scoreKeeperInterval || 'turn'}</div>
            <div>ReportBot: {CHECKPOINT_CONFIG.reportBotInterval === 0 ? 'End only' : `Every ${CHECKPOINT_CONFIG.reportBotInterval}`}</div>
            <div className="text-green-400">
              💰 Reduces API costs by ~{Math.round((1 - 1/Math.max(1, CHECKPOINT_CONFIG.scoreKeeperInterval || 1)) * 100)}%
            </div>
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
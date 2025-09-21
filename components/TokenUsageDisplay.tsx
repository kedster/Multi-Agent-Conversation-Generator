import React from 'react';
import type { AgentTokenStats } from '../types';
import { formatCost } from '../utils/tokenTracker';

interface TokenUsageDisplayProps {
  agentStats: AgentTokenStats[];
  totalCost: number;
  totalTokens: number;
  className?: string;
}

export const TokenUsageDisplay: React.FC<TokenUsageDisplayProps> = ({
  agentStats,
  totalCost,
  totalTokens,
  className = ''
}) => {
  // Sort agents by cost, highest first
  const sortedStats = [...agentStats].sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className={`token-usage-display ${className}`}>
      <div className="token-usage-header">
        <h4>💰 API Usage</h4>
        <div className="total-cost">
          Total: {totalTokens} tokens ({formatCost(totalCost)})
        </div>
      </div>
      
      <div className="agent-token-stats">
        {sortedStats.map((stat) => (
          <div key={stat.agentId} className="agent-token-row">
            <div className="agent-name">{stat.agentName}</div>
            <div className="agent-tokens">
              {stat.totalTokens} tokens
            </div>
            <div className="agent-cost">
              {formatCost(stat.totalCost)}
            </div>
            <div className="agent-calls">
              {stat.callCount} calls
            </div>
          </div>
        ))}
        
        {sortedStats.length === 0 && (
          <div className="no-usage">No API calls yet</div>
        )}
      </div>

      <style jsx>{`
        .token-usage-display {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .token-usage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }

        .token-usage-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
        }

        .total-cost {
          font-size: 14px;
          font-weight: 600;
          color: #059669;
        }

        .agent-token-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .agent-token-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 80px;
          gap: 12px;
          align-items: center;
          padding: 8px;
          background: white;
          border-radius: 4px;
          font-size: 13px;
        }

        .agent-name {
          font-weight: 500;
          color: #374151;
        }

        .agent-tokens {
          color: #6b7280;
          text-align: right;
        }

        .agent-cost {
          color: #059669;
          font-weight: 500;
          text-align: right;
        }

        .agent-calls {
          color: #9ca3af;
          font-size: 12px;
          text-align: right;
        }

        .no-usage {
          text-align: center;
          color: #9ca3af;
          font-style: italic;
          padding: 12px;
        }

        .token-usage-display.compact {
          padding: 12px;
          margin: 8px 0;
        }

        .token-usage-display.compact .token-usage-header h4 {
          font-size: 13px;
        }

        .token-usage-display.compact .total-cost {
          font-size: 13px;
        }

        .token-usage-display.compact .agent-token-row {
          padding: 6px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default TokenUsageDisplay;
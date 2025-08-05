import React from 'react';
import { useGameState } from './GameStateContext';

const APIStatus = () => {
  const { apiStatus, currentGameId } = useGameState();

  if (!apiStatus.connected && !apiStatus.loading) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-sm">
        <div className="flex items-center">
          <span className="font-bold">⚠️ API Disconnected</span>
          <span className="ml-2">Running in offline mode</span>
        </div>
        {apiStatus.error && (
          <div className="text-xs mt-1">Error: {apiStatus.error}</div>
        )}
      </div>
    );
  }

  if (apiStatus.loading) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 text-sm">
        <div className="flex items-center">
          <span className="animate-spin mr-2">⏳</span>
          <span>Connecting to Game API...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="font-bold">✅ API Connected</span>
          {currentGameId && (
            <span className="ml-2">Game #{currentGameId}</span>
          )}
        </div>
        <div className="flex items-center text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
          Live
        </div>
      </div>
    </div>
  );
};

export default APIStatus;

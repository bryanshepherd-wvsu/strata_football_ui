import { useState, useEffect } from 'react';
import GameAPI from '../services/GameAPI';

export const useGameAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRequest = async (requestFn) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await requestFn();
      setIsLoading(false);
      return result;
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      throw error;
    }
  };

  return {
    isLoading,
    error,
    handleRequest,
    // Direct API methods
    getCurrentGameId: () => handleRequest(() => GameAPI.getCurrentGameId()),
    loadGameState: (gameId) => handleRequest(() => GameAPI.loadGameState(gameId)),
    submitPlay: (gameId, playObject) => handleRequest(() => GameAPI.submitPlay(gameId, playObject)),
    getTeamMetadata: (gameId) => handleRequest(() => GameAPI.getTeamMetadata(gameId)),
    loadStats: (gameId) => handleRequest(() => GameAPI.loadStats(gameId)),
    whoami: () => handleRequest(() => GameAPI.whoami()),
  };
};

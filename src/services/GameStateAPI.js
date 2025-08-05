import GameAPI from './GameAPI';

export class GameStateAPI {
  // Enhanced API-connected game loading with better error handling
  static async loadGameFromAPI(gameId, gameState, setGameState, setPlayLog, setTeamMetadata, setGameConfig, setCurrentGameId, setApiStatus, generatePlayDescription) {
    try {
      console.log(`🔄 Starting to load game #${gameId}...`);
      setApiStatus(prev => ({ ...prev, loading: true, error: null }));

      console.log(`📡 Fetching game state for game #${gameId}...`);
      const gameStateData = await GameAPI.loadGameState(gameId);
      console.log('✅ Received game state data:', gameStateData);
      
      if (gameStateData && gameStateData.gameState) {
        // Merge API data with default structure to ensure all fields exist
        const mergedGameState = {
          ...gameState, // Start with defaults
          ...gameStateData.gameState, // Override with API data
          // Ensure critical nested objects exist
          timeouts: { H: 3, V: 3, ...gameStateData.gameState?.timeouts },
          challenges: { H: false, V: false, ...gameStateData.gameState?.challenges },
          score: { H: 0, V: 0, ...gameStateData.gameState?.score },
          scoresByQuarter: { H: [0, 0, 0, 0], V: [0, 0, 0, 0], ...gameStateData.gameState?.scoresByQuarter },
          teamStats: { H: {}, V: {}, ...gameStateData.gameState?.teamStats },
          topPlayers: { H: {}, V: {}, ...gameStateData.gameState?.topPlayers },
          totalPlays: { H: 0, V: 0, ...gameStateData.gameState?.totalPlays },
          totalYards: { H: 0, V: 0, ...gameStateData.gameState?.totalYards },
          turnovers: { H: 0, V: 0, ...gameStateData.gameState?.turnovers }
        };
        
        console.log('🔄 Setting merged game state...');
        setGameState(mergedGameState);
        
        // Load play log
        if (gameStateData.playLog && Array.isArray(gameStateData.playLog)) {
          console.log(`📜 Loading ${gameStateData.playLog.length} plays from log...`);
          setPlayLog(gameStateData.playLog);
          
          // Generate previousPlays from playLog
          const previousPlays = gameStateData.playLog
            .map(play => generatePlayDescription(play))
            .slice(-15);
          
          setGameState(prev => ({
            ...prev,
            previousPlays: previousPlays
          }));
        } else {
          console.log('📜 No play log found, starting with empty log');
          setPlayLog([]);
        }

        // Update game config from rules
        if (gameStateData.gameRules) {
          console.log('⚙️ Updating game config from rules...');
          setGameConfig(prev => ({
            ...prev,
            challengesEnabled: gameStateData.gameRules.challengesEnabled === true || gameStateData.gameRules.challengesEnabled === "1",
            gameLevel: gameStateData.gameRules.gameLevel || 'HS',
          }));
        }
      } else {
        console.warn('⚠️ No valid game state returned, using defaults');
      }

      // Load team metadata
      console.log(`👥 Loading team metadata for game #${gameId}...`);
      try {
        const teamData = await GameAPI.getTeamMetadata(gameId);
        if (teamData) {
          console.log('✅ Loaded team metadata:', teamData);
          setTeamMetadata(teamData);
        }
      } catch (teamError) {
        console.warn('⚠️ Failed to load team metadata:', teamError);
      }

      // Load stats
      console.log(`📊 Loading stats for game #${gameId}...`);
      try {
        const statsData = await GameAPI.loadStats(gameId);
        if (statsData) {
          console.log('✅ Loaded stats data:', statsData);
          // Update team stats in game state
          setGameState(prev => ({
            ...prev,
            teamStats: statsData.teamStats || prev.teamStats,
            topPlayers: statsData.topPlayers || prev.topPlayers
          }));
        }
      } catch (statsError) {
        console.warn('⚠️ Failed to load stats:', statsError);
      }

      setCurrentGameId(gameId);
      setApiStatus(prev => ({ ...prev, loading: false, error: null }));
      console.log(`✅ Successfully loaded game #${gameId}`);
      
    } catch (error) {
      console.error(`❌ Error loading game #${gameId}:`, error);
      setApiStatus(prev => ({ 
        ...prev, 
        loading: false, 
        error: `Failed to load game #${gameId}: ${error.message}` 
      }));
      throw error;
    }
  }

  // Enhanced API-connected play submission
  static async submitPlayToAPI(currentGameId, playData, gameState, setGameState, setPlayLog, generatePlayDescription, calculateNewContext) {
    if (!currentGameId) {
      console.error('No current game ID for play submission');
      return false;
    }

    try {
      console.log('Submitting play to API:', playData);
      
      // Add playContext and newContext to the play data
      const enrichedPlayData = {
        ...playData,
        playContext: `${gameState.possession},${gameState.down},${gameState.distance},${gameState.spot}`,
        newContext: calculateNewContext(playData)
      };
      
      console.log('Enriched play data with context:', enrichedPlayData);
      
      const response = await GameAPI.submitPlay(currentGameId, enrichedPlayData);
      
      if (response.error) {
        console.error("API error:", response.error);
        return false;
      }

      console.log('API response received:', response);

      // Update local state with API response
      if (response.gameState) {
        console.log('Updating game state from API response');
        
        const mergedGameState = {
          ...gameState,
          ...response.gameState,
          coinTossData: gameState.coinTossData,
          previousPlays: gameState.previousPlays || []
        };
        
        setGameState(mergedGameState);
      }

      if (response.playLog && Array.isArray(response.playLog)) {
        console.log('Updating play log from API response:', response.playLog.length, 'plays');
        setPlayLog(response.playLog);
        
        const previousPlays = response.playLog
          .map(play => generatePlayDescription(play))
          .slice(-15);
        
        setGameState(prev => ({
          ...prev,
          previousPlays: previousPlays
        }));
      }

      if (response.stats) {
        console.log('Updating stats from API response');
        setGameState(prev => ({
          ...prev,
          teamStats: response.stats.teamStats || prev.teamStats,
          topPlayers: response.stats.topPlayers || prev.topPlayers
        }));
      }

      return true;
    } catch (error) {
      console.error('Error submitting play to API:', error);
      return false;
    }
  }
}

import React, { createContext, useState, useContext, useEffect } from 'react';
import GameAPI from '../services/GameAPI';

const GameStateContext = createContext();

export const GameStateProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    quarter: 1,
    clock: "15:00",
    possession: "H",
    down: 1,
    distance: 10,
    spot: "H35",
    score: { H: 0, V: 0 },
    scoresByQuarter: { H: [0, 0, 0, 0], V: [0, 0, 0, 0] },
    previousPlays: [],
    timeouts: { H: 3, V: 3 },
    challenges: { H: false, V: false },
    teamStats: { H: {}, V: {} },
    topPlayers: { H: {}, V: {} },
    Home: { abbreviation: 'HOME' },
    Visitor: { abbreviation: 'VIS' },
    // Enhanced fields
    driveNumber: 0, // Start at 0 - kickoffs don't count as drives
    driveStart: null, // No drive until first offensive possession
    drivePlays: 0,
    driveYards: 0,
    driveTime: '0:00',
    totalPlays: { H: 0, V: 0 },
    totalYards: { H: 0, V: 0 },
    turnovers: { H: 0, V: 0 },
    drives: [],
    gamePhase: 'KICKOFF' // Track game phase: 'KICKOFF', 'DRIVE', 'CHANGE_OF_POSSESSION'
  });

  const [teamMetadata, setTeamMetadata] = useState({
    Home: { name: 'Home Team', shortname: 'Home', abbreviation: 'HOME', logo: '' },
    Visitor: { name: 'Visitor Team', shortname: 'Visitor', abbreviation: 'VIS', logo: '' }
  });

  const [gameConfig, setGameConfig] = useState({ 
    autoClock: false, 
    challengesEnabled: false,
    advancedStats: true,
    realTimeUpdates: false,
    fieldDirectionSet: false,
    initialAttackDirection: null, // 'LEFT' or 'RIGHT'
    gameLevel: 'HS' // 'HS' or 'NCAA' - affects touchback spots
  });

  const [playLog, setPlayLog] = useState([]);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [apiStatus, setApiStatus] = useState({
    connected: false,
    loading: false,
    error: null
  });

  // Initialize API connection and user session
  useEffect(() => {
    const initializeAPI = async () => {
      setApiStatus(prev => ({ ...prev, loading: true }));
      
      try {
        // Get user ID from session
        const userData = await GameAPI.whoami();
        if (userData.user_id) {
          sessionStorage.setItem('UserID', userData.user_id);
          console.log("✅ Set UserID from API:", userData.user_id);
        }

        // Get current game and load initial data
        const gameData = await GameAPI.getCurrentGameId();
        if (gameData && gameData.GameID) {
          await loadGameFromAPI(gameData.GameID);
        }

        setApiStatus({ connected: true, loading: false, error: null });
      } catch (error) {
        console.error("API initialization failed:", error);
        setApiStatus({ connected: false, loading: false, error: error.message });
      }
    };

    initializeAPI();
  }, []);

  // Enhanced API-connected game loading with better error handling
  const loadGameFromAPI = async (gameId) => {
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
  };

  // Enhanced API-connected play submission
  const submitPlayToAPI = async (playData) => {
    if (!currentGameId) {
      console.error('No current game ID for play submission');
      return false;
    }

    try {
      console.log('Submitting play to API:', playData);
      
      // REPLACEMENT HANDLING: Check if this is a replacement play
      if (playData.isReplacement) {
        console.log('Processing play replacement:', playData);
        
        try {
          // First delete the original play
          const deleteResponse = await GameAPI.deletePlay(currentGameId, playData.replacedActualIndex + 1);
          
          if (!deleteResponse.success) {
            throw new Error('Failed to delete original play for replacement');
          }
          
          // Update local state with the deletion response
          if (deleteResponse.gameState) {
            setGameState(deleteResponse.gameState);
          }
          if (deleteResponse.playLog) {
            setPlayLog(deleteResponse.playLog);
          }
          
          // Clean the replacement metadata from the play data
          const cleanPlayData = { ...playData };
          delete cleanPlayData.isReplacement;
          delete cleanPlayData.replacedPlayIndex;
          delete cleanPlayData.replacedSection;
          delete cleanPlayData.replacedActualIndex;
          
          // Now submit the new play
          const submitResponse = await GameAPI.submitPlay(currentGameId, cleanPlayData);
          
          if (submitResponse.error) {
            throw new Error('Failed to submit replacement play: ' + submitResponse.error);
          }
          
          console.log('✅ Play replacement completed successfully');
          
          // Process the submission response normally
          return processAPIResponse(submitResponse);
          
        } catch (error) {
          console.error('❌ Play replacement failed:', error);
          alert(`Play replacement failed: ${error.message}`);
          return false;
        }
      }
      
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

      return processAPIResponse(response);
    } catch (error) {
      console.error('Error submitting play to API:', error);
      return false;
    }
  };

  // Helper function to process API responses consistently
  const processAPIResponse = (response) => {
    console.log('API response received:', response);

    // CRITICAL: Ensure game state update preserves coin toss data and applies possession changes
    if (response.gameState) {
      console.log('Updating game state from API response');
      
      // Merge API data with current state, preserving important frontend state
      const mergedGameState = {
        ...gameState, // Start with current state
        ...response.gameState, // Apply API updates
        // Preserve important frontend-only state
        coinTossData: response.gameState.coinTossData || gameState.coinTossData,
        fieldDirection: response.gameState.fieldDirection || gameState.fieldDirection,
        gameSetupComplete: response.gameState.gameSetupComplete || gameState.gameSetupComplete,
        // Ensure critical nested objects exist with proper defaults
        timeouts: { 
          H: gameConfig.timeoutsPerHalf || 3, 
          V: gameConfig.timeoutsPerHalf || 3, 
          ...response.gameState.timeouts 
        },
        challenges: { H: false, V: false, ...response.gameState.challenges },
        score: { H: 0, V: 0, ...response.gameState.score },
        scoresByQuarter: { H: [0, 0, 0, 0], V: [0, 0, 0, 0], ...response.gameState.scoresByQuarter },
        teamStats: { H: {}, V: {}, ...response.gameState.teamStats },
        topPlayers: { H: {}, V: {}, ...response.gameState.topPlayers },
        totalPlays: { H: 0, V: 0, ...response.gameState.totalPlays },
        totalYards: { H: 0, V: 0, ...response.gameState.totalYards },
        turnovers: { H: 0, V: 0, ...response.gameState.turnovers },
        // Preserve UI state
        previousPlays: gameState.previousPlays || []
      };
      
      console.log('MERGED GAME STATE:', {
        oldPossession: gameState.possession,
        newPossession: mergedGameState.possession,
        oldSpot: gameState.spot,
        newSpot: mergedGameState.spot,
        oldDriveNumber: gameState.driveNumber,
        newDriveNumber: mergedGameState.driveNumber,
        timeouts: mergedGameState.timeouts
      });
      
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
        teamStats: response.stats.teams || prev.teamStats,
        topPlayers: response.stats.topPlayers || prev.topPlayers
      }));
    }

    return true;
  };

  // Helper function to calculate new context after play
  const calculateNewContext = (playData) => {
    // Start with current game state, ensuring non-null values
    let newPossession = gameState.possession || 'H';
    let newDown = gameState.down || 1;
    let newDistance = gameState.distance || 10;
    let newSpot = playData.spot || gameState.spot || 'H35';

    // Calculate new context based on play type and results
    if (playData.playType === 'kickoff') {
      newPossession = playData.receivingTeam;
      newDown = 1;
      newDistance = 10;
      newSpot = playData.finalSpot || playData.spot;
    } else if (playData.playType === 'rush' || playData.playType === 'pass') {
      if (playData.spot && gameState.spot) {
        const yardsGained = calculateYardsGained(gameState.spot, playData.spot, gameState.possession);
        
        if (yardsGained >= gameState.distance) {
          newDown = 1;
          newDistance = 10;
        } else {
          newDown = gameState.down + 1;
          newDistance = Math.max(0, gameState.distance - yardsGained);
          
          if (newDown > 4) {
            newPossession = gameState.possession === 'H' ? 'V' : 'H';
            newDown = 1;
            newDistance = 10;
          }
        }
      }
    } else if (playData.isTurnover) {
      newPossession = playData.recoveryTeam || (gameState.possession === 'H' ? 'V' : 'H');
      newDown = 1;
      newDistance = 10;
    } else if (playData.playType === 'penalty' && playData.enforcement) {
      newSpot = playData.spot;
      if (playData.enforcement.automaticFirstDown) {
        newDown = 1;
        newDistance = 10;
      } else if (playData.enforcement.lossOfDown) {
        newDown = Math.min(4, gameState.down + 1);
      }
    }

    // Ensure we never return null values
    return `${newPossession || 'H'},${newDown || 1},${newDistance || 10},${newSpot || 'H35'}`;
  };

  // Enhanced submit function that uses API when available
  const submitPlay = async (playData) => {
    try {
      console.log('GameStateContext - Submitting play:', playData);
      
      // Special handling for coin toss: don't send to API until field direction is set
      if (playData.controlType === 'coin_toss') {
        console.log('Coin toss detected - processing locally only');
        const updatedGameState = processPlay(playData);
        setGameState(updatedGameState);
        
        const playDescription = generatePlayDescription(playData);
        setPlayLog(prev => [...prev, { ...playData, description: playDescription, timestamp: new Date() }]);
        
        return true;
      }

      // Try API submission first if connected
      if (apiStatus.connected && currentGameId) {
        console.log('Submitting to API...');
        const success = await submitPlayToAPI(playData);
        if (success) {
          console.log('✅ API submission successful, data updated from API response');
          return true;
        } else {
          console.log('⚠️ API submission failed, falling back to local processing');
        }
      }

      // Fallback to local processing
      console.log('Processing play locally...');
      const updatedGameState = processPlay(playData);
      setGameState(updatedGameState);
      
      const playDescription = generatePlayDescription(playData);
      setPlayLog(prev => [...prev, { ...playData, description: playDescription, timestamp: new Date() }]);
      
      setGameState(prev => ({
        ...prev,
        previousPlays: [...(prev.previousPlays || []), playDescription].slice(-15)
      }));

      return true;
    } catch (error) {
      console.error('Error submitting play:', error);
      return false;
    }
  };

  // Periodic lock refresh for current game
  useEffect(() => {
    if (!currentGameId || !sessionStorage.getItem('UserID') || !apiStatus.connected) return;

    const interval = setInterval(async () => {
      try {
        await GameAPI.refreshLock(currentGameId, sessionStorage.getItem('UserID'));
      } catch (error) {
        console.error('Lock refresh failed:', error);
      }
    }, 2 * 60 * 1000); // every 2 minutes

    return () => clearInterval(interval);
  }, [currentGameId, apiStatus.connected]);

  // Helper function to calculate yards gained/lost from spot change
  const calculateYardsGained = (fromSpot, toSpot, possession) => {
    if (!fromSpot || !toSpot) return 0;
    
    const fromSide = fromSpot[0];
    const fromYard = parseInt(fromSpot.slice(1));
    const toSide = toSpot[0];
    const toYard = parseInt(toSpot.slice(1));
    
    // Calculate actual field position (0-100 scale)
    const fromFieldPos = fromSide === 'H' ? fromYard : (100 - fromYard);
    const toFieldPos = toSide === 'H' ? toYard : (100 - toYard);
    
    // For the possessing team, positive yardage means moving toward opponent's goal
    const yardageChange = toFieldPos - fromFieldPos;
    
    // If possession is H, positive change is good; if V, negative change is good
    return possession === 'H' ? yardageChange : -yardageChange;
  };

  // Helper function to update down and distance
  const updateDownAndDistance = (currentState, playData) => {
    let newDown = currentState.down || 1;
    let newDistance = currentState.distance || 10;
    let newSpot = playData.spot || currentState.spot || 'H35';
    
    // Only do calculations if we have valid starting values
    if (playData.spot && currentState.spot && currentState.distance != null) {
      const yardsGained = calculateYardsGained(currentState.spot, playData.spot, currentState.possession);
      
      if (yardsGained >= currentState.distance) {
        newDown = 1;
        newDistance = 10;
      } else {
        newDown = Math.min(4, (currentState.down || 1) + 1);
        newDistance = Math.max(0, (currentState.distance || 10) - yardsGained);
        
        if (newDown > 4) {
          const newPossession = currentState.possession === 'H' ? 'V' : 'H';
          return {
            down: 1,
            distance: 10,
            spot: newSpot,
            possession: newPossession,
            isTurnover: true,
            turnoverType: 'downs'
          };
        }
      }
    }
    
    return {
      down: newDown,
      distance: newDistance,
      spot: newSpot
    };
  };

  const processPlay = (playData) => {
    console.log('processPlay called with:', playData);
    
    let updatedState = {
      ...gameState,
    };

    // Handle coin toss data specially - store it in game state
    if (playData.controlType === 'coin_toss') {
      console.log('Processing coin toss, storing data in game state');
      
      // Store the coin toss data directly
      updatedState = {
        ...updatedState,
        coinTossData: {
          winningTeam: playData.winningTeam,
          losingTeam: playData.losingTeam,
          winnerChoice: playData.winnerChoice,
          loserChoice: playData.loserChoice,
          deferChoice: playData.deferChoice
        }
      };
      
      console.log('Coin toss data stored:', updatedState.coinTossData);
      
      // If there's an updateGameState function, also call it
      if (playData.updateGameState) {
        console.log('Also calling updateGameState function');
        updatedState = playData.updateGameState(updatedState);
      }
    }

    // Handle kickoff scenarios specially - they NEVER count as drive plays
    if (playData.playType === 'kickoff') {
      if (playData.finalSpot) {
        console.log('Processing kickoff with final spot:', playData.finalSpot);
        
        // Kickoff is ending, start new drive
        const possessingTeam = playData.receivingTeam;
        
        // Only increment drive number if we've had at least one drive before
        const newDriveNumber = gameState.driveNumber === 0 ? 1 : gameState.driveNumber + 1;
        
        updatedState = {
          ...updatedState,
          spot: playData.finalSpot,
          possession: possessingTeam,
          down: playData.down || 1,
          distance: playData.distance || 10,
          gamePhase: 'DRIVE',
          driveNumber: newDriveNumber,
          driveStart: `Q${gameState.quarter} ${gameState.clock}, ${playData.finalSpot}`,
          drivePlays: 0, // Reset for new drive
          driveYards: 0,
          driveTime: '0:00'
        };

        console.log(`Starting Drive #${newDriveNumber} for team ${possessingTeam} at ${playData.finalSpot}`);
      }

      // Handle touchback stats
      if (playData.isTouchback && playData.resultCode === 'T') {
        const kickingTeam = playData.kickingTeam;
        updatedState = {
          ...updatedState,
          teamStats: {
            ...updatedState.teamStats,
            [kickingTeam]: {
              ...updatedState.teamStats[kickingTeam],
              touchbacks: (updatedState.teamStats[kickingTeam]?.touchbacks || 0) + 1
            }
          }
        };
        console.log(`Added touchback for team ${kickingTeam}`);
      }

      return updatedState; // Early return to prevent overriding by later code
    } else if (playData.playType === 'rush' || playData.playType === 'pass') {
      // Handle regular offensive plays - update down/distance and drive stats
      if (gameState.gamePhase === 'DRIVE') {
        updatedState = {
          ...updatedState,
          drivePlays: gameState.drivePlays + 1,
        };
        
        // Update down and distance based on play result
        const downDistanceUpdate = updateDownAndDistance(gameState, playData);
        updatedState = {
          ...updatedState,
          ...downDistanceUpdate
        };
        
        // If it was a turnover on downs, update drive phase
        if (downDistanceUpdate.isTurnover) {
          updatedState = {
            ...updatedState,
            gamePhase: 'CHANGE_OF_POSSESSION',
            turnovers: {
              ...updatedState.turnovers,
              [gameState.possession]: (updatedState.turnovers[gameState.possession] || 0) + 1
            }
          };
        }
        
        // Calculate yards gained for drive tracking
        if (playData.spot && gameState.spot) {
          const yardsGained = calculateYardsGained(gameState.spot, playData.spot, gameState.possession);
          updatedState = {
            ...updatedState,
            driveYards: (gameState.driveYards || 0) + yardsGained
          };
        }
      }
    } else {
      // Regular offensive plays - only count if we're in a drive
      if (gameState.gamePhase === 'DRIVE') {
        updatedState = {
          ...updatedState,
          drivePlays: gameState.drivePlays + 1,
        };
      }
    }

    // Handle change of possession scenarios (punts, turnovers, etc.)
    if (playData.isTurnover || playData.playType === 'punt' || playData.playType === 'field_goal') {
      // Mark that we're between drives - next possession will start a new drive
      updatedState = {
        ...updatedState,
        gamePhase: 'CHANGE_OF_POSSESSION'
      };
      
      // Update possession if it's a turnover
      if (playData.isTurnover) {
        updatedState = {
          ...updatedState,
          possession: playData.recoveryTeam || (gameState.possession === 'H' ? 'V' : 'H'),
          down: 1,
          distance: 10
        };
      }
    }

    // Handle penalty enforcement - update ball position AND penalty stats
    if (playData.playType === 'penalty' && playData.enforcement && playData.spot) {
      console.log('Processing penalty with enforcement, moving ball to:', playData.spot);
      
      // Calculate penalty yardage for stats
      const penaltyYards = calculatePenaltyYardage(gameState.spot, playData.spot, playData.team);
      
      updatedState = {
        ...updatedState,
        spot: playData.spot,
        // If penalty resulted in automatic first down or loss of down, handle that too
        down: playData.enforcement.automaticFirstDown ? 1 : 
              playData.enforcement.lossOfDown ? Math.min(4, updatedState.down + 1) : 
              updatedState.down,
        distance: playData.enforcement.automaticFirstDown ? 10 : updatedState.distance,
        // Update penalty stats
        teamStats: {
          ...updatedState.teamStats,
          [playData.team]: {
            ...updatedState.teamStats[playData.team],
            penalties: (updatedState.teamStats[playData.team]?.penalties || 0) + 1,
            penaltyYards: (updatedState.teamStats[playData.team]?.penaltyYards || 0) + Math.abs(penaltyYards)
          }
        },
        // Track ejected players
        ejectedPlayers: playData.enforcement.playerEjected ? [
          ...(updatedState.ejectedPlayers || []),
          {
            team: playData.team,
            number: playData.playerNumber,
            penalty: playData.penaltyCode,
            quarter: updatedState.quarter,
            clock: updatedState.clock
          }
        ] : (updatedState.ejectedPlayers || [])
      };
      
      console.log(`Added penalty: ${playData.team} +1 penalty, +${Math.abs(penaltyYards)} yards`);
      if (playData.enforcement.playerEjected) {
        console.log(`Player ejected: ${playData.team} #${playData.playerNumber}`);
      }
    }

    // Also update down and distance after penalty enforcement
    if (playData.enforcement && playData.enforcement.automaticFirstDown) {
      updatedState = {
        ...updatedState,
        down: 1,
        distance: 10
      };
    } else if (playData.enforcement && playData.enforcement.lossOfDown) {
      updatedState = {
        ...updatedState,
        down: Math.min(4, updatedState.down + 1)
      };
    }
    // If penalty just moved the ball but no down effect, recalculate distance to goal
    else if (updatedState.spot) {
      const newDistance = calculateDistanceToGoal(updatedState.spot, updatedState.possession);
      updatedState = {
        ...updatedState,
        distance: Math.min(updatedState.distance, newDistance)
      };
    }

    console.log('processPlay returning updated state:', updatedState);
    return updatedState;
  };

  // Helper function to calculate distance to goal line
  const calculateDistanceToGoal = (spot, possession) => {
    if (!spot) return 10;
    
    const side = spot[0];
    const yard = parseInt(spot.slice(1));
    
    // Calculate distance to opponent's goal line
    if (possession === 'H') {
      // Home team attacking visitor's goal
      return side === 'V' ? yard : (100 - yard);
    } else {
      // Visitor team attacking home's goal
      return side === 'H' ? yard : (100 - yard);
    }
  };

  // Helper function to calculate actual penalty yardage gained/lost
  const calculatePenaltyYardage = (fromSpot, toSpot, penaltyTeam) => {
    if (!fromSpot || !toSpot) return 0;
    
    const fromSide = fromSpot[0];
    const fromYard = parseInt(fromSpot.slice(1));
    const toSide = toSpot[0];
    const toYard = parseInt(toSpot.slice(1));
    
    // Calculate field position change
    const fromFieldPos = fromSide === 'H' ? fromYard : (100 - fromYard);
    const toFieldPos = toSide === 'H' ? toYard : (100 - toYard);
    
    // Positive means gained yards toward opponent's goal
    const yardageChange = toFieldPos - fromFieldPos;
    
    // If penalty was on the team with possession, they lost yards (negative change is good for defense)
    // If penalty was on defense, offense gained yards (positive change)
    return yardageChange;
  };

  const generatePlayDescription = (playData) => {
    console.log('Generating play description for:', playData);
    
    // Helper function to format terminal data
    const formatTerminalData = (terminalResult, playData) => {
      switch (terminalResult) {
        case 'T': // Tackle
          const tackler = playData.tackler1 ? ` (tackled by ${playData.tackler1}` : '';
          const assistedBy = playData.tackler2 && playData.tackler2.trim() !== '' ? `, ${playData.tackler2}` : '';
          const tackleClose = tackler ? ')' : '';
          return `${tackler}${assistedBy}${tackleClose}`;
        case 'O': // Out of bounds
          return ' (out of bounds)';
        case '.': // End of play
          // For auto-terminal cases, don't add extra notation
          if (playData.resultCode === 'I') return ''; // Incomplete pass - no extra notation
          if (playData.resultCode === 'D') return ' (downed)'; // Punt downed
          if (playData.resultCode === 'B') return ' (blocked)'; // Punt blocked
          if (playData.resultCode === 'A') return ' (accepted)'; // Penalty accepted
          return ' (touchdown)'; // Default for manual . terminal
        default:
          return '';
      }
    };
    
    const spot = playData.spot ? ` at ${playData.spot}` : '';
    const terminalOutcome = formatTerminalData(playData.terminalResult, playData);
    
    // Use resultCode (original primary result) instead of result (which gets overwritten)
    const primaryResult = playData.resultCode || playData.result;
    
    // Generate play description based on play type
    switch (playData.playType) {
      case 'rush':
        return `${playData.rusher} rush for ${playData.yards || 0} yards${terminalOutcome}${spot}`;
        
      case 'pass':
        if (primaryResult === 'C') {
          const receiver = playData.receiver ? ` to ${playData.receiver}` : '';
          const caughtAt = playData.caughtAt ? ` caught at ${playData.caughtAt}` : '';
          return `${playData.passer} pass complete${receiver}${caughtAt}${terminalOutcome}${spot}`;
        } else if (primaryResult === 'I') {
          const intended = playData.intendedFor ? ` intended for ${playData.intendedFor}` : '';
          return `${playData.passer} pass incomplete${intended}${spot}`;
        } else if (primaryResult === 'S') {
          const sacker = playData.tackler1 ? ` (sacked by ${playData.tackler1}` : '';
          const assistedBy = playData.tackler2 && playData.tackler2.trim() !== '' ? `, ${playData.tackler2}` : '';
          const sackClose = sacker ? ')' : '';
          const sackYards = playData.sackYards ? ` for ${Math.abs(playData.sackYards)} yard loss` : '';
          return `${playData.passer} sacked${sackYards}${sacker}${assistedBy}${sackClose}${spot}`;
        } else if (primaryResult === 'F' && playData.isSackFumble) {
          const sacker = playData.forcedBy ? ` (sack fumble forced by ${playData.forcedBy})` : ' (sack fumble)';
          const recovery = playData.recoveryTeam && playData.recoveryPlayer ? 
            ` recovered by ${playData.recoveryTeam} #${playData.recoveryPlayer}` : '';
          return `${playData.passer} sacked${sacker}${recovery}${terminalOutcome}${spot}`;
        } else {
          return `${playData.passer} pass - result: ${primaryResult}${terminalOutcome}`;
        }
        
      case 'rush':
        const rushYards = playData.yards || 0;
        const scrambleNote = playData.isScramble ? 'scramble' : 'rush';
        const rusherName = playData.rusher || 'Player';
        return `${rusherName} ${scrambleNote} for ${rushYards} yards${terminalOutcome}${spot}`;

      case 'punt':
        if (primaryResult === 'D') {
          return `${playData.punter} punt to ${playData.puntedTo} (downed)${spot}`;
        } else if (primaryResult === 'C') {
          return `${playData.punter} punt to ${playData.puntedTo} (fair catch)${spot}`;
        } else if (primaryResult === 'B') {
          return `${playData.punter} punt blocked${spot}`;
        } else {
          return `${playData.punter} punt to ${playData.puntedTo}${terminalOutcome}${spot}`;
        }

      case 'kickoff':
        if (primaryResult === 'R') {
          return `${playData.kicker} kickoff to ${playData.kickedTo}, returned${terminalOutcome}${spot}`;
        } else if (primaryResult === 'T') {
          // True touchback - show in description
          return `${playData.kicker} kickoff (touchback), ball at ${playData.finalSpot}`;
        } else if (primaryResult === 'O') {
          return `${playData.kicker} kickoff out of bounds at ${playData.kickedTo}`;
        } else if (primaryResult === 'C') {
          // Fair catch - show if it became automatic touchback due to position
          const touchbackNote = playData.isAutomaticTouchback ? ' (automatic touchback)' : '';
          return `${playData.kicker} kickoff to ${playData.kickedTo} (fair catch)${touchbackNote}`;
        } else if (primaryResult === 'D') {
          // Downed - show if it became automatic touchback due to position
          const touchbackNote = playData.isAutomaticTouchback ? ' (automatic touchback)' : '';
          return `${playData.kicker} kickoff to ${playData.kickedTo} (downed)${touchbackNote}`;
        } else {
          return `${playData.kicker} kickoff to ${playData.kickedTo}${terminalOutcome}${spot}`;
        }

      case 'field_goal':
        if (primaryResult === 'G') {
          return `${playData.kicker} ${playData.distance} yard field goal GOOD`;
        } else if (primaryResult === 'N') {
          return `${playData.kicker} ${playData.distance} yard field goal NO GOOD${spot}`;
        } else if (primaryResult === 'B') {
          return `${playData.kicker} ${playData.distance} yard field goal BLOCKED${terminalOutcome}${spot}`;
        } else {
          return `${playData.kicker} ${playData.distance} yard field goal attempt${terminalOutcome}`;
        }
        
      case 'penalty':
        const accepted = primaryResult === 'A' ? 'accepted' : 'declined';
        const playerInfo = playData.playerNumber ? ` #${playData.playerNumber}` : '';
        const ejected = playData.enforcement?.playerEjected ? ' (EJECTED)' : '';
        return `Penalty: ${playData.penaltyCode} on ${playData.team}${playerInfo} (${accepted})${ejected}${spot}`;
        
      case 'game':
        if (playData.controlType === 'coin_toss') {
          const winnerTeam = playData.winningTeam === 'H' ? 'Home' : 'Visitor';
          const choice = playData.winnerChoice || 'unknown';
          return `Coin toss: ${winnerTeam} wins, elects to ${choice.toLowerCase()}`;
        }
        return `Game control: ${playData.controlType || 'unknown'}`;
        
      default:
        return `${playData.playType} play${terminalOutcome}${spot}`;
    }
  };

  // Validation functions
  const validateGameState = (state) => {
    const errors = [];
    if (!state.quarter || state.quarter < 1 || state.quarter > 4) {
      errors.push('Invalid quarter');
    }
    if (!state.down || state.down < 1 || state.down > 4) {
      errors.push('Invalid down');
    }
    return errors;
  };

  const resetGame = () => {
    setGameState({
      quarter: 1,
      clock: "15:00",
      possession: "H",
      down: 1,
      distance: 10,
      spot: "H35",
      score: { H: 0, V: 0 },
      scoresByQuarter: { H: [0, 0, 0, 0], V: [0, 0, 0, 0] },
      previousPlays: [],
      timeouts: { H: 3, V: 3 },
      challenges: { H: false, V: false },
      teamStats: { H: {}, V: {} },
      topPlayers: { H: {}, V: {} },
      driveNumber: 0, // Start at 0
      driveStart: null,
      drivePlays: 0,
      driveYards: 0,
      driveTime: '0:00',
      totalPlays: { H: 0, V: 0 },
      totalYards: { H: 0, V: 0 },
      turnovers: { H: 0, V: 0 },
      drives: [],
      gamePhase: 'KICKOFF'
    });
    setPlayLog([]);
  };

  return (
    <GameStateContext.Provider value={{
      gameState, 
      setGameState, 
      teamMetadata, 
      setTeamMetadata,
      gameConfig, 
      setGameConfig, 
      playLog, 
      setPlayLog, 
      currentGameId, 
      setCurrentGameId,
      apiStatus,
      loadGameFromAPI,
      // Enhanced functions
      submitPlay,
      validateGameState,
      resetGame,
      processPlay,
      generatePlayDescription
    }}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};

export default GameStateContext;
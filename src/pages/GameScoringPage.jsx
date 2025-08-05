import React, { useState } from 'react';
import { GameStateProvider, useGameState } from '../components/GameStateContext';
import GameStateDisplay from '../components/GameStateDisplay';
import StatWindow from '../components/StatWindow';
import InputContainer from '../components/InputContainer';
import PlayLog from '../components/PlayLog';
import InputAssistant from '../components/InputAssistant';
import FieldDirectionSetup from '../components/FieldDirectionSetup';
import APIStatus from '../components/APIStatus';

export default function GameScoringPage() {
  const [queuedPenalty, setQueuedPenalty] = useState(false);

  return (
    <GameStateProvider>
      <NavigationBar />
      <GameContent queuedPenalty={queuedPenalty} setQueuedPenalty={setQueuedPenalty} />
    </GameStateProvider>
  );
}

const NavigationBar = () => {
  const { apiStatus, currentGameId, loadGameFromAPI } = useGameState();
  const [gameIdInput, setGameIdInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const handleNavigation = (page) => {
    switch (page) {
      case 'dashboard':
        window.location.href = 'index.php';
        break;
      case 'roster':
        window.location.href = 'roster_editor.php';
        break;
      case 'reports':
        alert('Not Implemented Yet');
        break;
      default:
        break;
    }
  };

  const handleGameIdSubmit = async (e) => {
    e.preventDefault();
    if (!gameIdInput.trim()) return;
    
    setIsConnecting(true);
    setLoadError(null);
    
    try {
      console.log('Attempting to load game ID:', gameIdInput.trim());
      await loadGameFromAPI(gameIdInput.trim());
      setGameIdInput(''); // Clear input on success
      console.log('✅ Successfully loaded game:', gameIdInput.trim());
    } catch (error) {
      console.error('❌ Failed to load game:', error);
      setLoadError(error.message);
      // Don't clear input on error so user can try again
    } finally {
      setIsConnecting(false);
    }
  };

  // Only show as connected if we have both API connection AND a current game
  const isFullyConnected = apiStatus.connected && currentGameId;

  return (
    <div className="bg-gray-800 text-white p-3 border-b border-gray-600 font-anton">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Strata Football - Game Scoring</h1>
        
        <div className="flex items-center space-x-4">
          {/* Game ID Input with Error Display */}
          <div className="flex flex-col">
            <form onSubmit={handleGameIdSubmit} className="flex items-center space-x-2">
              <label className="text-sm font-bold">Game ID:</label>
              <input
                type="text"
                value={gameIdInput}
                onChange={(e) => setGameIdInput(e.target.value)}
                className="bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 w-20 text-sm"
                placeholder="123"
                disabled={isConnecting || apiStatus.loading}
              />
              <button
                type="submit"
                disabled={isConnecting || apiStatus.loading || !gameIdInput.trim() || !apiStatus.connected}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
              >
                {isConnecting ? '...' : 'Load'}
              </button>
            </form>
            {loadError && (
              <div className="text-xs text-red-400 mt-1 max-w-xs">
                Error: {loadError}
              </div>
            )}
            {!apiStatus.connected && (
              <div className="text-xs text-yellow-400 mt-1">
                API not connected
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={() => handleNavigation('dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNavigation('roster')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold transition-colors"
          >
            Roster Editor
          </button>
          <button
            onClick={() => handleNavigation('reports')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold transition-colors"
          >
            Reports
          </button>

          {/* API Status */}
          <div className={`px-4 py-2 rounded font-bold text-sm ${
            isFullyConnected
              ? 'bg-green-500 text-white' 
              : apiStatus.loading 
                ? 'bg-yellow-500 text-black'
                : apiStatus.connected
                  ? 'bg-orange-500 text-white'
                  : 'bg-red-500 text-white'
          }`}>
            {isFullyConnected
              ? `🟢 Live: Game #${currentGameId}` 
              : apiStatus.loading 
                ? '🟡 Connecting...'
                : apiStatus.connected
                  ? '🟠 API Ready - No Game'
                  : '🔴 Offline Mode'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

const GameContent = ({ queuedPenalty, setQueuedPenalty }) => {
  const { gameConfig, setGameConfig, teamMetadata, gameState, setGameState, apiStatus, submitPlay } = useGameState();

  console.log('GameContent render - gameState.coinTossData:', gameState.coinTossData);
  console.log('GameContent render - gameConfig.fieldDirectionSet:', gameConfig.fieldDirectionSet);

  const handleDirectionSet = async (directionData) => {
    console.log('Setting field direction:', directionData);
    
    // Set field direction in config FIRST
    setGameConfig(prev => ({
      ...prev,
      fieldDirectionSet: true,
      initialAttackDirection: directionData.attackDirection
    }));

    // CRITICAL FIX: Determine initial possession based on coin toss results
    const initialPossession = gameState.coinTossData?.winnerChoice === 'RECEIVE' && gameState.coinTossData?.winningTeam === 'V' 
      ? 'H'  // Visitor chose to receive, so HOME kicks (Home gets possession to kick away)
      : gameState.coinTossData?.winnerChoice === 'KICK' && gameState.coinTossData?.winningTeam === 'V'
      ? 'V'  // Visitor chose to kick, so Visitor has possession 
      : gameState.coinTossData?.winnerChoice === 'RECEIVE' && gameState.coinTossData?.winningTeam === 'H'
      ? 'V'  // Home chose to receive, so Visitor kicks
      : 'H'; // Default or Home chose to kick

    console.log('Setting initial possession for kickoff:', initialPossession);
    console.log('Coin toss context:', {
      winningTeam: gameState.coinTossData?.winningTeam,
      winnerChoice: gameState.coinTossData?.winnerChoice,
      shouldReceive: gameState.coinTossData?.winnerChoice === 'RECEIVE' ? gameState.coinTossData?.winningTeam : gameState.coinTossData?.losingTeam
    });

    // ONLY send to API if we haven't already sent a coin toss + field direction
    if (apiStatus.connected && gameState.coinTossData && !gameState.gameSetupComplete) {
      const completeGameSetupData = {
        ...gameState.coinTossData,
        fieldDirection: {
          initialAttackDirection: directionData.attackDirection,
          kickingTeam: directionData.kickingTeam
        },
        playType: 'game',
        controlType: 'game_setup',
        resultCode: 'COMPLETE'
      };

      console.log('Sending complete game setup to API:', completeGameSetupData);
      
      try {
        await submitPlay(completeGameSetupData);
        console.log('✅ Game setup sent to API successfully');
        
        // Mark that we've completed the game setup to prevent duplicates
        setGameState(prev => ({
          ...prev,
          gameSetupComplete: true,
          possession: initialPossession, // Set possession AFTER API call
          gamePhase: 'KICKOFF'
        }));
      } catch (error) {
        console.error('❌ Failed to send game setup to API:', error);
        // Still set possession even if API fails
        setGameState(prev => ({
          ...prev,
          possession: initialPossession,
          gamePhase: 'KICKOFF'
        }));
      }
    } else {
      // Even if we don't send to API, set possession and mark setup as complete
      setGameState(prev => ({
        ...prev,
        gameSetupComplete: true,
        possession: initialPossession,
        gamePhase: 'KICKOFF'
      }));
    }
  };

  // Show loading screen while API initializes
  if (apiStatus.loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-anton">
        <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <div className="text-xl font-bold">Connecting to Game API...</div>
        <div className="text-sm text-gray-600 mt-2">Loading team data and game state</div>
      </div>
    );
  }

  // Show field direction setup AFTER coin toss is complete
  if (gameState.coinTossData && !gameConfig.fieldDirectionSet) {
    console.log('Showing field direction setup for coin toss:', gameState.coinTossData);
    console.log('Current gameConfig.fieldDirectionSet:', gameConfig.fieldDirectionSet);
    
    // Determine who's kicking based on coin toss results
    const coinToss = gameState.coinTossData;
    let kickingTeam;
    
    if (coinToss.winnerChoice === 'KICK') {
      kickingTeam = coinToss.winningTeam;
    } else if (coinToss.winnerChoice === 'RECEIVE') {
      kickingTeam = coinToss.losingTeam;
    } else if (coinToss.winnerChoice === 'DEFEND') {
      // Winner chose to defend, so loser gets the ball (and will receive kickoff)
      kickingTeam = coinToss.winningTeam; // Winner kicks to start
    } else if (coinToss.loserChoice === 'DEFEND') {
      // Loser chose to defend, so winner gets the ball
      kickingTeam = coinToss.losingTeam; // Loser kicks to start
    } else if (coinToss.winnerChoice === 'DEFER') {
      // Handle defer case
      kickingTeam = coinToss.losingTeam === 'RECEIVE' ? coinToss.winningTeam : coinToss.losingTeam;
    } else {
      // Default case
      kickingTeam = 'H';
    }

    // For DEFEND choices, we already have the field direction from the end choice
    if (coinToss.winnerChoice === 'DEFEND' && coinToss.winnerEndChoice) {
      // Winner chose to defend an end, so set field direction based on that
      const attackDirection = coinToss.winnerEndChoice === 'LEFT' ? 'RIGHT' : 'LEFT';
      console.log('Auto-setting field direction from DEFEND choice:', attackDirection);
      
      // Call handleDirectionSet to process this automatically
      handleDirectionSet({
        attackDirection: attackDirection,
        kickingTeam: kickingTeam
      });
      
      return null; // Skip showing the manual field direction setup
    } else if (coinToss.loserChoice === 'DEFEND' && coinToss.loserEndChoice) {
      // Loser chose to defend an end
      const attackDirection = coinToss.loserEndChoice === 'LEFT' ? 'RIGHT' : 'LEFT';
      console.log('Auto-setting field direction from loser DEFEND choice:', attackDirection);
      
      // Call handleDirectionSet to process this automatically
      handleDirectionSet({
        attackDirection: attackDirection,
        kickingTeam: kickingTeam
      });
      
      return null; // Skip showing the manual field direction setup
    }

    console.log('Determined kicking team:', kickingTeam);
    console.log('About to show FieldDirectionSetup');

    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-anton">
        <FieldDirectionSetup 
          onDirectionSet={handleDirectionSet}
          kickingTeam={kickingTeam}
          coinTossData={coinToss}
        />
      </div>
    );
  }

  // Normal game interface (only show after both coin toss AND field direction are set)
  if (gameState.coinTossData && gameConfig.fieldDirectionSet) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-anton">
        <GameStateDisplay />
        <div className="flex flex-1">
          <StatWindow />
          <InputContainer onPenaltyQueued={setQueuedPenalty} />
          <PlayLog />
        </div>
        <InputAssistant
          message={apiStatus.connected ? 
            "Press any play type key to begin (R, P, U, E, K, G)" : 
            "⚠️ Running offline - Press any play type key to begin (R, P, U, E, K, G)"
          }
          playReadyToSubmit={false}
          queuedPenalty={queuedPenalty}
        />
      </div>
    );
  }

  // Show initial play input (coin toss will happen through Game Control -> New Half)
  return (
    <div className="min-h-screen bg-white flex flex-col font-anton">
      <GameStateDisplay />
      <div className="flex flex-1">
        <StatWindow />
        <InputContainer onPenaltyQueued={setQueuedPenalty} />
        <PlayLog />
      </div>
      <InputAssistant
        message="Press 'G' for Game Control, then 'N' for coin toss to start the game"
        playReadyToSubmit={false}
        queuedPenalty={queuedPenalty}
      />
    </div>
  );
};
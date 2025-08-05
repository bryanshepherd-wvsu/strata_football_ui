import React from 'react';
import { useGameState } from './GameStateContext';
import TimeoutChallengeDisplay from './TimeoutChallengeDisplay';

const GameStateDisplay = () => {
  const { gameState, teamMetadata, gameConfig } = useGameState();

  const colorSchemes = {
    H: { timeout: 'bg-yellow-400', challenge: 'bg-red-600', challengeUsed: 'bg-red-950' },
    V: { timeout: 'bg-yellow-400', challenge: 'bg-red-600', challengeUsed: 'bg-red-950' },
  };

  // Safe access to game state properties with defaults
  const timeouts = gameState?.timeouts || { H: 3, V: 3 };
  const challenges = gameState?.challenges || { H: false, V: false };
  const score = gameState?.score || { H: 0, V: 0 };
  const possession = gameState?.possession || 'H';
  const clock = gameState?.clock || '15:00';
  const quarter = gameState?.quarter || 1;
  const down = gameState?.down || 1;
  const distance = gameState?.distance || 10;
  const spot = gameState?.spot || 'H35';

  // Calculate if it's goal-to-go situation
  const isGoalToGo = () => {
    if (!spot || !possession) return false;
    
    const side = spot[0];
    const yard = parseInt(spot.slice(1));
    
    console.log('Goal-to-go check:', { spot, possession, distance, side, yard });
    
    // Calculate actual distance to goal line
    let distanceToGoal;
    if (possession === 'H') {
      // Home team attacking visitor's goal
      distanceToGoal = side === 'V' ? yard : (100 - yard);
    } else {
      // Visitor team attacking home's goal  
      distanceToGoal = side === 'H' ? yard : (100 - yard);
    }
    
    console.log('Distance calculation:', { distanceToGoal, distance, isGoalToGo: distanceToGoal < distance });
    
    // Goal-to-go only when distance to goal is less than the down distance
    return distanceToGoal < distance;
  };

  const displayDistance = isGoalToGo() ? 'GOAL' : distance;

  const getQuarterDisplay = (q) => {
    switch(q) {
      case 1: return '1ST';
      case 2: return '2ND';
      case 3: return '3RD';
      case 4: return '4TH';
      default: return 'OT';
    }
  };

  // Helper function to determine if we should show down/distance or special text
  const shouldShowDownDistance = () => {
    // Clear down/distance for these situations:
    if (gameState?.gamePhase === 'KICKOFF') return false;
    if (gameState?.gamePhase === 'CHANGE_OF_POSSESSION') return false;
    
    // ALSO check if we have valid down/distance data
    if (!gameState?.down || !gameState?.distance) return false;
    
    return true;
  };

  const getSpecialDisplayText = () => {
    if (gameState?.gamePhase === 'KICKOFF') return 'KICKOFF';
    if (gameState?.gamePhase === 'CHANGE_OF_POSSESSION') return 'KICKOFF';
    return null;
  };

  return (
    <div className="bg-black text-white flex justify-between items-center px-8 py-4 text-center w-full">
      <div className="flex items-center space-x-4">
        <img src={`${teamMetadata?.Home?.logo || ''}`} alt="Home Logo" className="h-12 w-auto" />
        <div className="flex flex-col">
          <div className="flex items-center text-[36px] scoreboard-font">
            <span>{(teamMetadata?.Home?.shortname || 'HOME').toUpperCase()}</span>
            {possession === 'H' && <span className="ml-2">🏈</span>}
            <span className="ml-[100px]">{score.H}</span>
          </div>
          <TimeoutChallengeDisplay 
            timeouts={timeouts.H} 
            challenge={challenges.H} 
            colorScheme={colorSchemes.H} 
            isVisitor={false} 
            showChallenges={gameConfig?.challengesEnabled || false} 
          />
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center">
        <div className="text-[34px] scoreboard-font">{clock} | {getQuarterDisplay(quarter)}</div>
        <div className="relative w-[220px] h-[50px] mt-1 mx-auto">
          <div className="absolute top-0 left-0 right-0 bg-blue-700 text-white rounded h-[22px] flex justify-around items-center text-[11px]">
            <div className="w-1/3 text-center leading-[22px]">DOWN</div>
            <div className="w-1/3 text-center leading-[22px]">TO GO</div>
            <div className="w-1/3 text-center leading-[22px]">BALL ON</div>
          </div>
          <div className="absolute bottom-[-10px] left-0 right-0 flex justify-around text-[24px] scoreboard-font">
            {shouldShowDownDistance() ? (
              <>
                <div className="w-1/3 text-center">{down}</div>
                <div className="w-1/3 text-center">{displayDistance}</div>
                <div className="w-1/3 text-center ml-2">{spot}</div>
              </>
            ) : (
              <>
                <div className="w-2/3 text-center">{getSpecialDisplayText()}</div>
                <div className="w-1/3 text-center ml-2">{spot}</div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex flex-col items-end">
          <div className="flex items-center text-[36px] scoreboard-font">
            <span className="mr-[100px]">{score.V}</span>
            {possession === 'V' && <span className="ml-2">🏈</span>}
            <span>{(teamMetadata?.Visitor?.shortname || 'VISITOR').toUpperCase()}</span>
          </div>
          <TimeoutChallengeDisplay 
            timeouts={timeouts.V} 
            challenge={challenges.V} 
            colorScheme={colorSchemes.V} 
            isVisitor={true} 
            showChallenges={gameConfig?.challengesEnabled || false} 
          />
        </div>
        <img src={`${teamMetadata?.Visitor?.logo || ''}`} alt="Visitor Logo" className="h-12 w-auto" />
      </div>
    </div>
  );
};

export default GameStateDisplay;
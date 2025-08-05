// Helper function to calculate yards gained/lost from spot change
export const calculateYardsGained = (fromSpot, toSpot, possession) => {
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

// Helper function to calculate distance to goal line
export const calculateDistanceToGoal = (spot, possession) => {
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
export const calculatePenaltyYardage = (fromSpot, toSpot, penaltyTeam) => {
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
  
  return yardageChange;
};

// Helper function to update down and distance
export const updateDownAndDistance = (currentState, playData) => {
  let newDown = currentState.down;
  let newDistance = currentState.distance;
  let newSpot = playData.spot || currentState.spot;
  
  // Calculate yards gained if we have spot information
  if (playData.spot && currentState.spot) {
    const yardsGained = calculateYardsGained(currentState.spot, playData.spot, currentState.possession);
    
    // Check if first down was achieved
    if (yardsGained >= currentState.distance) {
      // First down achieved
      newDown = 1;
      newDistance = 10;
    } else {
      // No first down, advance down
      newDown = currentState.down + 1;
      newDistance = Math.max(0, currentState.distance - yardsGained);
      
      // If 4th down was unsuccessful, it's a turnover on downs
      if (newDown > 4) {
        // Turnover on downs - possession changes
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

// Helper function to calculate new context after play
export const calculateNewContext = (playData, gameState) => {
  // Start with current game state
  let newPossession = gameState.possession;
  let newDown = gameState.down;
  let newDistance = gameState.distance;
  let newSpot = playData.spot || gameState.spot;

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

  // Return as comma-separated string to match XML format
  return `${newPossession},${newDown},${newDistance},${newSpot}`;
};

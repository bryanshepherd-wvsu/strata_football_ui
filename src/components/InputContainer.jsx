import React, { useState, useEffect } from 'react';
import { useGameState } from './GameStateContext';
import TwoStagePlayInput from './TwoStagePlayInput';

const InputContainer = ({ onPenaltyQueued }) => {
  const { gameState, gameConfig, setGameConfig, teamMetadata } = useGameState();
  const [editingPlayData, setEditingPlayData] = useState(null);
  const [replacingPlayData, setReplacingPlayData] = useState(null);

  useEffect(() => {
    const handleEditPlay = (event) => {
      const { playData, playIndex, section } = event.detail;
      console.log('InputContainer received edit request:', { playData, playIndex, section });
      setEditingPlayData({
        ...playData,
        originalIndex: playIndex,
        originalSection: section
      });
    };

    const handleReplacePlay = (event) => {
      const { originalPlayIndex, originalSection, actualPlayLogIndex, originalPlayData } = event.detail;
      console.log('InputContainer received replace request:', { originalPlayIndex, originalSection, actualPlayLogIndex, originalPlayData });
      setReplacingPlayData({
        originalIndex: originalPlayIndex,
        originalSection: originalSection,
        actualPlayLogIndex: actualPlayLogIndex,
        originalPlayData: originalPlayData
      });
    };

    window.addEventListener('editPlay', handleEditPlay);
    window.addEventListener('replacePlay', handleReplacePlay);
    return () => {
      window.removeEventListener('editPlay', handleEditPlay);
      window.removeEventListener('replacePlay', handleReplacePlay);
    };
  }, []);

  const handlePlayComplete = (playData) => {
    console.log('Play completed:', playData);
    
    // If we were editing a play, this is an update
    if (editingPlayData) {
      console.log('Updating existing play');
      setEditingPlayData(null);
    }
    
    // If we were replacing a play, handle the replacement
    if (replacingPlayData) {
      console.log('Replacing existing play with new play data');
      // Add replacement metadata to the play data
      playData.isReplacement = true;
      playData.replacedPlayIndex = replacingPlayData.originalIndex;
      playData.replacedSection = replacingPlayData.originalSection;
      playData.replacedActualIndex = replacingPlayData.actualPlayLogIndex;
      
      setReplacingPlayData(null);
    }
  };

  const handleEditCancel = () => {
    setEditingPlayData(null);
    setReplacingPlayData(null);
  };

  const handlePenaltyQueued = (isQueued) => {
    onPenaltyQueued?.(isQueued);
  };

  const handleInputCancel = () => {
    // Cancel logic if needed
  };

  const calculateYardlinePercent = (spot) => {
    if (!spot || typeof spot !== "string") return 50;
    const side = spot[0];
    const yard = parseInt(spot.slice(1), 10);
    
    // Field runs 0-100: HOME goal line at 0, VISITOR goal line at 100
    // H35 = 35 yards from HOME goal = 35% from left
    // V35 = 35 yards from VISITOR goal = 65% from left (100-35)
    return side === "H" ? yard : (100 - yard);
  };

  // Simple field flipping logic based on attack direction
  const shouldFlipField = () => {
    console.log('Checking field flip:', {
      fieldDirectionSet: gameConfig.fieldDirectionSet,
      initialAttackDirection: gameConfig.initialAttackDirection,
      possession: gameState?.possession,
      quarter: gameState?.quarter
    });
    
    if (!gameConfig.fieldDirectionSet) return false;
    
    const possession = gameState?.possession || 'H';
    const currentQuarter = gameState?.quarter || 1;
    
    // The initialAttackDirection is for the VISITOR team (from FieldDirectionSetup)
    // Determine what direction the current possessing team should attack
    let currentAttackDirection;
    
    // In quarters 2 and 4, teams switch directions
    if (currentQuarter === 2 || currentQuarter === 4) {
      // Switch directions from Q1/Q3
      if (possession === 'V') {
        // Visitor attacks opposite direction in Q2/Q4
        currentAttackDirection = gameConfig.initialAttackDirection === 'LEFT' ? 'RIGHT' : 'LEFT';
      } else {
        // Home attacks opposite of visitor's original direction
        currentAttackDirection = gameConfig.initialAttackDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      }
    } else {
      // Q1 and Q3 - use original directions
      if (possession === 'V') {
        // Visitor uses their chosen direction
        currentAttackDirection = gameConfig.initialAttackDirection;
      } else {
        // Home attacks opposite of visitor's direction
        currentAttackDirection = gameConfig.initialAttackDirection === 'LEFT' ? 'RIGHT' : 'LEFT';
      }
    }
    
    console.log('Current attack direction for', possession, ':', currentAttackDirection);
    
    // If attacking left, flip the field so they appear to move left-to-right
    const shouldFlip = currentAttackDirection === 'LEFT';
    console.log('Should flip field:', shouldFlip);
    return shouldFlip;
  };

  const renderFieldOrientation = () => {
    const flipField = shouldFlipField();
    const currentSpot = gameState?.spot || 'H35'; // Make sure we have a spot
    const spotPercent = calculateYardlinePercent(currentSpot);
    const distance = gameState?.distance || 10;

    console.log('Field rendering with spot:', currentSpot, 'calculated percent:', spotPercent);

    let firstDownPercent = spotPercent;
    if (currentSpot && distance !== null) {
      const side = currentSpot[0];
      const yard = parseInt(currentSpot.slice(1));
      
      if (side === "H") {
        // Moving from H35 toward V0: H35 + 10 yards = H45 (if stays on H side)
        const newYard = yard + distance;
        if (newYard >= 100) {
          // Crossed into V territory: 110 - 100 = V10
          firstDownPercent = 100 - (newYard - 100);
        } else {
          firstDownPercent = newYard;
        }
      } else {
        // Moving from V35 toward H0: V35 + 10 yards = V25 (if stays on V side)  
        const newYard = yard + distance;
        if (newYard >= 100) {
          // Crossed into H territory: 110 - 100 = H10
          firstDownPercent = newYard - 100;
        } else {
          firstDownPercent = 100 - newYard;
        }
      }
    }

    // If flipped, invert the percentages
    const displaySpotPercent = flipField ? 100 - spotPercent : spotPercent;
    const displayFirstDownPercent = flipField ? 100 - firstDownPercent : firstDownPercent;
    
    console.log('Final display percentages:', { 
      originalSpotPercent: spotPercent, 
      displaySpotPercent, 
      flipField,
      currentSpot
    });
    
    const leftEndZone = flipField ? 
      (teamMetadata?.Visitor?.shortname || "VISITOR") : 
      (teamMetadata?.Home?.shortname || "HOME");
    const rightEndZone = flipField ? 
      (teamMetadata?.Home?.shortname || "HOME") : 
      (teamMetadata?.Visitor?.shortname || "VISITOR");

    return (
      <div className="bg-green-100 p-3 border border-black rounded shadow relative h-24 flex items-center justify-between">
        <div className="text-xs font-bold ml-2">{leftEndZone}</div>
        <div className="relative flex-1 h-8 mx-2 bg-green-300 overflow-hidden">
          {/* Yard lines every 5 yards */}
          {[...Array(21)].map((_, i) => (
            <div key={`line-${i}`} className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${(i * 5)}%` }} />
          ))}
          
          {/* Yard line numbers on 10-yard lines */}
          {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((yardLine, i) => {
            const position = (i + 1) * 10; // 10%, 20%, 30%, etc.
            return (
              <div 
                key={`yard-${i}`}
                className="absolute text-xs font-bold text-green-800"
                style={{ 
                  left: `${position}%`, 
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {yardLine}
              </div>
            );
          })}
          
          {/* 50-yard line */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: '50%' }} />
          
          {/* First down marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-500" style={{ left: `${displayFirstDownPercent}%` }} />
          
          {/* Football position */}
          <div 
            className="absolute text-lg"
            style={{ 
              left: `${displaySpotPercent}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            🏈
          </div>
        </div>
        <div className="text-xs font-bold mr-2">{rightEndZone}</div>
        
        {/* Field flip indicator */}
        {flipField && (
          <div className="absolute top-1 right-1 text-xs text-gray-500">
            ↔️
          </div>
        )}
        
        {/* Debug info */}
        <div className="absolute bottom-0 left-2 text-xs text-gray-600">
          {currentSpot} → {displaySpotPercent.toFixed(1)}%
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-300 p-4 border-black border-x min-h-full overflow-visible">
      <div className="flex flex-col h-full text-black space-y-4">
        {/* Drive and Game Info */}
        <div className="flex justify-between space-x-4">
          <div className="bg-white p-3 border border-black rounded shadow w-[47.5%]">
            <div className="text-xl font-bold mb-1">Current Drive</div>
            <div className="text-sm space-y-1">
              <div>Team: {gameState?.possession === 'H' ? 'Home' : 'Visitor'}</div>
              <div>Drive #: {gameState?.driveNumber || 0}</div>
              <div>Start: {gameState?.driveStart || 'Awaiting kickoff'}</div>
              <div>Plays: {gameState?.drivePlays || 0}</div>
              <div>Yards: {gameState?.driveYards || 0}</div>
              <div>Time: {gameState?.driveTime || '0:00'}</div>
              {gameState?.gamePhase === 'KICKOFF' && (
                <div className="text-xs text-blue-600 italic">Pre-drive (kickoff phase)</div>
              )}
            </div>
          </div>
          <div className="bg-white p-3 border border-black rounded shadow w-[47.5%]">
            <div className="text-xl font-bold mb-1">Game Snapshot</div>
            <div className="text-sm grid grid-cols-2 gap-y-1">
              <div>Score:</div><div>{gameState?.score?.H || 0} vs {gameState?.score?.V || 0}</div>
              <div>Total Plays:</div><div>{gameState?.totalPlays?.H || 0} vs {gameState?.totalPlays?.V || 0}</div>
              <div>Total Yards:</div><div>{gameState?.totalYards?.H || 0} vs {gameState?.totalYards?.V || 0}</div>
              <div>Turnovers:</div><div>{gameState?.turnovers?.H || 0} vs {gameState?.turnovers?.V || 0}</div>
            </div>
          </div>
        </div>

        {/* Field Position Visualization - Always Horizontal */}
        {renderFieldOrientation()}

        {/* Input Area */}
        <div className={`flex flex-col bg-white p-4 border border-black rounded shadow h-full overflow-auto`}>
          {replacingPlayData && (
            <div className="bg-purple-100 border border-purple-400 p-2 mb-4 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-purple-800">REPLACING PLAY</span>
                  <span className="text-sm text-purple-700 ml-2">
                    {replacingPlayData.originalSection} #{replacingPlayData.originalIndex}
                  </span>
                </div>
                <button
                  onClick={handleEditCancel}
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                >
                  Cancel Replace
                </button>
              </div>
              <div className="text-xs text-purple-700 mt-1">
                Original: {replacingPlayData.originalPlayData?.description || 'No description'}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Enter completely new play - this will replace the original play entirely
              </div>
            </div>
          )}
          
          <TwoStagePlayInput
            onPlayComplete={handlePlayComplete}
            onCancel={handleEditCancel}
            onPenaltyQueued={handlePenaltyQueued}
            editingPlayData={editingPlayData}
            replacingPlayData={replacingPlayData}
            onEditCancel={handleEditCancel}
          />
        </div>
      </div>
    </div>
  );
};

export default InputContainer;
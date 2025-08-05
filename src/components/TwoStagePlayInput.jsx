import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from './GameStateContext';
import PrimaryPlayFlow from './PrimaryPlayFlow';
import PlayFlowManager from './PlayFlowManager';

const PLAY_TYPES = {
  RUSH: 'rush',
  PASS: 'pass',
  PUNT: 'punt',
  PENALTY: 'penalty',
  KICK: 'kick',
  GAME: 'game'
};

const TwoStagePlayInput = ({ onPlayComplete, onCancel, onPenaltyQueued }) => {
  const { gameState, submitPlay } = useGameState();
  const [currentStage, setCurrentStage] = useState(null);
  const [primaryData, setPrimaryData] = useState({});
  const [secondaryData, setSecondaryData] = useState({});
  const [queuedPenalty, setQueuedPenalty] = useState(false);
  const [secondaryFlowType, setSecondaryFlowType] = useState(null);
  const [originalSecondaryFlowType, setOriginalSecondaryFlowType] = useState(null); // Track original secondary flow

  // Handle keyboard shortcuts for play types
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toUpperCase();
      
      // Handle 'E' key - dual functionality for penalties
      if (key === 'E') {
        event.preventDefault();
        if (currentStage) {
          // Play in progress - queue penalty
          handleQueuePenalty();
        } else {
          // No play active - start penalty play
          initializePlay(PLAY_TYPES.PENALTY);
        }
        return;
      }

      if (currentStage) return; // Don't handle shortcuts during active play
      
      const playTypeMap = {
        'R': PLAY_TYPES.RUSH,
        'P': PLAY_TYPES.PASS,
        'U': PLAY_TYPES.PUNT,
        'E': PLAY_TYPES.PENALTY,
        'K': PLAY_TYPES.KICK,
        'G': PLAY_TYPES.GAME
      };

      if (playTypeMap[key]) {
        event.preventDefault();
        initializePlay(playTypeMap[key]);
      }

      if (event.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStage]);

  const initializePlay = (playType) => {
    setCurrentStage('primary');
    setPrimaryData({ playType, team: gameState.possession });
    setSecondaryData({});
    setSecondaryFlowType(null);
    setOriginalSecondaryFlowType(null); // Reset original secondary flow
  };

  const handleQueuePenalty = () => {
    setQueuedPenalty(true);
    onPenaltyQueued?.(true);
    console.log('Penalty queued for after play completion');
  };

  const handlePrimaryComplete = (data) => {
    console.log('Primary flow completed:', data);
    setPrimaryData(data);
    
    // Determine if we need a secondary flow
    const needsSecondaryFlow = determineSecondaryFlow(data.resultCode);
    
    if (needsSecondaryFlow) {
      setSecondaryFlowType(needsSecondaryFlow);
      setOriginalSecondaryFlowType(needsSecondaryFlow); // Store the original
      setCurrentStage('secondary');
    } else {
      // No secondary flow needed, complete the play
      completePlay({ ...data });
    }
  };

  const handleSecondaryComplete = (data) => {
    console.log('Secondary flow completed:', data);
    setSecondaryData(data);
    
    // Check if this secondary flow needs a terminal flow
    if (data.receptionResult && ['T', 'F', 'O'].includes(data.receptionResult)) {
      // Pass completion that needs terminal flow for tackle/fumble/out of bounds
      setSecondaryFlowType(data.receptionResult);
      setCurrentStage('terminal');
    } else {
      // Complete the play immediately
      const finalData = {
        ...primaryData,
        ...data,
        terminalResult: data.result || data.resultCode
      };
      
      completePlay(finalData);
    }
  };

  const handleTerminalComplete = (data) => {
    console.log('Terminal flow completed:', data);
    
    // Merge all three stages: primary + secondary + terminal
    // Preserve the original primary result as resultCode
    const finalData = {
      ...primaryData,
      ...secondaryData,
      ...data,
      resultCode: primaryData.resultCode, // Preserve original primary result
      terminalResult: data.result || data.resultCode
    };
    
    completePlay(finalData);
  };

  const determineSecondaryFlow = (result) => {
    switch (result) {
      case 'T': return 'T'; // Tackle
      case 'F': return 'F'; // Fumble  
      case 'O': return 'O'; // Out of bounds
      case 'C': return 'C'; // Complete pass
      case '.': return '.'; // End of play
      case 'I': return 'I'; // Incomplete
      case 'S': return 'S'; // Sack
      // Auto-terminal results
      case 'D': return null; // Punt downed
      case 'B': return null; // Punt blocked  
      case 'A': return null; // Penalty accepted
      default: return null;
    }
  };

  const completePlay = (finalData) => {
    console.log('Completing play with final data:', finalData);
    
    if (submitPlay) {
      submitPlay(finalData);
    }
    
    onPlayComplete?.(finalData);
    
    // Handle queued penalty
    if (queuedPenalty) {
      setTimeout(() => {
        setQueuedPenalty(false);
        onPenaltyQueued?.(false);
        initializePlay(PLAY_TYPES.PENALTY);
      }, 100);
    } else {
      resetInput();
    }
  };

  const handleCancel = () => {
    resetInput();
    onCancel?.();
  };

  const resetInput = () => {
    setCurrentStage(null);
    setPrimaryData({});
    setSecondaryData({});
    setSecondaryFlowType(null);
    setOriginalSecondaryFlowType(null); // Reset original secondary flow
    setQueuedPenalty(false);
    onPenaltyQueued?.(false);
  };

  const canEditPrimary = () => {
    return currentStage === 'primary' || (currentStage === 'secondary' && Object.keys(primaryData).length > 0);
  };

  const editPrimary = () => {
    setCurrentStage('primary');
    setSecondaryData({});
    setSecondaryFlowType(null);
    setOriginalSecondaryFlowType(null); // Reset original secondary flow
  };

  const editSecondary = () => {
    setCurrentStage('secondary');
    // Use the original secondary flow type, not the current (which might be terminal)
    setSecondaryFlowType(originalSecondaryFlowType);
  };

  const canEditSecondary = () => {
    return currentStage === 'terminal' && Object.keys(secondaryData).length > 0;
  };

  const handleButtonClick = (playType) => {
    console.log('Button clicked for play type:', playType);
    
    // Handle all play types the same way as keyboard shortcuts
    if (currentStage === 'play_selection') {
      setCurrentStage('primary_input');
      setCurrentPlayType(playType);
      setPrimaryData({});
    }
  };

  // No active play - show play type selection
  if (!currentStage) {
    return (
      <div className="flex flex-col space-y-4 text-center">
        <h3 className="text-lg font-bold">Select Play Type</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button onClick={() => handleButtonClick('rush')} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Rush (R)</button>
          <button onClick={() => handleButtonClick('pass')} className="bg-green-500 text-white p-2 rounded hover:bg-green-600">Pass (P)</button>
          <button onClick={() => handleButtonClick('punt')} className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600">Punt (U)</button>
          <button onClick={() => handleButtonClick('penalty')} className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600">Penalty (E)</button>
          <button onClick={() => handleButtonClick('kick')} className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600">Kick (K)</button>
          <button onClick={() => handleButtonClick('game')} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">Game Control (G)</button>
        </div>
        <p className="text-sm text-gray-600">Or use keyboard shortcuts</p>
        <p className="text-xs text-gray-500">Press 'E' during any play to queue a penalty after play completion</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Play Input</h3>
        <button onClick={handleCancel} className="text-red-500 hover:text-red-700 text-sm">
          Cancel (Esc)
        </button>
      </div>

      {/* Primary Stage - Always Visible Once Started */}
      <div className={`p-4 border-2 rounded-lg ${currentStage === 'primary' ? 'border-blue-500 bg-blue-50' : 'border-blue-300 bg-blue-25'}`}>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-bold text-blue-800">
            Primary: {primaryData.playType?.toUpperCase()}
            {Object.keys(primaryData).length > 0 && <span className="ml-2 text-green-600">✓</span>}
            {queuedPenalty && <span className="ml-2 text-yellow-600">⚠️ PENALTY QUEUED</span>}
          </h4>
          {canEditPrimary() && currentStage !== 'primary' && (
            <button onClick={editPrimary} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">
              Edit
            </button>
          )}
        </div>
        
        {currentStage === 'primary' ? (
          <PrimaryPlayFlow
            playType={primaryData.playType}
            onFlowComplete={handlePrimaryComplete}
            initialData={primaryData} // Pre-populate with existing data
            autoFocus={true}
          />
        ) : (
          <div className="text-sm text-gray-600 p-2 bg-gray-100 rounded">
            {primaryData.playType}: {JSON.stringify(primaryData, null, 2)}
          </div>
        )}
      </div>

      {/* Secondary Stage - Always Show When It Exists */}
      {secondaryFlowType && (
        <div className={`p-4 border-2 rounded-lg ${currentStage === 'secondary' ? 'border-green-500 bg-green-50' : 'border-green-300 bg-green-25'}`}>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-bold text-green-800">
              Secondary: {currentStage === 'secondary' ? secondaryFlowType : originalSecondaryFlowType}
              {Object.keys(secondaryData).length > 0 && <span className="ml-2 text-green-600">✓</span>}
            </h4>
            {Object.keys(secondaryData).length > 0 && currentStage !== 'secondary' && (
              <button onClick={editSecondary} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">
                Edit
              </button>
            )}
          </div>
          
          {currentStage === 'secondary' ? (
            <PlayFlowManager
              initialFlow={secondaryFlowType}
              onFlowComplete={handleSecondaryComplete}
              initialData={secondaryData}
              advancedTracking={true}
              autoFocus={true}
            />
          ) : (
            <div className="text-sm text-gray-600 p-2 bg-gray-100 rounded">
              {JSON.stringify(secondaryData, null, 2)}
            </div>
          )}
        </div>
      )}

      {/* Terminal Stage - Only Show When Needed */}
      {currentStage === 'terminal' && (
        <div className="p-4 border-2 rounded-lg border-red-500 bg-red-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-bold text-red-800">
              Terminal: {secondaryFlowType}
            </h4>
            {canEditSecondary() && (
              <button onClick={editSecondary} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">
                Edit Secondary
              </button>
            )}
          </div>
          
          <PlayFlowManager
            initialFlow={secondaryFlowType}
            onFlowComplete={handleTerminalComplete}
            advancedTracking={true}
            autoFocus={true}
          />
        </div>
      )}

      {/* Submit Section */}
      {currentStage && (
        <div className="p-4 bg-gray-100 rounded border">
          <div className="flex space-x-3">
            <button onClick={handleCancel} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              Cancel Play
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            {currentStage === 'primary' ? 'Complete primary play details' : 
             currentStage === 'secondary' ? 'Complete secondary play details' : 
             currentStage === 'terminal' ? 'Complete terminal play details' :
             'Play ready to submit'}
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoStagePlayInput;

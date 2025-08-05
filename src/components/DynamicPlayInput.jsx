import React, { useState, useEffect } from 'react';
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

const DynamicPlayInput = ({ onPlayComplete, onCancel, onPenaltyQueued }) => {
  const { gameState, submitPlay } = useGameState();
  const [flowChain, setFlowChain] = useState([]); // Array of flow objects
  const [currentFlowIndex, setCurrentFlowIndex] = useState(-1);
  const [queuedPenalty, setQueuedPenalty] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toUpperCase();
      
      if (key === 'E') {
        event.preventDefault();
        if (flowChain.length > 0) {
          handleQueuePenalty();
        } else {
          initializePlay(PLAY_TYPES.PENALTY);
        }
        return;
      }

      if (flowChain.length > 0) return;
      
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
  }, [flowChain]);

  const initializePlay = (playType) => {
    const primaryFlow = {
      id: 0,
      type: 'PRIMARY',
      playType: playType,
      stage: 'primary',
      data: { playType, team: gameState.possession },
      isComplete: false,
      isActive: true
    };
    
    setFlowChain([primaryFlow]);
    setCurrentFlowIndex(0);
  };

  const handleQueuePenalty = () => {
    const penaltyFlow = {
      id: flowChain.length,
      type: 'PENALTY',
      playType: 'penalty',
      stage: 'penalty',
      data: { playType: 'penalty', team: gameState.possession },
      isComplete: false,
      isActive: false,
      queuedDuring: currentFlowIndex
    };
    
    setFlowChain(prev => [...prev, penaltyFlow]);
    setQueuedPenalty(true);
    onPenaltyQueued?.(true);
  };

  const determineNextFlows = (result, currentFlow) => {
    const nextFlows = [];
    
    switch (result) {
      case 'C': // Complete pass
        nextFlows.push({
          id: flowChain.length,
          type: 'COMPLETE',
          stage: 'secondary',
          data: {},
          isComplete: false,
          isActive: false,
          triggeredBy: currentFlow.id
        });
        break;
        
      case 'F': // Fumble
        nextFlows.push({
          id: flowChain.length,
          type: 'FUMBLE', 
          stage: 'secondary',
          data: {},
          isComplete: false,
          isActive: false,
          triggeredBy: currentFlow.id
        });
        break;
        
      case 'T': // Tackle (terminal)
        nextFlows.push({
          id: flowChain.length,
          type: 'TACKLE',
          stage: 'terminal', 
          data: {},
          isComplete: false,
          isActive: false,
          triggeredBy: currentFlow.id
        });
        break;
        
      case 'O': // Out of bounds (terminal)
        nextFlows.push({
          id: flowChain.length,
          type: 'OUT_OF_BOUNDS',
          stage: 'terminal',
          data: {},
          isComplete: false, 
          isActive: false,
          triggeredBy: currentFlow.id
        });
        break;
        
      case '.': // End of play (terminal)
        nextFlows.push({
          id: flowChain.length,
          type: 'END_OF_PLAY',
          stage: 'terminal',
          data: {},
          isComplete: false,
          isActive: false,
          triggeredBy: currentFlow.id
        });
        break;
        
      // Auto-terminal cases (no additional flows needed)
      case 'D': // Punt downed
      case 'B': // Punt blocked
      case 'A': // Penalty accepted
      case 'I': // Incomplete pass
        // These complete immediately with no additional flows
        break;
    }
    
    return nextFlows;
  };

  const handleFlowComplete = (flowIndex, data) => {
    // Update the completed flow
    setFlowChain(prev => prev.map((flow, index) => 
      index === flowIndex 
        ? { ...flow, data: { ...flow.data, ...data }, isComplete: true, isActive: false }
        : flow
    ));

    const currentFlow = flowChain[flowIndex];
    const result = data.resultCode || data.result || data.receptionResult;
    
    // Determine if we need additional flows
    const nextFlows = determineNextFlows(result, currentFlow);
    
    if (nextFlows.length > 0) {
      // Add new flows to the chain
      setFlowChain(prev => [...prev, ...nextFlows]);
      
      // Move to the next flow
      const nextFlowIndex = flowIndex + 1;
      setCurrentFlowIndex(nextFlowIndex);
      activateFlow(nextFlowIndex);
    } else {
      // Check if there are any incomplete flows remaining
      const nextIncompleteIndex = findNextIncompleteFlow(flowIndex);
      
      if (nextIncompleteIndex !== -1) {
        setCurrentFlowIndex(nextIncompleteIndex);
        activateFlow(nextIncompleteIndex);
      } else {
        // All flows complete - submit the play
        completeEntirePlay();
      }
    }
  };

  const findNextIncompleteFlow = (currentIndex) => {
    return flowChain.findIndex((flow, index) => 
      index > currentIndex && !flow.isComplete
    );
  };

  const activateFlow = (flowIndex) => {
    setFlowChain(prev => prev.map((flow, index) => ({
      ...flow,
      isActive: index === flowIndex
    })));
  };

  const editFlow = (flowIndex) => {
    // Deactivate all flows after this one and remove their data
    setFlowChain(prev => prev.map((flow, index) => {
      if (index > flowIndex) {
        return { ...flow, data: {}, isComplete: false, isActive: false };
      } else if (index === flowIndex) {
        return { ...flow, isActive: true, isComplete: false };
      }
      return flow;
    }));
    
    setCurrentFlowIndex(flowIndex);
  };

  const completeEntirePlay = () => {
    // Merge all flow data
    const completePlayData = mergeAllFlowData();
    
    if (submitPlay) {
      submitPlay(completePlayData);
    }
    
    onPlayComplete?.(completePlayData);
    
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

  const mergeAllFlowData = () => {
    let mergedData = {};
    
    flowChain.forEach(flow => {
      if (flow.isComplete && flow.data) {
        mergedData = { ...mergedData, ...flow.data };
        
        // Add flow metadata
        mergedData[`flow_${flow.id}`] = {
          type: flow.type,
          stage: flow.stage,
          id: flow.id
        };
      }
    });
    
    return mergedData;
  };

  const resetInput = () => {
    setFlowChain([]);
    setCurrentFlowIndex(-1);
    setQueuedPenalty(false);
    onPenaltyQueued?.(false);
  };

  const handleCancel = () => {
    resetInput();
    onCancel?.();
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'primary': return 'border-blue-300 bg-blue-50';
      case 'secondary': return 'border-green-300 bg-green-50';
      case 'terminal': return 'border-red-300 bg-red-50';
      case 'penalty': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const renderFlowChainSummary = () => {
    if (flowChain.length <= 1) return null;
    
    return (
      <div className="mb-4 p-3 bg-gray-50 rounded border">
        <div className="text-sm font-bold mb-2">Flow Chain:</div>
        <div className="flex flex-wrap gap-2 items-center text-xs">
          {flowChain.map((flow, index) => (
            <React.Fragment key={flow.id}>
              <span className={`px-2 py-1 rounded ${
                flow.stage === 'primary' ? 'bg-blue-100 text-blue-800' :
                flow.stage === 'secondary' ? 'bg-green-100 text-green-800' :
                flow.stage === 'terminal' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              } ${flow.isComplete ? 'opacity-50' : 'font-bold'}`}>
                [{flow.id}] {flow.type} {flow.isComplete ? '✓' : flow.isActive ? '⏳' : '◦'}
              </span>
              {index < flowChain.length - 1 && (
                <span className="text-gray-400">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // No active play - show play type selection
  if (flowChain.length === 0) {
    return (
      <div className="flex flex-col space-y-4 text-center">
        <h3 className="text-lg font-bold">Select Play Type</h3>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => initializePlay(PLAY_TYPES.RUSH)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Rush (R)</button>
          <button onClick={() => initializePlay(PLAY_TYPES.PASS)} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Pass (P)</button>
          <button onClick={() => initializePlay(PLAY_TYPES.PUNT)} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">Punt (U)</button>
          <button onClick={() => initializePlay(PLAY_TYPES.PENALTY)} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">Penalty (E)</button>
          <button onClick={() => alert('Kick menu not implemented')} className="bg-purple-500 text-white px-4 py-2 rounded">Kick (K)</button>
          <button onClick={() => alert('Game control not implemented')} className="bg-gray-500 text-white px-4 py-2 rounded">Game (G)</button>
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
      
      {renderFlowChainSummary()}
      
      {/* Render all flows */}
      {flowChain.map((flow, index) => (
        <div key={flow.id} className={`p-4 border-2 rounded-lg ${
          flow.isActive ? getStageColor(flow.stage).replace('300', '500') : getStageColor(flow.stage)
        } ${flow.isComplete ? 'opacity-75' : ''}`}>
          
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-bold">
              [{flow.id}] {flow.type}
              {flow.isComplete && <span className="ml-2 text-green-600">✓</span>}
              {queuedPenalty && flow.stage === 'penalty' && <span className="ml-2 text-yellow-600">⚠️ QUEUED</span>}
            </h4>
            {flow.isComplete && (
              <button 
                onClick={() => editFlow(flow.id)}
                className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
              >
                Edit
              </button>
            )}
          </div>
          
          {flow.isActive ? (
            flow.stage === 'primary' ? (
              <PrimaryPlayFlow
                playType={flow.playType}
                onFlowComplete={(data) => handleFlowComplete(flow.id, data)}
                initialData={flow.data}
                autoFocus={true}
              />
            ) : (
              <PlayFlowManager
                initialFlow={flow.type}
                onFlowComplete={(data) => handleFlowComplete(flow.id, data)}
                initialData={flow.data}
                advancedTracking={true}
                autoFocus={true}
              />
            )
          ) : (
            <div className="text-sm text-gray-600 p-2 bg-gray-100 rounded">
              {JSON.stringify(flow.data, null, 2)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DynamicPlayInput;

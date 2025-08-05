import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameState } from './GameStateContext';
import { RESULT_TYPES, getFlowInitForResult, getProcessorForResult } from './PlayResultFlows';
import PlayFlowManager from './PlayFlowManager';

const PLAY_TYPES = {
  RUSH: 'rush',
  PASS: 'pass',
  PUNT: 'punt',
  PENALTY: 'penalty',
  KICK: 'kick',
  GAME: 'game'
};

const VALID_RESULT_CODES = {
  rush: ['T', 'F', 'O', '.'],
  pass: ['C', 'I', 'S', 'F'],
  punt: ['R', 'D', 'C', 'O', 'B'],
  penalty: ['A', 'D', 'O']
};

const PlayInputController = ({ onPlayComplete, onCancel, onPenaltyQueued }) => {
  const { gameState, submitPlay } = useGameState();
  const [currentFlow, setCurrentFlow] = useState(null);
  const [flowChain, setFlowChain] = useState([]);
  const [currentFlowIndex, setCurrentFlowIndex] = useState(-1); // This was missing!
  const [allFlowData, setAllFlowData] = useState({});
  const [queuedPenalty, setQueuedPenalty] = useState(null);
  const [isAwaitingInput, setIsAwaitingInput] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus on input when flow changes
  useEffect(() => {
    if (inputRef.current && currentFlow && !flowChain.length) {
      inputRef.current.focus();
    }
  }, [currentFlow, flowChain]);

  // Handle keyboard shortcuts for play types
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toUpperCase();
      
      // Handle 'E' key - dual functionality for penalties
      if (key === 'E') {
        event.preventDefault();
        if (currentFlow || flowChain.length > 0) {
          // Play in progress - queue penalty for after play completion
          handleQueuePenalty();
        } else {
          // No play active - start penalty play
          initializePlay(PLAY_TYPES.PENALTY);
        }
        return;
      }

      if (currentFlow || flowChain.length > 0) return; // Don't handle other shortcuts during active flow
      
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
  }, [currentFlow, flowChain]);

  const handleQueuePenalty = () => {
    const penaltyKey = addFlowToChain('PENALTY', { 
      queuedDuring: currentFlowIndex,
      queuedAt: Date.now() 
    });
    
    setQueuedPenalty({
      queued: true,
      flowKey: penaltyKey,
      queuedAt: Date.now()
    });
    
    onPenaltyQueued?.(true);
    console.log('Penalty queued as flow', penaltyKey);
  };

  const initializePlay = (playType) => {
    const primaryFlow = {
      key: 0,
      type: playType, // This is correct now
      playType: playType,
      stage: 'primary'
    };
    
    setCurrentFlow(playType);
    setFlowChain([primaryFlow]);
    setCurrentFlowIndex(0);
    setAllFlowData({}); // Start with empty data, not pre-populated
    setIsAwaitingInput(true);
  };

  const addFlowToChain = (flowType, data = {}) => {
    const nextKey = flowChain.length;
    const newFlow = {
      key: nextKey,
      type: flowType,
      stage: getStageForFlow(flowType),
      triggeredBy: currentFlowIndex,
      ...data
    };
    
    setFlowChain(prev => [...prev, newFlow]);
    return nextKey;
  };

  const getStageForFlow = (flowType) => {
    if (flowType === 'PENALTY') return 'penalty';
    if (['TACKLE', 'OUT_OF_BOUNDS', 'END_OF_PLAY'].includes(flowType)) return 'terminal';
    if (['FUMBLE', 'COMPLETE'].includes(flowType)) return 'secondary'; // F and C are continuing flows
    return 'secondary';
  };

  const handleInputChange = (field, value) => {
    const currentFlowData = allFlowData[currentFlowIndex] || {};
    const updatedData = { ...currentFlowData, [field]: value.toUpperCase() };
    setAllFlowData(prev => ({ ...prev, [currentFlowIndex]: updatedData }));
  };

  const getSecondaryFlowForResult = (result) => {
    switch (result) {
      case 'T': return RESULT_TYPES.TACKLE;
      case 'F': return RESULT_TYPES.FUMBLE;
      case 'O': return RESULT_TYPES.OUT_OF_BOUNDS;
      case 'C': return RESULT_TYPES.COMPLETE;
      case '.': return RESULT_TYPES.END_OF_PLAY;
      case 'I': return RESULT_TYPES.INCOMPLETE;
      case 'D': return null; // Punt downed -> auto terminal  
      case 'B': return null; // Punt blocked -> auto terminal
      case 'A': return null; // Penalty accepted -> auto terminal
      case 'R': return null; // Punt return needs continuation flow (not implemented yet)
      default: return null;
    }
  };

  const handleResultSubmit = (result) => {
    const currentFlowData = allFlowData[currentFlowIndex] || {};
    const updatedData = { ...currentFlowData, result };
    setAllFlowData(prev => ({ ...prev, [currentFlowIndex]: updatedData }));
    
    // Determine what flows need to be added based on result
    const nextFlow = getSecondaryFlowForResult(result);
    if (nextFlow) {
      const nextFlowKey = addFlowToChain(nextFlow);
      
      // Automatically transition to the new flow
      setCurrentFlowIndex(nextFlowKey);
    }
  };

  const handleFlowComplete = (flowIndex, finalData) => {
    console.log(`Flow ${flowIndex} completing with data:`, finalData);
    
    // Store the flow data
    setAllFlowData(prev => ({ ...prev, [flowIndex]: finalData }));
    
    const currentFlowObj = flowChain[flowIndex];
    
    // If this was a completion, add the appropriate terminal flow
    if (currentFlowObj.type === RESULT_TYPES.COMPLETE && finalData.receptionResult) {
      addFlowToChain(finalData.receptionResult, {
        terminalFor: flowIndex
      });
    }
    
    // Move to next flow or complete play
    const nextFlowIndex = findNextIncompleteFlow();
    if (nextFlowIndex !== -1) {
      setCurrentFlowIndex(nextFlowIndex);
      transitionToFlow(nextFlowIndex);
    } else {
      completeEntirePlay();
    }
  };

  const findNextIncompleteFlow = () => {
    return flowChain.findIndex((flow, index) => 
      index > currentFlowIndex && !allFlowData[flow.key]
    );
  };

  const transitionToFlow = (flowIndex) => {
    const flow = flowChain[flowIndex];
    console.log(`Transitioning to flow ${flowIndex}:`, flow);
    
    if (flow.type === 'PENALTY') {
      setCurrentFlow(PLAY_TYPES.PENALTY);
    } else {
      setCurrentFlow(flow.type);
    }
  };

  const completeEntirePlay = () => {
    console.log('Completing entire play with all flow data:', allFlowData);
    
    // Merge all flow data in order
    const completePlayData = mergeAllFlowData();
    
    if (submitPlay) {
      submitPlay(completePlayData);
    }
    
    onPlayComplete?.(completePlayData);
    resetController();
  };

  const mergeAllFlowData = () => {
    console.log('Merging flow data from allFlowData:', allFlowData);
    let mergedData = {};
    
    // Process flows in order of their keys
    flowChain.forEach(flow => {
      const flowData = allFlowData[flow.key];
      console.log(`Processing flow ${flow.key}:`, flowData);
      
      if (flowData) {
        // For primary flows, merge all the base play data
        if (flow.stage === 'primary') {
          mergedData = { 
            ...mergedData, 
            ...flowData,
            playType: flow.playType // Ensure playType is preserved
          };
        } else {
          // For secondary/terminal flows, merge but don't override primary data
          mergedData = { 
            ...mergedData, 
            ...flowData
          };
        }
        
        // Add flow metadata for debugging
        mergedData[`flow_${flow.key}`] = {
          type: flow.type,
          stage: flow.stage,
          key: flow.key
        };
      }
    });
    
    console.log('Final merged data:', mergedData);
    return mergedData;
  };

  const handleCancel = () => {
    resetController();
    onCancel?.();
  };

  const resetController = () => {
    setCurrentFlow(null);
    setFlowChain([]);
    setQueuedPenalty(null);
    setIsAwaitingInput(false);
    setAllFlowData({});
    onPenaltyQueued?.(false);
  };

  const getFlowManagerType = (flow) => {
    if (flow.stage === 'primary') {
      return flow.playType;
    } else if (flow.stage === 'penalty') {
      return 'penalty';
    } else {
      return flow.type;
    }
  };

  const renderAllFlows = () => {
    if (flowChain.length === 0) return null;

    return (
      <div className="space-y-4">
        {flowChain.map((flow, index) => {
          const colorMap = {
            primary: 'border-blue-300 bg-blue-50',
            secondary: 'border-green-300 bg-green-50', 
            terminal: 'border-red-300 bg-red-50',
            penalty: 'border-yellow-300 bg-yellow-50'
          };

          const flowData = allFlowData[flow.key];
          // A flow is complete if it has data AND a result code
          const isComplete = flowData && 
                           Object.keys(flowData).length > 0 && 
                           (flowData.result || flowData.resultCode);
          const isCurrentActive = index === currentFlowIndex;

          return (
            <div key={flow.key} className={`p-4 border-2 rounded-lg ${colorMap[flow.stage]} ${isComplete ? 'opacity-75' : ''}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-bold">
                  Flow [{flow.key}]: {flow.stage === 'primary' ? flow.playType.toUpperCase() : flow.type}
                  {isComplete && <span className="ml-2 text-green-600">✓</span>}
                  {queuedPenalty && flow.stage === 'penalty' && <span className="ml-2 text-yellow-600">⚠️ QUEUED</span>}
                </h4>
                {isComplete && (
                  <button 
                    onClick={() => editFlow(flow.key)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {flow.stage === 'primary' ? (
                // For primary flows, use the built-in primary play flow
                <div className="space-y-2">
                  {renderPrimaryPlayInputs(flow.playType)}
                </div>
              ) : (
                // For secondary/terminal flows, use PlayFlowManager
                <PlayFlowManager
                  key={`flow-${flow.key}-${isCurrentActive ? 'active' : 'complete'}`}
                  initialFlow={getFlowManagerType(flow)}
                  onFlowComplete={(data) => handleFlowComplete(flow.key, data)}
                  initialData={allFlowData[flow.key] || {}}
                  readOnly={isComplete && !isCurrentActive}
                  advancedTracking={true}
                  autoFocus={isCurrentActive} // This will auto-focus when flow becomes active
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPrimaryPlayInputs = (playType) => {
    const currentFlowData = allFlowData[currentFlowIndex] || {};
    
    switch (playType) {
      case 'pass':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold">Passer #</label>
              <input
                ref={inputRef}
                type="text"
                value={currentFlowData.passer || ''}
                onChange={e => handleInputChange('passer', e.target.value)}
                className="border px-2 py-1 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-bold">Result (C, I, S, F)</label>
              <input
                type="text"
                maxLength={1}
                value={currentFlowData.result || ''}
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  if (VALID_RESULT_CODES.pass.includes(val)) {
                    handleResultSubmit(val);
                  } else {
                    handleInputChange('result', val);
                  }
                }}
                className="border px-2 py-1 rounded w-full uppercase"
              />
            </div>
          </div>
        );
      case 'rush':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold">Rusher #</label>
              <input
                ref={inputRef}
                type="text"
                value={currentFlowData.rusher || ''}
                onChange={e => handleInputChange('rusher', e.target.value)}
                className="border px-2 py-1 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-bold">Result (T, F, O, .)</label>
              <input
                type="text"
                maxLength={1}
                value={currentFlowData.result || ''}
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  if (VALID_RESULT_CODES.rush.includes(val)) {
                    handleResultSubmit(val);
                  } else {
                    handleInputChange('result', val);
                  }
                }}
                className="border px-2 py-1 rounded w-full uppercase"
              />
            </div>
          </div>
        );
      // Add other play types as needed
      default:
        return <div>Play type: {playType}</div>;
    }
  };

  const canSubmitPlay = () => {
    // Check if all flows have data AND result codes
    const requiredFlows = flowChain.filter(flow => {
      // Don't require penalty flows that are just queued
      if (flow.stage === 'penalty' && queuedPenalty) return false;
      return true;
    });
    
    // Must have at least one flow
    if (requiredFlows.length === 0) return false;
    
    // All flows must be complete with result codes
    const allFlowsComplete = requiredFlows.every(flow => {
      const flowData = allFlowData[flow.key];
      return flowData && 
             Object.keys(flowData).length > 0 && 
             (flowData.result || flowData.resultCode);
    });
    
    if (!allFlowsComplete) return false;
    
    // Additional validation: certain play results MUST have terminal flows
    const primaryFlow = requiredFlows.find(flow => flow.stage === 'primary');
    if (primaryFlow) {
      const primaryData = allFlowData[primaryFlow.key];
      const primaryResult = primaryData?.result || primaryData?.resultCode;
      
      // These results require terminal flows (continuing flows that need resolution)
      const requiresTerminalFlow = ['C', 'F']; // Complete pass, Fumble
      
      if (requiresTerminalFlow.includes(primaryResult)) {
        // Must have at least one terminal flow
        const hasTerminalFlow = requiredFlows.some(flow => 
          flow.stage === 'terminal' && 
          allFlowData[flow.key] && 
          (allFlowData[flow.key].result || allFlowData[flow.key].resultCode)
        );
        
        if (!hasTerminalFlow) {
          console.log(`Play result ${primaryResult} requires a terminal flow but none found`);
          return false;
        }
      }
    }
    
    // Additional validation: fumble flows also require terminal flows
    const fumbleFlows = requiredFlows.filter(flow => 
      flow.type === 'F' || flow.type === 'FUMBLE'
    );
    
    for (const fumbleFlow of fumbleFlows) {
      // Check if this fumble has a corresponding terminal flow
      const fumbleFlowIndex = requiredFlows.indexOf(fumbleFlow);
      const hasSubsequentTerminalFlow = requiredFlows.slice(fumbleFlowIndex + 1).some(flow => 
        flow.stage === 'terminal' && 
        allFlowData[flow.key] && 
        (allFlowData[flow.key].result || allFlowData[flow.key].resultCode)
      );
      
      if (!hasSubsequentTerminalFlow) {
        console.log(`Fumble flow requires a terminal flow but none found`);
        return false;
      }
    }
    
    return true;
  };

  const renderSubmitSection = () => {
    const isComplete = canSubmitPlay();
    
    return (
      <div className="mt-6 p-4 bg-gray-100 rounded border">
        <div className="flex space-x-3">
          <button 
            onClick={completeEntirePlay}
            disabled={!isComplete}
            className={`px-4 py-2 rounded ${
              isComplete 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            }`}
          >
            Submit Complete Play
          </button>
          <button 
            onClick={handleCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel Play
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-600">
          {isComplete ? 
            'All flows complete - ready to submit!' : 
            'Complete all flow sections to submit play'
          }
        </div>
        
        {/* Debug info */}
        <div className="mt-2 text-xs text-gray-500">
          Flows: {flowChain.map(f => `[${f.key}] ${f.type} ${allFlowData[f.key] ? '✓' : '⏳'}`).join(' → ')}
        </div>
      </div>
    );
  };

  const renderFlowChainSummary = () => {
    if (flowChain.length <= 1) return null;
    
    return (
      <div className="mb-4 p-3 bg-gray-50 rounded border">
        <div className="text-sm font-bold mb-2">Flow Chain:</div>
        <div className="flex space-x-2 items-center text-xs">
          {flowChain.map((flow, index) => (
            <React.Fragment key={flow.key}>
              <span className={`px-2 py-1 rounded ${
                flow.stage === 'primary' ? 'bg-blue-100 text-blue-800' :
                flow.stage === 'secondary' ? 'bg-green-100 text-green-800' :
                flow.stage === 'terminal' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800' // penalty
              } ${
                allFlowData[flow.key] ? 'opacity-50' : 'font-bold'
              }`}>
                [{flow.key}] {flow.type} {allFlowData[flow.key] ? '✓' : '⏳'}
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

  const renderCurrentFlow = () => {
    const currentFlowObj = flowChain[currentFlowIndex];
    if (!currentFlowObj) return null;
    
    const colorMap = {
      primary: 'border-blue-300 bg-blue-50',
      secondary: 'border-green-300 bg-green-50', 
      terminal: 'border-red-300 bg-red-50',
      penalty: 'border-yellow-300 bg-yellow-50'
    };
    
    // Determine the correct flow type to pass to PlayFlowManager
    let flowManagerType;
    if (currentFlowObj.stage === 'primary') {
      // For primary flows, use the playType (rush, pass, punt, penalty)
      flowManagerType = currentFlowObj.playType;
    } else if (currentFlowObj.stage === 'penalty') {
      // For penalty flows, use 'penalty'
      flowManagerType = 'penalty';
    } else {
      // For secondary/terminal flows, use the flow type (T, C, F, O, .)
      flowManagerType = currentFlowObj.type;
    }
    
    return (
      <div className={`mb-6 p-4 border-2 rounded-lg ${colorMap[currentFlowObj.stage]}`}>
        <h4 className="text-lg font-bold mb-3">
          Flow [{currentFlowObj.key}]: {currentFlowObj.type}
          {queuedPenalty && <span className="ml-2 text-yellow-600">⚠️ PENALTY QUEUED</span>}
        </h4>
        
        <PlayFlowManager
          key={`flow-${currentFlowObj.key}`}
          initialFlow={flowManagerType}
          onFlowComplete={(data) => handleFlowComplete(currentFlowObj.key, data)}
          advancedTracking={true}
          autoFocus={true}
        />
      </div>
    );
  };

  const memoizedPlayFlowManager = useMemo(() => {
    if (!currentFlow) return null;
    
    return (
      <PlayFlowManager
        initialFlow={currentFlow}
        onFlowComplete={handleFlowComplete}
        advancedTracking={true}
        autoFocus={true}
      />
    );
  }, [currentFlow]); // Only recreate if flow type changes

  if (!currentFlow) {
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
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Play Input</h3>
        <button onClick={handleCancel} className="text-red-500 hover:text-red-700 text-sm">
          Cancel (Esc)
        </button>
      </div>
      
      {renderFlowChainSummary()}
      {renderAllFlows()}
      {renderSubmitSection()}
    </div>
  );
};

export default PlayInputController;
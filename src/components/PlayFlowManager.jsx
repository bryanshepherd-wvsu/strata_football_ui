/**
 * PlayFlowManager - Handles the flow of play input and results in football scoring
 * 
 * Primary Flows (Play Initiation):
 * -------------------------------
 * R - Rush: Running plays
 * P - Pass: Passing plays
 * E - Penalty: Pre-snap penalties
 * K - Kick: Field goals, kickoffs, extra points
 * G - Game Control: Timeouts, challenges, etc.
 * U - Punt: Punt plays
 * 
 * Result Flows:
 * -----------
 * 1. Continuing Flows (Require Additional Input):
 *    - F - Fumble: Ball is fumbled, needs recovery info
 *    - X - Interception: Pass intercepted, needs return info
 *    - L - Lateral: Ball lateraled to another player (future)
 *    These flows continue the play and may lead to terminal flows
 * 
 * 2. Terminal Flows (End the Play):
 *    - T - Tackle: Player(s) making the tackle
 *    - O - Out of Bounds: Player runs/goes out of bounds
 *    - . - End of Play: Natural end of play (touchdown, fair catch, etc.)
 * 
 * Pass-Specific Results:
 * --------------------
 * C - Complete: Pass is caught, leads to reception flow
 * I - Incomplete: Pass is not caught, ends the play
 * 
 * Flow Sequence Example:
 * R (Rush) -> F (Fumble) -> T (Tackle) // Rush with fumble ending in tackle
 * P (Pass) -> C (Complete) -> O (Out of Bounds) // Complete pass ending out of bounds
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  RESULT_TYPES,
  getFlowInitForResult,
  getProcessorForResult
} from './PlayResultFlows';

const PlayFlowManager = ({ 
  initialFlow: initialFlowProp, 
  onFlowComplete, 
  initialData = {},
  readOnly = false,
  disableForcedBy = false, 
  forceForcedBy = false, 
  tacklers = {}, 
  overrideResultType = null, 
  advancedTracking = false, 
  autoFocus = false,
  context = {}
}) => {
  const [formData, setFormData] = useState(initialData);
  const [tackleFormData, setTackleFormData] = useState(initialData.tackleFormData || {});
  const [initialFlow, setInitialFlow] = useState(initialFlowProp);
  const [flowQueue, setFlowQueue] = useState([]);
  const [awaitingNextResultCode, setAwaitingNextResultCode] = useState(false);
  const [resultCodeInput, setResultCodeInput] = useState('');
  const [receptionResultInput, setReceptionResultInput] = useState('');
  const receptionResultRef = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (initialFlow === RESULT_TYPES.COMPLETE && receptionResultRef.current) {
      receptionResultRef.current.focus();
    }
  }, [initialFlow]);

  useEffect(() => {
    const initFlowFunc = getFlowInitForResult(initialFlow, context);
    if (initFlowFunc) {
      setFormData(initFlowFunc({}));
    } else {
      setFormData({});
    }
  }, [initialFlow, context]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (awaitingNextResultCode) {
          if (['T','O','F','.'].includes(resultCodeInput.toUpperCase())) {
            e.preventDefault();
            handleResultCodeSubmit();
          }
        } else {
          e.preventDefault();
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [awaitingNextResultCode, resultCodeInput, formData, initialFlow, flowQueue, forceForcedBy, tacklers, overrideResultType]);

  // Auto-focus on the first input when component mounts or flow changes
  useEffect(() => {
    if (autoFocus && firstInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        firstInputRef.current.focus();
      }, 100);
    }
  }, [initialFlow, autoFocus]);

  // Pre-populate form if we have initial data
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(initialData);
      if (initialData.tackleFormData) {
        setTackleFormData(initialData.tackleFormData);
      }
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    // Don't auto-uppercase receiver numbers
    const val = (field === 'receiver' || field === 'rusher' || field === 'passer') ? value : value.toUpperCase();
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleTackleChange = (field, value) => {
    console.log(`Tackle form change: ${field} = ${value}`);
    setTackleFormData(prev => {
      const updated = { ...prev, [field]: value.toUpperCase() };
      console.log('Updated tackleFormData:', updated);
      return updated;
    });
  };

  const handleCheckboxChange = (field, checked) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  // Remove the side-by-side logic completely
  const handleSubmit = () => {
    console.log('handleSubmit called with:');
    console.log('- formData:', formData);
    console.log('- tackleFormData:', tackleFormData);
    
    let mergedData = { ...formData };

    // Regular tackle flow
    if (flowQueue[0] === RESULT_TYPES.TACKLE || initialFlow === RESULT_TYPES.TACKLE) {
      if (tackleFormData && (tackleFormData.tackler1 || tackleFormData.tackler2 || tackleFormData.spot)) {
        mergedData = { 
          ...mergedData, 
          tackler1: tackleFormData.tackler1 || '',
          tackler2: tackleFormData.tackler2 || '',
          spot: tackleFormData.spot || '',
          tackleType: (tackleFormData.tackler2 && tackleFormData.tackler2.trim() !== '') ? 'ASSISTED' : 'SOLO'
        };
      }
    }

    if (forceForcedBy && (initialFlow === RESULT_TYPES.FUMBLE)) {
      mergedData.forcedBy = tacklers.tackler1 || '';
    }

    if (overrideResultType) {
      mergedData.result = overrideResultType;
    }

    // For tackle flows that are secondary (like after a completion), 
    // set the result as 'T' but let the parent handle preserving the original result
    if (initialFlow === RESULT_TYPES.TACKLE) {
      mergedData.result = 'T';
    }

    const processor = getProcessorForResult(initialFlow, context);
    let processedData = mergedData;
    if (processor) {
      processedData = processor({}, mergedData);
    }

    console.log('PlayFlowManager submitting data:', processedData);

    if (initialFlow === RESULT_TYPES.FUMBLE && formData.returnAttempted === 'Y') {
      setAwaitingNextResultCode(true);
      return;
    }

    // Process queue normally
    if (flowQueue.length > 0) {
      const [nextFlow, ...remainingQueue] = flowQueue;
      setFlowQueue(remainingQueue);
      setInitialFlow(nextFlow);
      setFormData({});
      setTackleFormData({});
    } else {
      // COMPLETE PLAY SUBMISSION AND RESET ALL STATE
      console.log('PlayFlowManager: Completing flow with final data');
      onFlowComplete(processedData);
      
      // Reset all internal state immediately
      setFlowQueue([]);
      setInitialFlow(null);
      setFormData({});
      setTackleFormData({});
      setReceptionResultInput('');
      setAwaitingNextResultCode(false);
      setResultCodeInput('');
    }
  };

  const handleResultCodeSubmit = () => {
    const code = resultCodeInput.toUpperCase();
    let nextFlow = null;
    if (code === 'T') {
      nextFlow = RESULT_TYPES.TACKLE;
    } else if (code === 'O') {
      nextFlow = RESULT_TYPES.OUT_OF_BOUNDS;
    } else if (code === 'F') {
      nextFlow = RESULT_TYPES.FUMBLE;
    } else if (code === '.') {
      // No additional flow; complete
      setAwaitingNextResultCode(false);
      setResultCodeInput('');
      onFlowComplete(formData);
      return;
    } else {
      // Invalid code, do nothing
      return;
    }
    if (nextFlow) {
      setFlowQueue(prevQueue => [...prevQueue, nextFlow]);
      if (nextFlow === RESULT_TYPES.TACKLE) {
        setTackleFormData({});
      }
      setAwaitingNextResultCode(false);
    }
    setResultCodeInput('');
    if (flowQueue.length > 0) {
      const [nextFlowFromQueue, ...remainingQueue] = [...flowQueue, nextFlow];
      setFlowQueue(remainingQueue);
      setInitialFlow(nextFlowFromQueue);
      setFormData({});
    } else {
      setInitialFlow(nextFlow);
      setFormData({});
    }
  };

  const renderResultCodePrompt = () => (
    <div className="space-y-2">
      <div>
        <label className="block font-bold">Enter Next Result Code (T, O, F, .)</label>
        <input
          type="text"
          maxLength={1}
          value={resultCodeInput}
          onChange={e => setResultCodeInput(e.target.value.toUpperCase())}
          className="border px-2 py-1 rounded w-24 uppercase"
        />
      </div>
      <button onClick={handleResultCodeSubmit} className="bg-blue-500 text-white px-3 py-1 rounded" disabled={!['T','O','F','.'].includes(resultCodeInput.toUpperCase())}>Submit</button>
    </div>
  );

  const renderTackleFlow = () => {
    console.log('Rendering tackle flow, current tackleFormData:', tackleFormData);
    return (
      <div className="space-y-2">
        <div>
          <label className="block font-bold">Tackler 1</label>
          <input 
            ref={firstInputRef}
            type="text" 
            value={tackleFormData.tackler1 || ''} 
            onChange={e => {
              console.log('Tackler 1 input change:', e.target.value);
              handleTackleChange('tackler1', e.target.value);
            }} 
            className="border px-2 py-1 rounded w-24" 
            placeholder="Enter #"
          />
        </div>
        <div>
          <label className="block font-bold">Tackler 2 (optional)</label>
          <input 
            type="text" 
            value={tackleFormData.tackler2 || ''} 
            onChange={e => {
              console.log('Tackler 2 input change:', e.target.value);
              handleTackleChange('tackler2', e.target.value);
            }} 
            className="border px-2 py-1 rounded w-24" 
            placeholder="Enter #"
          />
        </div>
        <div>
          <label className="block font-bold">Spot</label>
          <input 
            type="text" 
            value={tackleFormData.spot || ''} 
            onChange={e => {
              console.log('Spot input change:', e.target.value);
              handleTackleChange('spot', e.target.value);
            }} 
            className="border px-2 py-1 rounded w-24" 
            placeholder="V25"
          />
        </div>
      </div>
    );
  };

  const renderFumbleFlow = () => (
    <div className="space-y-2">
      {!disableForcedBy && !forceForcedBy ? (
        <div>
          <label className="block font-bold">Forced By</label>
          <input 
            ref={firstInputRef}
            type="text" 
            value={formData.forcedBy || ''} 
            onChange={e => handleChange('forcedBy', e.target.value)} 
            className="border px-2 py-1 rounded w-24" 
          />
        </div>
      ) : null}
      <div>
        <label className="block font-bold">Recovery Team</label>
        <input 
          ref={!disableForcedBy && !forceForcedBy ? null : firstInputRef}
          type="text" 
          value={formData.recoveryTeam || ''} 
          onChange={e => handleChange('recoveryTeam', e.target.value)} 
          className="border px-2 py-1 rounded w-24" 
        />
      </div>
      <div>
        <label className="block font-bold">Recovery Player</label>
        <input type="text" value={formData.recoveryPlayer || ''} onChange={e => handleChange('recoveryPlayer', e.target.value)} className="border px-2 py-1 rounded w-24" />
      </div>
      <div>
        <label className="block font-bold">Recovery Spot</label>
        <input type="text" value={formData.recoverySpot || ''} onChange={e => handleChange('recoverySpot', e.target.value)} className="border px-2 py-1 rounded w-24" />
      </div>
      <div>
        <label className="block font-bold">Return Attempted?</label>
        <select value={formData.returnAttempted || 'N'} onChange={e => handleChange('returnAttempted', e.target.value)} className="border px-2 py-1 rounded w-24">
          <option value="N">No</option>
          <option value="Y">Yes</option>
        </select>
      </div>
      {formData.returnAttempted === 'Y' && (
        <>
          <div>
            <label className="block font-bold">Returner</label>
            <input type="text" value={formData.returner || ''} onChange={e => handleChange('returner', e.target.value)} className="border px-2 py-1 rounded w-24" />
          </div>
          <div>
            <label className="block font-bold">Return Spot</label>
            <input type="text" value={formData.returnSpot || ''} onChange={e => handleChange('returnSpot', e.target.value)} className="border px-2 py-1 rounded w-24" />
          </div>
          <div>
            <label className="block font-bold">Return Result</label>
            <input type="text" value={formData.returnResult || ''} onChange={e => handleChange('returnResult', e.target.value)} className="border px-2 py-1 rounded w-24" />
          </div>
        </>
      )}
    </div>
  );

  const renderOutOfBoundsFlow = () => (
    <div className="space-y-2">
      <div>
        <label className="block font-bold">Tackler 1 (optional)</label>
        <input 
          ref={firstInputRef}
          type="text" 
          value={formData.tackler1 || ''} 
          onChange={e => handleChange('tackler1', e.target.value)} 
          className="border px-2 py-1 rounded w-24" 
        />
      </div>
      <div>
        <label className="block font-bold">Spot</label>
        <input type="text" value={formData.spot || ''} onChange={e => handleChange('spot', e.target.value)} className="border px-2 py-1 rounded w-24" />
      </div>
    </div>
  );

  const renderEndOfPlayFlow = () => (
    <div className="space-y-2">
      <div>
        <label className="block font-bold">Spot</label>
        <input 
          ref={firstInputRef}
          type="text" 
          value={formData.spot || ''} 
          onChange={e => handleChange('spot', e.target.value)} 
          className="border px-2 py-1 rounded w-24" 
        />
      </div>
    </div>
  );

  const renderIncompleteFlow = () => (
    <div className="space-y-2">
      <div>
        <label className="block font-bold">Intended For</label>
        <input 
          ref={firstInputRef}
          type="text" 
          value={formData.intendedFor || ''} 
          onChange={e => handleChange('intendedFor', e.target.value)} 
          className="border px-2 py-1 rounded w-48" 
        />
      </div>
      {advancedTracking && (
        <div>
          <label className="block font-bold">At</label>
          <input type="text" value={formData.at || ''} onChange={e => handleChange('at', e.target.value)} className="border px-2 py-1 rounded w-48" />
        </div>
      )}
      <div>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!formData.dropped} onChange={e => handleCheckboxChange('dropped', e.target.checked)} />
          <span>Dropped</span>
        </label>
      </div>
      <div>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!formData.brokenUp} onChange={e => handleCheckboxChange('brokenUp', e.target.checked)} />
          <span>Broken Up</span>
        </label>
      </div>
      {formData.brokenUp && (
        <div>
          <label className="block font-bold">Breakup By</label>
          <input type="text" value={formData.breakupBy || ''} onChange={e => handleChange('breakupBy', e.target.value)} className="border px-2 py-1 rounded w-48" />
        </div>
      )}
      <div>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!formData.overthrown} onChange={e => handleCheckboxChange('overthrown', e.target.checked)} />
          <span>Overthrown</span>
        </label>
      </div>
      <div>
        <label className="inline-flex items-center space-x-2">
          <input type="checkbox" checked={!!formData.thrownAway} onChange={e => handleCheckboxChange('thrownAway', e.target.checked)} />
          <span>Thrown Away</span>
        </label>
      </div>
      <div>
        <label className="block font-bold">QB Hurry?</label>
        <select value={formData.qbHurry || 'N'} onChange={e => handleChange('qbHurry', e.target.value)} className="border px-2 py-1 rounded w-24">
          <option value="N">No</option>
          <option value="Y">Yes</option>
        </select>
      </div>
      {formData.qbHurry === 'Y' && (
        <>
          <div>
            <label className="block font-bold">Hurry 1</label>
            <input type="text" value={formData.hurry1 || ''} onChange={e => handleChange('hurry1', e.target.value)} className="border px-2 py-1 rounded w-48" />
          </div>
          <div>
            <label className="block font-bold">Hurry 2 (optional)</label>
            <input type="text" value={formData.hurry2 || ''} onChange={e => handleChange('hurry2', e.target.value)} className="border px-2 py-1 rounded w-48" />
          </div>
        </>
      )}
    </div>
  );

  const renderCompleteFlow = (receptionResultInput, setReceptionResultInput) => {
    const handleReceptionResultChange = (e) => {
      const val = e.target.value.toUpperCase();
      setReceptionResultInput(val);
      setFormData(prev => ({ ...prev, receptionResult: val }));
      if (['T', 'F', 'O', '.'].includes(val)) {
        // Auto-submit when valid reception result is entered
        setTimeout(() => {
          handleReceptionResultSubmit(val);
        }, 0);
      }
    };

    const handleReceptionResultSubmit = (code = receptionResultInput) => {
      // Complete the reception flow immediately when result is entered
      const completeData = {
        ...formData,
        receptionResult: code,
        result: 'C' // Mark this as a complete
      };
      
      console.log('Reception flow completing with:', completeData);
      onFlowComplete(completeData);
    };

    return (
      <div className="space-y-2">
        <div>
          <label className="block font-bold">Receiver</label>
          <input 
            ref={firstInputRef}
            type="text" 
            value={formData.receiver || ''} 
            onChange={e => handleChange('receiver', e.target.value)}
            className="border px-2 py-1 rounded w-48" 
            placeholder="Enter player #"
          />
        </div>
        {advancedTracking && (
          <div>
            <label className="block font-bold">Caught At</label>
            <input type="text" value={formData.caughtAt || ''} onChange={e => handleChange('caughtAt', e.target.value)} className="border px-2 py-1 rounded w-48" />
          </div>
        )}
        <div>
          <label className="block font-bold">Reception Result (T, F, O, .)</label>
          <input
            ref={receptionResultRef}
            type="text"
            maxLength={1}
            value={receptionResultInput}
            onChange={handleReceptionResultChange}
            className="border px-2 py-1 rounded w-24 uppercase"
          />
        </div>
      </div>
    );
  };

  const renderSackFlow = () => {
    console.log('Rendering sack flow, current tackleFormData:', tackleFormData);
    return (
      <div className="space-y-2">
        <div>
          <label className="block font-bold">Sacker 1</label>
          <input 
            ref={firstInputRef}
            type="text" 
            value={tackleFormData.tackler1 || ''} 
            onChange={e => {
              console.log('Sacker 1 input change:', e.target.value);
              handleTackleChange('tackler1', e.target.value);
            }} 
            className="border px-2 py-1 rounded w-24" 
            placeholder="Enter #"
          />
        </div>
        <div>
          <label className="block font-bold">Sacker 2 (optional)</label>
          <input 
            type="text" 
            value={tackleFormData.tackler2 || ''} 
            onChange={e => {
              console.log('Sacker 2 input change:', e.target.value);
              handleTackleChange('tackler2', e.target.value);
            }} 
            className="border px-2 py-1 rounded w-24" 
            placeholder="Enter #"
          />
        </div>
        <div>
          <label className="block font-bold">Spot</label>
          <input 
            type="text" 
            value={tackleFormData.spot || ''} 
            onChange={e => {
              console.log('Sack spot input change:', e.target.value);
              handleTackleChange('spot', e.target.value);
            }} 
            className="border px-2 py-1 rounded w-24" 
            placeholder="V25"
          />
        </div>
      </div>
    );
  };

  const renderSackFumbleFlow = () => {
    // For sack fumbles, start with sack data (tacklers) then move to fumble recovery
    const isSackPhase = !formData.recoveryTeam; // If no recovery team entered yet, we're in sack phase
    
    if (isSackPhase) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-bold text-purple-600 mb-2">Sack Fumble - Enter Sackers</div>
          <div>
            <label className="block font-bold">Sacker 1</label>
            <input 
              ref={firstInputRef}
              type="text" 
              value={formData.tackler1 || ''} 
              onChange={e => handleChange('tackler1', e.target.value)} 
              className="border px-2 py-1 rounded w-24" 
              placeholder="Enter #"
            />
          </div>
          <div>
            <label className="block font-bold">Sacker 2 (optional)</label>
            <input 
              type="text" 
              value={formData.tackler2 || ''} 
              onChange={e => handleChange('tackler2', e.target.value)} 
              className="border px-2 py-1 rounded w-24" 
              placeholder="Enter #"
            />
          </div>
          <button 
            onClick={() => {
              // Auto-fill forcedBy with primary sacker and move to fumble phase
              setFormData(prev => ({ 
                ...prev, 
                forcedBy: prev.tackler1 || '',
                sackPhaseComplete: true 
              }));
            }}
            className="bg-blue-500 text-white px-3 py-1 rounded mt-2"
            disabled={!formData.tackler1}
          >
            Continue to Fumble Recovery
          </button>
        </div>
      );
    }

    // Fumble recovery phase - hide forced by since it's auto-filled
    return (
      <div className="space-y-2">
        <div className="text-sm font-bold text-purple-600 mb-2">Sack Fumble - Recovery Info</div>
        <div className="text-xs text-gray-600 mb-2">
          Forced by: {formData.forcedBy} (auto-filled from sacker)
        </div>
        <div>
          <label className="block font-bold">Recovery Team</label>
          <input 
            type="text" 
            value={formData.recoveryTeam || ''} 
            onChange={e => handleChange('recoveryTeam', e.target.value)} 
            className="border px-2 py-1 rounded w-24" 
          />
        </div>
        <div>
          <label className="block font-bold">Recovery Player</label>
          <input type="text" value={formData.recoveryPlayer || ''} onChange={e => handleChange('recoveryPlayer', e.target.value)} className="border px-2 py-1 rounded w-24" />
        </div>
        <div>
          <label className="block font-bold">Recovery Spot</label>
          <input type="text" value={formData.recoverySpot || ''} onChange={e => handleChange('recoverySpot', e.target.value)} className="border px-2 py-1 rounded w-24" />
        </div>
        <div>
          <label className="block font-bold">Return Attempted?</label>
          <select value={formData.returnAttempted || 'N'} onChange={e => handleChange('returnAttempted', e.target.value)} className="border px-2 py-1 rounded w-24">
            <option value="N">No</option>
            <option value="Y">Yes</option>
          </select>
        </div>
        {formData.returnAttempted === 'Y' && (
          <>
            <div>
              <label className="block font-bold">Returner</label>
              <input type="text" value={formData.returner || ''} onChange={e => handleChange('returner', e.target.value)} className="border px-2 py-1 rounded w-24" />
            </div>
            <div>
              <label className="block font-bold">Return Spot</label>
              <input type="text" value={formData.returnSpot || ''} onChange={e => handleChange('returnSpot', e.target.value)} className="border px-2 py-1 rounded w-24" />
            </div>
            <div>
              <label className="block font-bold">Return Result</label>
              <input type="text" value={formData.returnResult || ''} onChange={e => handleChange('returnResult', e.target.value)} className="border px-2 py-1 rounded w-24" />
            </div>
          </>
        )}
      </div>
    );
  };

  const flowRenderMap = {
    [RESULT_TYPES.TACKLE]: renderTackleFlow,
    [RESULT_TYPES.FUMBLE]: context.isSackFumble || context.playType === 'pass' ? renderSackFumbleFlow : renderFumbleFlow,
    [RESULT_TYPES.OUT_OF_BOUNDS]: renderOutOfBoundsFlow,
    [RESULT_TYPES.END_OF_PLAY]: renderEndOfPlayFlow,
    [RESULT_TYPES.INCOMPLETE]: renderIncompleteFlow,
    [RESULT_TYPES.COMPLETE]: () => renderCompleteFlow(receptionResultInput, setReceptionResultInput),
    [RESULT_TYPES.SACK]: renderSackFlow
  };

  // Determine if we have a queued TACKLE flow and current flow is COMPLETE
  const hasQueuedTackle = flowQueue.includes(RESULT_TYPES.TACKLE);
  const isCurrentComplete = initialFlow === RESULT_TYPES.COMPLETE;

  // Render the Submit button separately
  const renderSubmitButton = () => (
    <button onClick={handleSubmit} className="bg-green-500 text-white px-3 py-1 rounded mt-4">Submit</button>
  );

  // Render logic: If on COMPLETE and TACKLE is queued, only render the tackle flow after submit is pressed.
  // Otherwise, render the normal flow.
  const renderWithReadOnlySupport = (component) => {
    if (readOnly) {
      return (
        <div className="opacity-60 pointer-events-none">
          {component}
          <div className="absolute inset-0 bg-gray-200 opacity-30 pointer-events-none"></div>
        </div>
      );
    }
    return component;
  };

  return (
    <div className="relative">
      {renderWithReadOnlySupport(
        <div className="p-4 border border-black rounded bg-white shadow">
          {awaitingNextResultCode ? (
            renderResultCodePrompt()
          ) : (
            flowRenderMap[initialFlow] ? flowRenderMap[initialFlow]() : <div>Invalid Flow Type</div>
          )}
          {!readOnly && <div className="mt-4">{renderSubmitButton()}</div>}
        </div>
      )}
    </div>
  );
};

export default PlayFlowManager;
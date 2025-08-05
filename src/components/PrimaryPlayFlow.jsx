import React, { useState, useEffect, useRef } from 'react';
import GameControlFlow from './GameControlFlow';
import PenaltyTable from './PenaltyTable';
import PenaltyEnforcementFlow from './PenaltyEnforcementFlow';
import KickoffOutOfBoundsFlow from './KickoffOutOfBoundsFlow';
import KickoffReturnFlow from './KickoffReturnFlow';
import { useGameState } from './GameStateContext';

const validResultCodes = new Set(['T', 'F', 'O', '.', 'C', 'I', 'S', 'F', 'R', 'D', 'B', 'A', 'D', 'O', 'G', 'N']);

const PrimaryPlayFlow = ({ playType, onFlowComplete, autoFocus, initialData = {} }) => {
  const [formData, setFormData] = useState(initialData);
  const [showPenaltyTable, setShowPenaltyTable] = useState(false);
  const [showEnforcement, setShowEnforcement] = useState(false);
  const [showKickoffOOB, setShowKickoffOOB] = useState(false);
  const [showKickoffReturn, setShowKickoffReturn] = useState(false);
  const [pendingPenaltyData, setPendingPenaltyData] = useState(null);
  const [pendingKickoffData, setPendingKickoffData] = useState(null);

  // Get gameState from context
  const { gameState, gameConfig } = useGameState();

  const inputRef = useRef(null);

  useEffect(() => {
    setFormData({});
  }, [playType]);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [playType, autoFocus]);

  const handleChange = (field, value) => {
    const val = value.toUpperCase();
    setFormData(prev => {
      const updatedForm = { ...prev, [field]: val };
      return updatedForm;
    });
    
    // Auto-submit when a valid result code is entered
    if (field === 'result' && val && validResultCodes.has(val)) {
      setTimeout(() => {
        const finalForm = { ...formData, [field]: val };
        
        // Special handling for kickoff return
        if ((playType === 'kickoff' || finalForm.kickType === 'kickoff') && val === 'R') {
          handleKickoffReturn(finalForm);
          return;
        }
        
        handleSubmit(finalForm);
      }, 0);
    }
  };

  const handleKickoffReturn = (form) => {
    // For kickoffs, the current possession team is KICKING
    // The opposite team is RECEIVING  
    const kickingTeam = gameState.possession; // Team that currently has the ball kicks it away
    const receivingTeam = kickingTeam === 'H' ? 'V' : 'H'; // Opposite team receives
    
    console.log('Kickoff return setup:', { 
      currentPossession: gameState.possession,
      kickingTeam, 
      receivingTeam,
      formData: form 
    });
    
    const kickoffData = {
      ...form,
      resultCode: form.result,
      playType: 'kickoff',
      team: kickingTeam, // Team performing the kickoff action
      kickingTeam: kickingTeam, // Team that kicked
      receivingTeam: receivingTeam // Team that receives and will get possession
    };
    
    console.log('Kickoff data being passed to return flow:', kickoffData);
    setPendingKickoffData(kickoffData);
    setShowKickoffReturn(true);
  };

  const handleKickoffReturnComplete = (returnData) => {
    const finalKickoffData = {
      ...pendingKickoffData,
      returner: returnData.returner,
      returnResult: returnData.returnResult,
      spot: returnData.spot,
      terminalResult: returnData.returnResult,
      tackler1: returnData.tackler1,
      tackler2: returnData.tackler2
    };
    
    // CORRECT: Set possession to receiving team (who actually received the kickoff)
    finalKickoffData.possession = finalKickoffData.receivingTeam;
    finalKickoffData.down = 1;
    finalKickoffData.distance = 10;
    finalKickoffData.finalSpot = returnData.spot;
    
    // CRITICAL: Update game phase to end kickoff phase
    finalKickoffData.gamePhase = 'DRIVE';
    
    setShowKickoffReturn(false);
    setPendingKickoffData(null);
    onFlowComplete(finalKickoffData);
  };

  const handleSubmit = (form = formData) => {
    // For kickoff special scenarios (T, C, D), handle touchback logic
    if ((playType === 'kickoff' || form.kickType === 'kickoff') && ['T', 'C', 'D'].includes(form.result)) {
      // Determine teams based on current game state possession
      const kickingTeam = gameState.possession; // Current team with possession is kicking
      const receivingTeam = kickingTeam === 'H' ? 'V' : 'H'; // Opposite team receives
      
      console.log('Processing kickoff touchback/fair catch/downed:', { kickingTeam, receivingTeam });
      
      const kickoffData = {
        ...form,
        resultCode: form.result,
        team: kickingTeam, // Set team field
        kickingTeam: kickingTeam, // Set kickingTeam field  
        receivingTeam: receivingTeam // Set receivingTeam field
      };
      
      // Determine touchback spot based on game level (NCAA vs HS)
      const touchbackSpot = gameConfig?.gameLevel === 'NCAA' ? 25 : 20;
      const receivingTeamSide = receivingTeam;
      
      // Handle different result codes
      if (form.result === 'T') {
        // True touchback - ball goes to touchback spot
        kickoffData.finalSpot = `${receivingTeamSide}${touchbackSpot}`;
        kickoffData.possession = receivingTeam; // Transfer possession
        kickoffData.down = 1;
        kickoffData.distance = 10;
        kickoffData.isTouchback = true; // Mark as touchback for stats
        kickoffData.gamePhase = 'DRIVE'; // End kickoff phase
      } else if (form.result === 'C' || form.result === 'D') {
        // Fair catch or downed - check if it should be automatic touchback
        const kickedTo = form.kickedTo || '';
        if (kickedTo) {
          const kickedToSide = kickedTo[0];
          const kickedToYard = parseInt(kickedTo.slice(1));
          
          // If downed/fair caught in receiving team's end zone or between 0-touchback spot
          if (kickedToSide === receivingTeam && kickedToYard <= touchbackSpot) {
            // Automatic touchback due to field position
            kickoffData.finalSpot = `${receivingTeam}${touchbackSpot}`;
            kickoffData.isAutomaticTouchback = true; // Different flag for automatic touchbacks
            kickoffData.possession = receivingTeam; // Transfer possession
            kickoffData.down = 1;
            kickoffData.distance = 10;
            kickoffData.gamePhase = 'DRIVE'; // End kickoff phase
          } else {
            // Ball spotted where kicked to
            kickoffData.finalSpot = kickedTo;
            kickoffData.possession = receivingTeam; // Transfer possession
            kickoffData.down = 1;
            kickoffData.distance = 10;
            kickoffData.gamePhase = 'DRIVE'; // End kickoff phase
          }
        }
      }
      
      onFlowComplete(kickoffData);
      return;
    }

    // For kickoff out of bounds, show special flow
    if ((playType === 'kickoff' || form.kickType === 'kickoff') && form.result === 'O') {
      const kickingTeam = gameState.possession; // Current team with possession is kicking
      const receivingTeam = kickingTeam === 'H' ? 'V' : 'H'; // Opposite team receives
      
      const kickoffData = {
        ...form,
        resultCode: form.result,
        team: kickingTeam, // Set team field
        kickingTeam: kickingTeam, // Set kickingTeam field
        receivingTeam: receivingTeam // Set receivingTeam field
      };
      setPendingKickoffData(kickoffData);
      setShowKickoffOOB(true);
      return;
    }

    // For penalties, show enforcement confirmation if result is accepted
    if (playType === 'penalty' && form.result === 'A') {
      // Ensure we include all penalty data from the table selection
      const fullPenaltyData = {
        ...form,
        resultCode: form.result,
        penaltyCode: form.penaltyCode,
        penaltyName: form.penaltyName || getPenaltyNameFromCode(form.penaltyCode), // lookup from table
        yards: form.yards || getPenaltyYardsFromCode(form.penaltyCode), // lookup from table
        downEffect: form.downEffect || 'Repeat',
        team: form.team,
        playerNumber: form.playerNumber
      };
      
      console.log('Full penalty data for enforcement:', fullPenaltyData);
      setPendingPenaltyData(fullPenaltyData);
      setShowEnforcement(true);
      return;
    }

    // Pass formData with additional field resultCode set to formData.result
    onFlowComplete({ ...form, resultCode: form.result });
  };

  const handleKickoffOOBComplete = (finalKickoffData) => {
    setShowKickoffOOB(false);
    setPendingKickoffData(null);
    onFlowComplete(finalKickoffData);
  };

  // Helper functions to lookup penalty data from code
  const getPenaltyNameFromCode = (code) => {
    const penalties = {
      'FS': 'False Start',
      'OH': 'Holding (Offensive)',
      'DH': 'Holding (Defensive)',
      'OPI': 'Pass Interference (Offensive)',
      'DPI': 'Pass Interference (Defensive)',
      'FM': 'Facemask',
      'RTP': 'Roughing the Passer',
      'UC': 'Unsportsmanlike Conduct',
      'PF': 'Personal Foul',
      'TGT': 'Targeting',
      'SP': 'Spearing',
      'HCT': 'Horse Collar Tackle',
      'OS': 'Offside',
      'EN': 'Encroachment',
      'DOG': 'Delay of Game'
    };
    return penalties[code] || code;
  };

  const getPenaltyYardsFromCode = (code) => {
    const penaltyYards = {
      'FS': 5,
      'OH': 10,
      'DH': 5,
      'OPI': 15,
      'DPI': 'Spot',
      'FM': 15,
      'RTP': 15,
      'UC': 15,
      'PF': 15,
      'TGT': 15,
      'SP': 15,
      'HCT': 15,
      'OS': 5,
      'EN': 5,
      'DOG': 5
    };
    return penaltyYards[code] || 5;
  };

  const handleEnforcementComplete = (finalPenaltyData) => {
    setShowEnforcement(false);
    setPendingPenaltyData(null);
    onFlowComplete(finalPenaltyData);
  };

  const handlePenaltySelect = (penaltyData) => {
    setFormData(prev => ({
      ...prev,
      penaltyCode: penaltyData.code,
      penaltyName: penaltyData.name,
      yards: penaltyData.yards,
      downEffect: penaltyData.down,
      playerNumber: ''
    }));
    setShowPenaltyTable(false);
  };

  const handleKickTypeSelect = (kickType) => {
    setFormData(prev => ({
      ...prev,
      kickType: kickType,
      playType: kickType
    }));
  };

  const inputGridClass = "grid grid-cols-4 gap-4";

  const renderRushFlow = () => (
    <div className={inputGridClass}>
      <div>
        <label className="block font-bold">Rusher #</label>
        <input
          type="text"
          value={formData.rusher || ''}
          onChange={e => handleChange('rusher', e.target.value)}
          className="border px-2 py-1 rounded w-24"
          ref={inputRef}
        />
      </div>
      <div>
        <label className="block font-bold">Result (T, F, O, .)</label>
        <input
          type="text"
          value={formData.result || ''}
          onChange={e => handleChange('result', e.target.value)}
          className="border px-2 py-1 rounded w-24 uppercase"
        />
      </div>
    </div>
  );

  const renderPassFlow = () => (
    <div className={inputGridClass}>
      <div>
        <label className="block font-bold">Passer #</label>
        <input
          type="text"
          value={formData.passer || ''}
          onChange={e => handleChange('passer', e.target.value)}
          className="border px-2 py-1 rounded w-24"
          ref={inputRef}
        />
      </div>
      <div>
        <label className="block font-bold">Result (C, I, S, F)</label>
        <input
          type="text"
          value={formData.result || ''}
          onChange={e => handleChange('result', e.target.value)}
          className="border px-2 py-1 rounded w-24 uppercase"
        />
      </div>
    </div>
  );

  const renderPuntFlow = () => (
    <div className={inputGridClass}>
      <div>
        <label className="block font-bold">Punter #</label>
        <input
          type="text"
          onChange={e => handleChange('punter', e.target.value)}
          className="border px-2 py-1 rounded w-24"
          ref={inputRef}
        />
      </div>
      <div>
        <label className="block font-bold">Punted To Spot</label>
        <input
          type="text"
          onChange={e => handleChange('puntedTo', e.target.value)}
          className="border px-2 py-1 rounded w-24"
        />
      </div>
      <div>
        <label className="block font-bold">Result (R, D, C, O, B)</label>
        <input
          type="text"
          onChange={e => handleChange('result', e.target.value)}
          className="border px-2 py-1 rounded w-24 uppercase"
        />
      </div>
    </div>
  );

  const renderPenaltyFlow = () => {
    if (showEnforcement && pendingPenaltyData) {
      return (
        <PenaltyEnforcementFlow
          penaltyData={pendingPenaltyData}
          gameState={gameState}
          onEnforcementComplete={handleEnforcementComplete}
        />
      );
    }

    return (
      <div className="space-y-4">
        {showPenaltyTable ? (
          <div className="mb-4">
            <PenaltyTable onPenaltySelect={handlePenaltySelect} />
            <button 
              onClick={() => setShowPenaltyTable(false)}
              className="mt-2 bg-gray-500 text-white px-3 py-1 rounded"
            >
              Close Table
            </button>
          </div>
        ) : (
          <div className={inputGridClass}>
            <div>
              <label className="block font-bold">Penalty Code</label>
              <input
                type="text"
                value={formData.penaltyCode || ''}
                onChange={e => handleChange('penaltyCode', e.target.value)}
                className="border px-2 py-1 rounded w-24"
                ref={inputRef}
              />
              <button 
                onClick={() => setShowPenaltyTable(true)}
                className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded"
              >
                Table
              </button>
            </div>
            <div>
              <label className="block font-bold">Team (H or V)</label>
              <input
                type="text"
                value={formData.team || ''}
                onChange={e => handleChange('team', e.target.value)}
                className="border px-2 py-1 rounded w-24 uppercase"
              />
            </div>
            <div>
              <label className="block font-bold">Player #</label>
              <input
                type="text"
                value={formData.playerNumber || ''}
                onChange={e => handleChange('playerNumber', e.target.value)}
                className="border px-2 py-1 rounded w-24"
                placeholder="##"
              />
            </div>
            <div>
              <label className="block font-bold">Result (A, D, O)</label>
              <input
                type="text"
                value={formData.result || ''}
                onChange={e => handleChange('result', e.target.value)}
                className="border px-2 py-1 rounded w-24 uppercase"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderKickFlow = () => (
    <div className="space-y-4">
      <h4 className="text-lg font-bold text-center">Select Kick Type</h4>
      <div className="grid grid-cols-3 gap-4">
        <button 
          onClick={() => handleKickTypeSelect('kickoff')} 
          className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600 font-bold"
        >
          Kickoff (O)
        </button>
        <button 
          onClick={() => handleKickTypeSelect('punt')} 
          className="bg-purple-500 text-white p-3 rounded hover:bg-purple-600 font-bold"
        >
          Punt (U)
        </button>
        <button 
          onClick={() => handleKickTypeSelect('field_goal')} 
          className="bg-green-500 text-white p-3 rounded hover:bg-green-600 font-bold"
        >
          Field Goal (F)
        </button>
      </div>
      <p className="text-sm text-center text-gray-600">Or use keyboard shortcuts: O, U, F</p>
    </div>
  );

  const renderKickoffFlow = () => {
    if (showKickoffOOB && pendingKickoffData) {
      return (
        <KickoffOutOfBoundsFlow
          kickoffData={pendingKickoffData}
          onOptionSelect={handleKickoffOOBComplete}
        />
      );
    }

    if (showKickoffReturn && pendingKickoffData) {
      return (
        <KickoffReturnFlow
          kickoffData={pendingKickoffData}
          onReturnComplete={handleKickoffReturnComplete}
        />
      );
    }

    return (
      <div className={inputGridClass}>
        <div>
          <label className="block font-bold">Kicker #</label>
          <input
            type="text"
            value={formData.kicker || ''}
            onChange={e => handleChange('kicker', e.target.value)}
            className="border px-2 py-1 rounded w-24"
            ref={inputRef}
            autoFocus={autoFocus}
          />
        </div>
        <div>
          <label className="block font-bold">Kicked To</label>
          <input
            type="text"
            value={formData.kickedTo || ''}
            onChange={e => handleChange('kickedTo', e.target.value)}
            className="border px-2 py-1 rounded w-24"
            placeholder="V5"
          />
        </div>
        <div>
          <label className="block font-bold">Result (R, O, T, C, D)</label>
          <input
            type="text"
            value={formData.result || ''}
            onChange={e => handleChange('result', e.target.value)}
            className="border px-2 py-1 rounded w-24 uppercase"
          />
        </div>
      </div>
    );
  };

  const renderFieldGoalFlow = () => (
    <div className={inputGridClass}>
      <div>
        <label className="block font-bold">Kicker #</label>
        <input
          type="text"
          value={formData.kicker || ''}
          onChange={e => handleChange('kicker', e.target.value)}
          className="border px-2 py-1 rounded w-24"
          ref={inputRef}
        />
      </div>
      <div>
        <label className="block font-bold">Distance</label>
        <input
          type="text"
          value={formData.distance || ''}
          onChange={e => handleChange('distance', e.target.value)}
          className="border px-2 py-1 rounded w-24"
          placeholder="35"
        />
      </div>
      <div>
        <label className="block font-bold">Result (G, N, B)</label>
        <input
          type="text"
          value={formData.result || ''}
          onChange={e => handleChange('result', e.target.value)}
          className="border px-2 py-1 rounded w-24 uppercase"
        />
      </div>
    </div>
  );

  const renderGameFlow = () => (
    <GameControlFlow
      onFlowComplete={onFlowComplete}
      autoFocus={true}
      initialData={formData}
    />
  );

  // Add keyboard shortcuts for kick menu
  useEffect(() => {
    if (playType === 'kick' && !formData.kickType) {
      const handleKickKeyPress = (e) => {
        const key = e.key.toUpperCase();
        if (key === 'O') {
          e.preventDefault();
          handleKickTypeSelect('kickoff');
        } else if (key === 'U') {
          e.preventDefault();
          handleKickTypeSelect('punt');
        } else if (key === 'F') {
          e.preventDefault();
          handleKickTypeSelect('field_goal');
        }
      };

      window.addEventListener('keydown', handleKickKeyPress);
      return () => window.removeEventListener('keydown', handleKickKeyPress);
    }
  }, [playType, formData.kickType]);

  // Add Enter key handling for all flows
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        
        // For kickoff flows, check if we have minimum required data
        if (playType === 'kickoff' || formData.kickType === 'kickoff') {
          if (formData.kicker && formData.kickedTo && formData.result) {
            const finalForm = { ...formData };
            
            if (formData.result === 'R') {
              handleKickoffReturn(finalForm);
            } else {
              handleSubmit(finalForm);
            }
          }
        } else {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playType, formData]);

  const flowRenderMap = {
    rush: renderRushFlow,
    pass: renderPassFlow,
    punt: renderPuntFlow,
    penalty: renderPenaltyFlow,
    kick: formData.kickType ? 
      (formData.kickType === 'kickoff' ? renderKickoffFlow :
       formData.kickType === 'field_goal' ? renderFieldGoalFlow :
       formData.kickType === 'punt' ? renderPuntFlow : renderKickFlow) : 
      renderKickFlow,
    kickoff: renderKickoffFlow,
    field_goal: renderFieldGoalFlow,
    game: renderGameFlow
  };

  return (
    <div className={`p-4 border border-black rounded shadow ${playType === 'penalty' ? 'bg-yellow-400' : 'bg-white'}`}>
      {flowRenderMap[playType] ? flowRenderMap[playType]() : <div>Invalid Play Type</div>}
    </div>
  );
};

export default PrimaryPlayFlow;
import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from './GameStateContext';
import TimeInput from './TimeInput';
import CoinTossFlow from './CoinTossFlow';

const GameControlFlow = ({ onFlowComplete, autoFocus, initialData = {} }) => {
  const { gameState, setGameState } = useGameState();
  const [formData, setFormData] = useState(initialData);
  const [controlType, setControlType] = useState(initialData.controlType || '');
  const [gameConfig, setGameConfig] = useState({ gameLevel: 'HS' });
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Add keyboard event handling for game control shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts if we're at the control type selection level
      if (controlType) return;
      
      const key = event.key.toUpperCase();
      
      const controlTypeMap = {
        'T': 'timeout',
        'Q': 'quarter', 
        'H': 'half_end',
        'N': 'half_new',
        'U': 'uniform',
        'B': 'ball_placement',
        ';': 'game_time',
        'P': 'possession',
        '>': 'drive_start'
      };

      if (controlTypeMap[key]) {
        event.preventDefault();
        handleControlTypeChange(controlTypeMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlType]);

  const handleChange = (field, value) => {
    const updatedData = { ...formData, [field]: value.toUpperCase() };
    setFormData(updatedData);
  };

  const handleControlTypeChange = (type) => {
    setControlType(type);
    setFormData({ ...formData, controlType: type });
  };

  const handleSubmit = () => {
    const finalData = {
      playType: 'game',
      controlType: controlType,
      ...formData,
      resultCode: 'G',
      timestamp: new Date().toISOString()
    };

    applyGameControlChanges(finalData);
    onFlowComplete(finalData);
  };

  const applyGameControlChanges = (controlData) => {
    console.log('Applying game control changes:', controlData);
    
    setGameState(prev => {
      let updated = { ...prev };

      // Handle coin toss data updates first
      if (controlData.updateGameState) {
        console.log('Applying updateGameState function');
        updated = controlData.updateGameState(updated);
      }

      switch (controlData.controlType) {
        case 'coin_toss':
          // Coin toss data is already handled by updateGameState above
          console.log('Coin toss completed, gameState updated:', updated);
          break;
          
        case 'timeout':
          if (controlData.timeoutTeam && ['H', 'V'].includes(controlData.timeoutTeam)) {
            updated.timeouts[controlData.timeoutTeam] = Math.max(0, updated.timeouts[controlData.timeoutTeam] - 1);
          }
          if (controlData.timeoutTeam === 'CHALLENGE') {
            // Handle challenge timeout - this would be determined by challenge result
            // For now, don't deduct timeout until challenge result is known
          }
          updated.clock = controlData.timeRemaining || updated.clock;
          break;

        case 'quarter':
          updated.quarter = controlData.newQuarter;
          updated.clock = controlData.newClock || '15:00';
          break;

        case 'half_end':
          updated.quarter = 2;
          updated.clock = '00:00';
          break;

        case 'half_new':
          updated.quarter = 3;
          updated.clock = '15:00';
          updated.possession = controlData.newPossession || updated.possession;
          updated.down = 1;
          updated.distance = 10;
          updated.spot = controlData.kickoffSpot || 'H35';
          break;

        case 'uniform':
          // Uniform changes don't affect game state directly
          break;

        case 'ball_placement':
          updated.down = controlData.newDown;
          updated.distance = controlData.newDistance;
          updated.spot = controlData.newSpot;
          break;

        case 'game_time':
          updated.clock = controlData.newClock;
          break;

        case 'possession':
          updated.possession = controlData.newPossession;
          break;

        case 'drive_start':
          updated.driveStart = `Q${updated.quarter} ${updated.clock}, ${updated.spot}`;
          updated.driveNumber = (updated.driveNumber || 0) + 1;
          updated.drivePlays = 0;
          updated.driveYards = 0;
          updated.driveTime = updated.clock;
          break;
      }

      return updated;
    });
  };

  const renderControlTypeSelection = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">Select Game Control Type:</div>
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={() => handleControlTypeChange('timeout')}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          (T) Timeout
        </button>
        <button 
          onClick={() => handleControlTypeChange('quarter')}
          className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
        >
          (Q) Set Quarter
        </button>
        <button 
          onClick={() => handleControlTypeChange('half_end')}
          className="bg-orange-500 text-white p-2 rounded hover:bg-orange-600"
        >
          (H) End Half
        </button>
        <button 
          onClick={() => handleControlTypeChange('half_new')}
          className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
        >
          (N) New Half
        </button>
        <button 
          onClick={() => handleControlTypeChange('uniform')}
          className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600"
        >
          (U) Uniform Change
        </button>
        <button 
          onClick={() => handleControlTypeChange('ball_placement')}
          className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
        >
          (B) Ball Placement
        </button>
        <button 
          onClick={() => handleControlTypeChange('game_time')}
          className="bg-indigo-500 text-white p-2 rounded hover:bg-indigo-600"
        >
          (;) Game Time
        </button>
        <button 
          onClick={() => handleControlTypeChange('possession')}
          className="bg-pink-500 text-white p-2 rounded hover:bg-pink-600"
        >
          (P) Possession
        </button>
        <button 
          onClick={() => handleControlTypeChange('drive_start')}
          className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
        >
          (&gt;) Drive Start
        </button>
      </div>
    </div>
  );

  const renderTimeoutFlow = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">Timeout</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button 
          onClick={() => handleChange('timeoutTeam', 'H')}
          className={`p-2 rounded border ${formData.timeoutTeam === 'H' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          (H) Home Charged
        </button>
        <button 
          onClick={() => handleChange('timeoutTeam', 'V')}
          className={`p-2 rounded border ${formData.timeoutTeam === 'V' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          (V) Visitor Charged
        </button>
        <button 
          onClick={() => handleChange('timeoutTeam', 'CHALLENGE')}
          className={`p-2 rounded border ${formData.timeoutTeam === 'CHALLENGE' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          (C) Challenge
        </button>
        <button 
          onClick={() => handleChange('timeoutTeam', 'OFFICIAL')}
          className={`p-2 rounded border ${formData.timeoutTeam === 'OFFICIAL' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          (O) Official's Timeout
        </button>
        <button 
          onClick={() => handleChange('timeoutTeam', 'MEDIA')}
          className={`p-2 rounded border ${formData.timeoutTeam === 'MEDIA' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          (M) Media Timeout
        </button>
      </div>
      <div>
        <label className="block font-bold">Clock Time:</label>
        <TimeInput
          ref={inputRef}
          value={formData.timeRemaining || gameState.clock}
          onChange={value => handleChange('timeRemaining', value)}
          placeholder="15:00"
          autoFocus={true}
        />
      </div>
    </div>
  );

  const renderQuarterFlow = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">Set Quarter</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-bold">Quarter:</label>
          <select 
            ref={inputRef}
            value={formData.newQuarter || ''}
            onChange={e => handleChange('newQuarter', parseInt(e.target.value))}
            className="border px-2 py-1 rounded w-full"
          >
            <option value="">Select...</option>
            <option value={1}>1st Quarter</option>
            <option value={2}>2nd Quarter</option>
            <option value={3}>3rd Quarter</option>
            <option value={4}>4th Quarter</option>
            <option value={5}>Overtime</option>
          </select>
        </div>
        <div>
          <label className="block font-bold">Clock:</label>
          <TimeInput
            value={formData.newClock || '15:00'}
            onChange={value => handleChange('newClock', value)}
            placeholder="15:00"
          />
        </div>
      </div>
    </div>
  );

  const renderHalfEndFlow = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">End Half</div>
      <p className="text-sm text-gray-600">Set quarter to 2nd and clock to 00:00</p>
      <div>
        <label className="block font-bold">Confirmation:</label>
        <p>This will end the first half (Q2, 00:00)</p>
      </div>
    </div>
  );

  const renderHalfNewFlow = () => {
    // Check if this is Q1 (coin toss) or Q3 (second half)
    if (gameState.quarter === 1) {
      return (
        <CoinTossFlow 
          onFlowComplete={onFlowComplete}
          gameState={gameState}
          quarter={1}
        />
      );
    } else {
      // Q3 - could be deferred choice or regular second half
      return (
        <CoinTossFlow 
          onFlowComplete={onFlowComplete}
          gameState={gameState}
          quarter={3}
        />
      );
    }
  };

  const renderUniformFlow = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">Uniform Change</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-bold">Team:</label>
          <select 
            ref={inputRef}
            value={formData.team || ''}
            onChange={e => handleChange('team', e.target.value)}
            className="border px-2 py-1 rounded w-full"
          >
            <option value="">Select...</option>
            <option value="H">Home</option>
            <option value="V">Visitor</option>
          </select>
        </div>
        <div>
          <label className="block font-bold">Player Number:</label>
          <input
            type="text"
            value={formData.playerNumber || ''}
            onChange={e => handleChange('playerNumber', e.target.value)}
            className="border px-2 py-1 rounded w-full"
            placeholder="Player #"
          />
        </div>
      </div>
      <div>
        <label className="block font-bold">Reason:</label>
        <input
          type="text"
          value={formData.reason || ''}
          onChange={e => handleChange('reason', e.target.value)}
          className="border px-2 py-1 rounded w-full"
          placeholder="Blood, equipment issue, etc."
        />
      </div>
    </div>
  );

  const renderBallPlacementFlow = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">Ball Placement (Down, Distance, Spot)</div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block font-bold">Down:</label>
          <select 
            ref={inputRef}
            value={formData.newDown || gameState.down}
            onChange={e => handleChange('newDown', parseInt(e.target.value))}
            className="border px-2 py-1 rounded w-full"
          >
            <option value={1}>1st</option>
            <option value={2}>2nd</option>
            <option value={3}>3rd</option>
            <option value={4}>4th</option>
          </select>
        </div>
        <div>
          <label className="block font-bold">Distance:</label>
          <input
            type="number"
            value={formData.newDistance || gameState.distance}
            onChange={e => handleChange('newDistance', parseInt(e.target.value))}
            className="border px-2 py-1 rounded w-full"
            min="0"
            max="99"
          />
        </div>
        <div>
          <label className="block font-bold">Spot:</label>
          <input
            type="text"
            value={formData.newSpot || gameState.spot}
            onChange={e => handleChange('newSpot', e.target.value)}
            className="border px-2 py-1 rounded w-full"
            placeholder="H35"
          />
        </div>
      </div>
    </div>
  );

  const renderGameTimeFlow = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">Enter Game Time</div>
      <div>
        <label className="block font-bold">New Clock Time:</label>
        <TimeInput
          ref={inputRef}
          value={formData.newClock || gameState.clock}
          onChange={value => handleChange('newClock', value)}
          placeholder="15:00"
          autoFocus={true}
        />
      </div>
    </div>
  );

  const renderPossessionFlow = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">Possession Change</div>
      <div>
        <label className="block font-bold">New Possession:</label>
        <select 
          ref={inputRef}
          value={formData.newPossession || ''}
          onChange={e => handleChange('newPossession', e.target.value)}
          className="border px-2 py-1 rounded w-full"
        >
          <option value="">Select...</option>
          <option value="H">Home</option>
          <option value="V">Visitor</option>
        </select>
      </div>
    </div>
  );

  const renderDriveStartFlow = () => (
    <div className="space-y-3">
      <div className="text-lg font-bold">Drive Start Time</div>
      <p className="text-sm text-gray-600">
        Current: Q{gameState.quarter} {gameState.clock}, {gameState.spot}
      </p>
      <p className="text-sm text-gray-600">
        This will reset the drive timer and increment drive number.
      </p>
    </div>
  );

  const renderGameSettings = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Game Settings</h3>
      <div>
        <label className="block font-bold">Game Level</label>
        <select
          value={gameConfig.gameLevel || 'HS'}
          onChange={(e) => setGameConfig(prev => ({ ...prev, gameLevel: e.target.value }))}
          className="border px-2 py-1 rounded"
        >
          <option value="HS">High School</option>
          <option value="NCAA">NCAA</option>
        </select>
        <div className="text-xs text-gray-600 mt-1">
          Affects touchback spots: HS=20yd line, NCAA=25yd line
        </div>
      </div>
      
      <button onClick={() => onFlowComplete({ controlType: 'settings_updated' })} 
              className="bg-green-500 text-white px-4 py-2 rounded">
        Save Settings
      </button>
    </div>
  );

  const canSubmit = () => {
    switch (controlType) {
      case 'timeout':
        return formData.timeoutTeam;
      case 'quarter':
        return formData.newQuarter;
      case 'half_end':
        return true;
      case 'half_new':
        return formData.newPossession;
      case 'uniform':
        return formData.team && formData.playerNumber;
      case 'ball_placement':
        return formData.newDown && formData.newDistance !== undefined && formData.newSpot;
      case 'game_time':
        return formData.newClock;
      case 'possession':
        return formData.newPossession;
      case 'drive_start':
        return true;
      default:
        return false;
    }
  };

  const renderCoinTossFlow = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-center">Coin Toss</h3>
        <div className="space-y-2">
          <div>
            <label className="block font-bold">Winning Team (H or V)</label>
            <input
              type="text"
              value={formData.winningTeam || ''}
              onChange={e => handleChange('winningTeam', e.target.value)}
              className="border px-2 py-1 rounded w-24 uppercase"
              maxLength={1}
            />
          </div>
          <div>
            <label className="block font-bold">Winner's Choice</label>
            <select
              value={formData.winnerChoice || ''}
              onChange={e => handleChange('winnerChoice', e.target.value)}
              className="border px-2 py-1 rounded w-32"
            >
              <option value="">Select...</option>
              <option value="KICK">Kick</option>
              <option value="RECEIVE">Receive</option>
              <option value="DEFEND">Defend</option>
              <option value="DEFER">Defer</option>
            </select>
          </div>
          
          {formData.winnerChoice === 'DEFEND' && (
            <div>
              <label className="block font-bold">Defend Which End?</label>
              <select
                value={formData.winnerEndChoice || ''}
                onChange={e => handleChange('winnerEndChoice', e.target.value)}
                className="border px-2 py-1 rounded w-32"
              >
                <option value="">Select...</option>
                <option value="LEFT">Left End</option>
                <option value="RIGHT">Right End</option>
              </select>
            </div>
          )}
          
          {(formData.winnerChoice === 'DEFER' || (formData.winnerChoice === 'DEFEND' && formData.winnerEndChoice)) && (
            <div>
              <label className="block font-bold">Loser's Choice</label>
              <select
                value={formData.loserChoice || ''}
                onChange={e => handleChange('loserChoice', e.target.value)}
                className="border px-2 py-1 rounded w-32"
              >
                <option value="">Select...</option>
                {formData.winnerChoice === 'DEFER' && (
                  <>
                    <option value="KICK">Kick</option>
                    <option value="RECEIVE">Receive</option>
                  </>
                )}
                {formData.winnerChoice === 'DEFEND' && (
                  <>
                    <option value="KICK">Kick</option>
                    <option value="RECEIVE">Receive</option>
                  </>
                )}
              </select>
            </div>
          )}
          
          {formData.winnerChoice === 'DEFER' && formData.loserChoice === 'DEFEND' && (
            <div>
              <label className="block font-bold">Loser Defends Which End?</label>
              <select
                value={formData.loserEndChoice || ''}
                onChange={e => handleChange('loserEndChoice', e.target.value)}
                className="border px-2 py-1 rounded w-32"
              >
                <option value="">Select...</option>
                <option value="LEFT">Left End</option>
                <option value="RIGHT">Right End</option>
              </select>
            </div>
          )}
        </div>
        
        <button
          onClick={handleCoinTossSubmit}
          disabled={!canSubmitCoinToss()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 w-full"
        >
          Complete Coin Toss
        </button>
      </div>
    );
  };

  const canSubmitCoinToss = () => {
    if (!formData.winningTeam || !formData.winnerChoice) return false;
    
    if (formData.winnerChoice === 'DEFEND') {
      return formData.winnerEndChoice && formData.loserChoice;
    }
    
    if (formData.winnerChoice === 'DEFER') {
      if (!formData.loserChoice) return false;
      if (formData.loserChoice === 'DEFEND') {
        return formData.loserEndChoice;
      }
      return true;
    }
    
    return true;
  };

  const handleCoinTossSubmit = () => {
    const coinTossData = {
      playType: 'game',
      controlType: 'coin_toss',
      winningTeam: formData.winningTeam,
      losingTeam: formData.winningTeam === 'H' ? 'V' : 'H',
      winnerChoice: formData.winnerChoice,
      loserChoice: formData.loserChoice,
      winnerEndChoice: formData.winnerEndChoice,
      loserEndChoice: formData.loserEndChoice,
      deferChoice: formData.winnerChoice === 'DEFER' ? formData.loserChoice : null,
      resultCode: 'COMPLETE'
    };
    
    onFlowComplete(coinTossData);
  };

  return (
    <div className="p-4 border border-black rounded bg-white shadow space-y-4">
      {!controlType && renderControlTypeSelection()}
      
      {controlType === 'timeout' && renderTimeoutFlow()}
      {controlType === 'quarter' && renderQuarterFlow()}
      {controlType === 'half_end' && renderHalfEndFlow()}
      {controlType === 'half_new' && renderHalfNewFlow()}
      {controlType === 'uniform' && renderUniformFlow()}
      {controlType === 'ball_placement' && renderBallPlacementFlow()}
      {controlType === 'game_time' && renderGameTimeFlow()}
      {controlType === 'possession' && renderPossessionFlow()}
      {controlType === 'drive_start' && renderDriveStartFlow()}
      {controlType === 'settings_updated' && renderGameSettings()}
      {controlType === 'coin_toss' && renderCoinTossFlow()}
      
      {controlType && (
        <div className="flex space-x-3">
          <button 
            onClick={handleSubmit}
            disabled={!canSubmit()}
            className={`px-4 py-2 rounded ${
              canSubmit() 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            }`}
          >
            Submit
          </button>
          <button 
            onClick={() => setControlType('')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default GameControlFlow;
import React, { useState, useEffect } from 'react';

const PenaltyEnforcementFlow = ({ penaltyData, gameState, onEnforcementComplete }) => {
  const [enforcementData, setEnforcementData] = useState({
    spotOfFoul: '',
    enforcementSpot: '',
    resultingSpot: '',
    enforcementType: '', // 'previous_spot', 'spot_of_foul', 'succeeding_spot'
    automaticFirstDown: false,
    lossOfDown: false,
    playerEjected: false,
    confirmed: false
  });

  useEffect(() => {
    // Auto-calculate enforcement based on penalty type
    calculateEnforcement();
  }, [penaltyData]);

  const calculateEnforcement = () => {
    const { penaltyCode, team, yards } = penaltyData;
    const currentSpot = gameState.spot;
    const isPreSnap = isPreSnapPenalty(penaltyCode);
    
    console.log('Calculating enforcement for:', { penaltyCode, team, yards, currentSpot });
    
    let enforcementType = 'previous_spot'; // Default
    let spotOfFoul = currentSpot;
    let enforcementSpot = currentSpot;
    let resultingSpot = currentSpot;

    if (isPreSnap) {
      // Pre-snap penalties enforced from previous spot
      enforcementType = 'previous_spot';
      enforcementSpot = currentSpot;
      resultingSpot = calculateNewSpot(currentSpot, yards, team);
    } else {
      // Most high school penalties enforced from spot of foul
      enforcementType = 'spot_of_foul';
      // For now, assume spot of foul is current spot (user can modify)
      spotOfFoul = currentSpot;
      enforcementSpot = spotOfFoul;
      resultingSpot = calculateNewSpot(spotOfFoul, yards, team);
    }

    console.log('Enforcement calculation result:', { spotOfFoul, enforcementSpot, resultingSpot, enforcementType });

    setEnforcementData(prev => ({
      ...prev,
      spotOfFoul,
      enforcementSpot,
      resultingSpot,
      enforcementType,
      automaticFirstDown: isAutomaticFirstDown(penaltyCode),
      lossOfDown: isLossOfDown(penaltyCode)
    }));
  };

  const isPreSnapPenalty = (code) => {
    const preSnapPenalties = ['FS', 'OS', 'EN', 'NZI', 'IF', 'IM', 'IS', 'DOG', 'ISUB', 'TMM', 'IE'];
    return preSnapPenalties.includes(code);
  };

  const isAutomaticFirstDown = (code) => {
    // In high school, no automatic first downs - only if penalty gains enough yards
    return false;
  };

  const isLossOfDown = (code) => {
    const lossOfDownPenalties = ['IG', 'IFP'];
    return lossOfDownPenalties.includes(code);
  };

  const isEjectablePenalty = (code) => {
    const ejectablePenalties = ['PF', 'UC', 'TGT', 'SP'];
    return ejectablePenalties.includes(code);
  };

  const calculateNewSpot = (fromSpot, yards, penaltyTeam) => {
    if (yards === 'Spot' || yards === 'Loss of Down') return fromSpot;
    
    const yardNum = parseInt(yards);
    if (isNaN(yardNum)) return fromSpot;

    const [side, yard] = [fromSpot[0], parseInt(fromSpot.slice(1))];
    
    // If penalty is on the team with possession, move backwards
    // If penalty is on defense, move forward
    const possession = gameState.possession;
    const moveForward = penaltyTeam !== possession;
    
    let newYard;
    let newSide = side;

    if (moveForward) {
      newYard = yard + yardNum;
      if (side === 'H' && newYard >= 50) {
        newSide = 'V';
        newYard = 100 - newYard;
      } else if (side === 'V' && newYard >= 50) {
        newSide = 'H';
        newYard = 100 - newYard;
      }
    } else {
      newYard = yard - yardNum;
      if (newYard <= 0) {
        // Safety or move to other side
        newYard = Math.abs(newYard);
        newSide = side === 'H' ? 'V' : 'H';
      }
    }

    newYard = Math.max(1, Math.min(99, newYard));
    return `${newSide}${newYard}`;
  };

  const handleFieldChange = (field, value) => {
    setEnforcementData(prev => ({ ...prev, [field]: value }));
    
    // Recalculate resulting spot when enforcement spot changes
    if (field === 'enforcementSpot') {
      const newResultingSpot = calculateNewSpot(value, penaltyData.yards, penaltyData.team);
      setEnforcementData(prev => ({ ...prev, resultingSpot: newResultingSpot }));
    }
  };

  const handleConfirm = () => {
    const finalData = {
      ...penaltyData,
      enforcement: enforcementData,
      spot: enforcementData.resultingSpot
    };
    onEnforcementComplete(finalData);
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-400 rounded">
      <h3 className="font-bold text-lg mb-3">Penalty Enforcement</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <strong>Penalty:</strong> {penaltyData.penaltyName || penaltyData.penaltyCode} ({penaltyData.penaltyCode}) on {penaltyData.team}
          {penaltyData.playerNumber && ` #${penaltyData.playerNumber}`}
        </div>
        <div>
          <strong>Yardage:</strong> {penaltyData.yards || 0} yards
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-bold text-sm">Spot of Foul</label>
            <input
              type="text"
              value={enforcementData.spotOfFoul}
              onChange={(e) => handleFieldChange('spotOfFoul', e.target.value)}
              className="border px-2 py-1 rounded w-full"
            />
          </div>
          <div>
            <label className="block font-bold text-sm">Enforcement Spot</label>
            <input
              type="text"
              value={enforcementData.enforcementSpot}
              onChange={(e) => handleFieldChange('enforcementSpot', e.target.value)}
              className="border px-2 py-1 rounded w-full"
            />
          </div>
          <div>
            <label className="block font-bold text-sm">Resulting Spot</label>
            <input
              type="text"
              value={enforcementData.resultingSpot}
              onChange={(e) => handleFieldChange('resultingSpot', e.target.value)}
              className="border px-2 py-1 rounded w-full bg-green-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block font-bold text-sm">Enforcement Type</label>
            <select
              value={enforcementData.enforcementType}
              onChange={(e) => handleFieldChange('enforcementType', e.target.value)}
              className="border px-2 py-1 rounded w-full"
            >
              <option value="previous_spot">Previous Spot</option>
              <option value="spot_of_foul">Spot of Foul</option>
              <option value="succeeding_spot">Succeeding Spot</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enforcementData.automaticFirstDown}
                onChange={(e) => handleFieldChange('automaticFirstDown', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Automatic 1st Down</span>
            </label>
          </div>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enforcementData.lossOfDown}
                onChange={(e) => handleFieldChange('lossOfDown', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Loss of Down</span>
            </label>
          </div>
          {/* Ejection checkbox - only show for ejectable penalties */}
          {isEjectablePenalty(penaltyData.penaltyCode) && (
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enforcementData.playerEjected}
                  onChange={(e) => handleFieldChange('playerEjected', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-bold text-red-600">OFFENDER EJECTED</span>
              </label>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-3 rounded">
          <div className="text-sm">
            <strong>Enforcement Summary:</strong><br />
            {penaltyData.penaltyName || penaltyData.penaltyCode}: {penaltyData.yards || 0} yard penalty on {penaltyData.team}
            {penaltyData.playerNumber && ` #${penaltyData.playerNumber}`} enforced from {enforcementData.enforcementSpot}
            <br />
            Ball will be spotted at {enforcementData.resultingSpot}
            {enforcementData.automaticFirstDown && ' (Automatic First Down)'}
            {enforcementData.lossOfDown && ' (Loss of Down)'}
            {enforcementData.playerEjected && (
              <span className="text-red-600 font-bold">
                <br />⚠️ PLAYER #{penaltyData.playerNumber} EJECTED FROM GAME
              </span>
            )}
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleConfirm}
            className="bg-green-600 text-white px-4 py-2 rounded font-bold"
          >
            Confirm Enforcement
          </button>
          <button
            onClick={() => onEnforcementComplete(penaltyData)}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Skip Enforcement
          </button>
        </div>
      </div>
    </div>
  );
};

export default PenaltyEnforcementFlow;

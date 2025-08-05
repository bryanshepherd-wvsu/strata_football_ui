import React, { useState } from 'react';

const KickoffOutOfBoundsFlow = ({ kickoffData, onOptionSelect }) => {
  const [selectedOption, setSelectedOption] = useState('');

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    
    const resultData = {
      ...kickoffData,
      outOfBoundsOption: option
    };

    switch (option) {
      case 'spot_ball':
        // Ball spotted where it went out of bounds, receiving team's possession
        resultData.finalSpot = kickoffData.kickedTo;
        resultData.possession = kickoffData.receivingTeam;
        break;
      case 'penalty_rekick':
        // 5-yard penalty, rekick
        resultData.penalty = {
          code: 'KOB',
          name: 'Kickoff Out of Bounds',
          yards: 5,
          team: kickoffData.kickingTeam,
          result: 'rekick'
        };
        break;
      case 'penalty_spot':
        // 5-yard penalty enforced from spot of out of bounds
        resultData.penalty = {
          code: 'KOB',
          name: 'Kickoff Out of Bounds',
          yards: 5,
          team: kickoffData.kickingTeam,
          enforcementSpot: kickoffData.kickedTo
        };
        break;
    }

    onOptionSelect(resultData);
  };

  return (
    <div className="p-4 bg-orange-50 border border-orange-400 rounded">
      <h3 className="font-bold text-lg mb-3">Kickoff Out of Bounds</h3>
      
      <div className="mb-4">
        <strong>Kickoff by:</strong> {kickoffData.kicker} went out of bounds at {kickoffData.kickedTo}
      </div>

      <div className="space-y-3">
        <h4 className="font-bold">Select Resolution:</h4>
        
        <button 
          onClick={() => handleOptionSelect('spot_ball')}
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 text-left"
        >
          <div className="font-bold">Spot Ball for Drive Start</div>
          <div className="text-sm">Ball spotted at {kickoffData.kickedTo}, receiving team's possession</div>
        </button>
        
        <button 
          onClick={() => handleOptionSelect('penalty_rekick')}
          className="w-full bg-yellow-500 text-white p-3 rounded hover:bg-yellow-600 text-left"
        >
          <div className="font-bold">Penalty - Rekick</div>
          <div className="text-sm">5-yard penalty, kicking team rekicks</div>
        </button>
        
        <button 
          onClick={() => handleOptionSelect('penalty_spot')}
          className="w-full bg-red-500 text-white p-3 rounded hover:bg-red-600 text-left"
        >
          <div className="font-bold">Penalty - Enforce from Spot</div>
          <div className="text-sm">5-yard penalty enforced from {kickoffData.kickedTo}</div>
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-600">
        Choose how to handle the kickoff that went out of bounds
      </div>
    </div>
  );
};

export default KickoffOutOfBoundsFlow;

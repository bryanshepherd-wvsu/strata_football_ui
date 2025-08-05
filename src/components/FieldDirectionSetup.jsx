import React, { useState } from 'react';

const FieldDirectionSetup = ({ onDirectionSet, kickingTeam, coinTossData }) => {
  const [selectedDirection, setSelectedDirection] = useState(null);

  const handleDirectionSelect = (direction) => {
    setSelectedDirection(direction);
    
    const directionData = {
      attackDirection: direction,
      kickingTeam,
      coinTossData
    };
    
    console.log('Field direction selected:', directionData);
    onDirectionSet(directionData);
  };

  const getKickingTeamName = () => {
    return kickingTeam === 'H' ? 'Home' : 'Visitor';
  };

  const getReceivingTeamName = () => {
    return kickingTeam === 'H' ? 'Visitor' : 'Home';
  };

  return (
    <div className="bg-white p-8 border border-black rounded shadow-lg max-w-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Field Direction Setup</h2>
      
      <div className="mb-6 text-center">
        <div className="text-lg mb-2">
          <strong>{getKickingTeamName()}</strong> team is kicking off
        </div>
        <div className="text-sm text-gray-600">
          <strong>{getReceivingTeamName()}</strong> team will receive
        </div>
      </div>

      <div className="mb-6">
        <p className="text-center mb-4">
          Which direction will the <strong>{getReceivingTeamName()}</strong> team attack after receiving the kickoff?
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => handleDirectionSelect('LEFT')}
          className="w-full bg-blue-500 text-white p-4 rounded hover:bg-blue-600 text-lg font-bold"
        >
          ← Attack LEFT
        </button>
        
        <button
          onClick={() => handleDirectionSelect('RIGHT')}
          className="w-full bg-green-500 text-white p-4 rounded hover:bg-green-600 text-lg font-bold"
        >
          Attack RIGHT →
        </button>
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        This determines field orientation for the entire game
      </div>
    </div>
  );
};

export default FieldDirectionSetup;
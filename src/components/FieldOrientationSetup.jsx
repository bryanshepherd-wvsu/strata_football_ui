import React, { useState } from 'react';

const FieldOrientationSetup = ({ onOrientationSet, homeTeam = "HOME", visitorTeam = "VISITOR" }) => {
  const [scorerPosition, setScorerPosition] = useState('');
  const [homeEndZone, setHomeEndZone] = useState('');

  const handleSubmit = () => {
    const orientationData = {
      scorerPosition,
      homeEndZone,
      visitorEndZone: homeEndZone === 'LEFT' ? 'RIGHT' : 'LEFT'
    };
    
    onOrientationSet(orientationData);
  };

  const canSubmit = scorerPosition && homeEndZone;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border border-black rounded shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Field Orientation Setup</h2>
      
      <div className="space-y-6">
        {/* Scorer Position */}
        <div>
          <h3 className="text-lg font-bold mb-3">Where are you sitting as the scorer?</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setScorerPosition('HOME_SIDE')}
              className={`p-4 border-2 rounded ${
                scorerPosition === 'HOME_SIDE' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-bold">Home Team Side</div>
              <div className="text-sm text-gray-600">Press box, home bench side</div>
            </button>
            <button 
              onClick={() => setScorerPosition('VISITOR_SIDE')}
              className={`p-4 border-2 rounded ${
                scorerPosition === 'VISITOR_SIDE' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-bold">Visitor Team Side</div>
              <div className="text-sm text-gray-600">Visitor bench side</div>
            </button>
          </div>
        </div>

        {/* Field Orientation */}
        <div>
          <h3 className="text-lg font-bold mb-3">From your view, which end zone does the HOME team defend?</h3>
          <div className="mb-4 p-4 bg-green-100 border rounded">
            <div className="text-center text-sm mb-2">Field View (from your position)</div>
            <div className="flex items-center justify-between bg-green-300 h-16 rounded border-2 border-green-600">
              <div className="w-16 bg-yellow-200 h-full flex items-center justify-center text-xs font-bold border-r-2 border-green-600">
                LEFT<br/>END
              </div>
              <div className="flex-1 text-center text-xs">
                ← FIELD →
              </div>
              <div className="w-16 bg-yellow-200 h-full flex items-center justify-center text-xs font-bold border-l-2 border-green-600">
                RIGHT<br/>END
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setHomeEndZone('LEFT')}
              className={`p-4 border-2 rounded ${
                homeEndZone === 'LEFT' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-bold">{homeTeam} defends LEFT end</div>
              <div className="text-sm text-gray-600">Home team defends the left end zone</div>
            </button>
            <button 
              onClick={() => setHomeEndZone('RIGHT')}
              className={`p-4 border-2 rounded ${
                homeEndZone === 'RIGHT' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-bold">{homeTeam} defends RIGHT end</div>
              <div className="text-sm text-gray-600">Home team defends the right end zone</div>
            </button>
          </div>
        </div>

        {/* Summary */}
        {scorerPosition && homeEndZone && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-bold mb-2">Setup Summary:</h4>
            <ul className="text-sm space-y-1">
              <li>• You are sitting on the <strong>{scorerPosition === 'HOME_SIDE' ? 'Home' : 'Visitor'}</strong> side</li>
              <li>• <strong>{homeTeam}</strong> defends the <strong>{homeEndZone}</strong> end zone</li>
              <li>• <strong>{visitorTeam}</strong> defends the <strong>{homeEndZone === 'LEFT' ? 'RIGHT' : 'LEFT'}</strong> end zone</li>
              <li>• The field display will automatically flip based on attack direction</li>
            </ul>
          </div>
        )}

        {/* Submit */}
        <div className="text-center">
          <button 
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-8 py-3 rounded text-lg font-bold ${
              canSubmit 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-400 text-gray-700 cursor-not-allowed'
            }`}
          >
            Set Field Orientation
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldOrientationSetup;

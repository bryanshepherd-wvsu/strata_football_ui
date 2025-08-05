import React, { useState, useRef, useEffect } from 'react';

const KickoffReturnFlow = ({ kickoffData, onReturnComplete }) => {
  const [returnData, setReturnData] = useState({
    returner: '',
    returnResult: '',
    spot: '',
    tackler1: '',
    tackler2: ''
  });
  const [showTackleFlow, setShowTackleFlow] = useState(false);
  
  const returnerRef = useRef(null);
  const tackler1Ref = useRef(null);

  useEffect(() => {
    if (returnerRef.current) {
      returnerRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (showTackleFlow && tackler1Ref.current) {
      tackler1Ref.current.focus();
    }
  }, [showTackleFlow]);

  const handleChange = (field, value) => {
    const val = field === 'spot' ? value.toUpperCase() : value;
    setReturnData(prev => ({ ...prev, [field]: val }));
    
    // When return result is entered, show tackle flow for T or continue for others
    if (field === 'returnResult' && ['T', 'O', 'F', '.'].includes(val.toUpperCase())) {
      const upperVal = val.toUpperCase();
      const updatedData = { ...returnData, [field]: upperVal };
      
      if (upperVal === 'T') {
        // Show tackle flow for tackles
        setReturnData(updatedData);
        setShowTackleFlow(true);
      } else if (upperVal === 'O') {
        // Out of bounds - just need spot
        setReturnData(updatedData);
        // Don't auto-submit, let user enter spot
      } else {
        // F (fumble) or . (touchdown) - auto-submit
        setTimeout(() => {
          onReturnComplete(updatedData);
        }, 100);
      }
    }
  };

  const handleSubmit = () => {
    onReturnComplete(returnData);
  };

  const isReadyToSubmit = () => {
    if (!returnData.returner || !returnData.returnResult) return false;
    
    if (returnData.returnResult === 'T') {
      // For tackles, need spot and at least one tackler
      return returnData.spot && returnData.tackler1;
    } else if (returnData.returnResult === 'O') {
      // For out of bounds, need spot
      return returnData.spot;
    } else {
      // For fumbles and touchdowns, basic data is enough
      return true;
    }
  };

  if (showTackleFlow) {
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-center">Kickoff Return - Tackle Details</h4>
        <div className="text-sm text-center text-gray-600">
          Return by #{returnData.returner} - Tackled
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-bold">Tackler 1</label>
            <input
              ref={tackler1Ref}
              type="text"
              value={returnData.tackler1}
              onChange={e => handleChange('tackler1', e.target.value)}
              className="border px-2 py-1 rounded w-24"
              placeholder="##"
            />
          </div>
          <div>
            <label className="block font-bold">Tackler 2 (optional)</label>
            <input
              type="text"
              value={returnData.tackler2}
              onChange={e => handleChange('tackler2', e.target.value)}
              className="border px-2 py-1 rounded w-24"
              placeholder="##"
            />
          </div>
          <div>
            <label className="block font-bold">Final Spot</label>
            <input
              type="text"
              value={returnData.spot}
              onChange={e => handleChange('spot', e.target.value)}
              className="border px-2 py-1 rounded w-24"
              placeholder="H25"
            />
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <button 
            onClick={handleSubmit}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={!isReadyToSubmit()}
          >
            Complete Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-bold text-center">Kickoff Return</h4>
      <div className="text-sm text-center text-gray-600">
        Kicked to {kickoffData.kickedTo} - Return information
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block font-bold">Returner #</label>
          <input
            ref={returnerRef}
            type="text"
            value={returnData.returner}
            onChange={e => handleChange('returner', e.target.value)}
            className="border px-2 py-1 rounded w-24"
            placeholder="##"
          />
        </div>
        <div>
          <label className="block font-bold">Return Result (T, O, F, .)</label>
          <input
            type="text"
            maxLength={1}
            value={returnData.returnResult}
            onChange={e => handleChange('returnResult', e.target.value)}
            className="border px-2 py-1 rounded w-24 uppercase"
          />
        </div>
        {returnData.returnResult && returnData.returnResult !== 'T' && (
          <div>
            <label className="block font-bold">Final Spot</label>
            <input
              type="text"
              value={returnData.spot}
              onChange={e => handleChange('spot', e.target.value)}
              className="border px-2 py-1 rounded w-24"
              placeholder="H25"
            />
          </div>
        )}
      </div>

      {returnData.returnResult && returnData.returnResult !== 'T' && (
        <div className="flex justify-center space-x-4">
          <button 
            onClick={handleSubmit}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={!isReadyToSubmit()}
          >
            Complete Return
          </button>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        T=Tackle (will ask for tacklers), O=Out of bounds, F=Fumble, .=Touchdown
      </div>
    </div>
  );
};

export default KickoffReturnFlow;

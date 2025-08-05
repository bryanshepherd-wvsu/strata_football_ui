import React from 'react';

const InputAssistant = ({ message, playReadyToSubmit, queuedPenalty }) => {
  // Priority: queued penalty gets yellow background, then play ready gets green, else gray
  let bgClass = 'bg-gray-100 text-black';
  let displayMessage = message;
  
  if (queuedPenalty) {
    bgClass = 'bg-yellow-500 text-black font-bold';
    displayMessage = 'FLAG ON THE PLAY - Penalty input required after play completion';
  } else if (playReadyToSubmit) {
    bgClass = 'bg-green-600 text-white font-bold';
  }
  
  return (
    <div className={`p-4 border-t border-black text-center text-sm ${bgClass} sticky bottom-0 z-20`}>
      {displayMessage}
      <span className="block text-xs mt-1">Press 'E' to start penalty (or queue if play active)</span>
    </div>
  );
};

export default InputAssistant;

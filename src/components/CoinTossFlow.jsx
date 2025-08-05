import React, { useState, useEffect } from 'react';

const CoinTossFlow = ({ onFlowComplete, gameState, quarter = 1 }) => {
  const [coinTossData, setCoinTossData] = useState({
    winningTeam: '',
    winnerChoice: '',
    loserChoice: '',
    q1EndDefense: '',
    q3EndDefense: '',
    deferChoice: ''
  });
  const [currentStep, setCurrentStep] = useState('select_winner');

  const handleWinnerSelect = (team) => {
    setCoinTossData(prev => ({ 
      ...prev, 
      winningTeam: team,
      losingTeam: team === 'H' ? 'V' : 'H'
    }));
    setCurrentStep('winner_choice');
  };

  const handleWinnerChoice = (choice) => {
    const updatedData = { ...coinTossData, winnerChoice: choice };
    setCoinTossData(updatedData);
    
    if (choice === 'DEFER') {
      setCurrentStep('loser_choice_defer');
    } else if (choice === 'DEFEND') {
      setCurrentStep('winner_end_choice'); // New step for end zone selection
    } else {
      // KICK or RECEIVE - complete immediately with updated data
      completeCoinTossWithData(updatedData);
    }
  };

  const handleLoserChoice = (choice) => {
    const updatedData = { ...coinTossData, loserChoice: choice };
    setCoinTossData(updatedData);
    
    if (choice === 'DEFEND') {
      setCurrentStep('loser_end_choice'); // New step for end zone selection
    } else {
      // KICK or RECEIVE - complete immediately
      completeCoinTossWithData(updatedData);
    }
  };

  const handleEndChoice = (endChoice, isWinner = true) => {
    const updatedData = { 
      ...coinTossData, 
      [isWinner ? 'winnerEndChoice' : 'loserEndChoice']: endChoice 
    };
    setCoinTossData(updatedData);
    
    // Complete the coin toss with end zone choice
    completeCoinTossWithData(updatedData);
  };

  const completeCoinToss = () => {
    completeCoinTossWithData(coinTossData);
  };

  const completeCoinTossWithData = (data) => {
    const finalData = {
      ...data,
      playType: 'game', // Ensure playType is set
      controlType: 'coin_toss',
      resultCode: 'COMPLETE'
    };
    
    console.log('Completing coin toss with data:', finalData);
    
    // Add update function to properly store coin toss data
    finalData.updateGameState = (currentState) => {
      console.log('CoinToss updateGameState called with:', currentState);
      const updatedState = {
        ...currentState,
        coinTossData: finalData,
        // Set initial possession based on coin toss result
        possession: finalData.winnerChoice === 'RECEIVE' ? finalData.winningTeam : finalData.losingTeam
      };
      console.log('CoinToss updateGameState returning:', updatedState);
      return updatedState;
    };
    
    console.log('CoinToss calling onFlowComplete with final data:', finalData);
    onFlowComplete(finalData);
  };

  const isThirdQuarter = () => quarter === 3;
  const isFirstQuarter = () => quarter === 1;

  const renderWinnerSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Coin Toss - Select Winning Team</h3>
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => handleWinnerSelect('H')}
          className="bg-blue-500 text-white p-4 rounded hover:bg-blue-600"
        >
          Home Team Wins
        </button>
        <button 
          onClick={() => handleWinnerSelect('V')}
          className="bg-red-500 text-white p-4 rounded hover:bg-red-600"
        >
          Visitor Team Wins
        </button>
      </div>
    </div>
  );

  const renderWinnerChoice = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">
        {coinTossData.winningTeam === 'H' ? 'Home' : 'Visitor'} Team Won - Select Choice
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => handleWinnerChoice('KICK')}
          className="bg-green-500 text-white p-3 rounded hover:bg-green-600"
        >
          KICK
        </button>
        <button 
          onClick={() => handleWinnerChoice('RECEIVE')}
          className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
        >
          RECEIVE
        </button>
        <button 
          onClick={() => handleWinnerChoice('DEFEND')}
          className="bg-purple-500 text-white p-3 rounded hover:bg-purple-600"
        >
          DEFEND
        </button>
        {isFirstQuarter() && (
          <button 
            onClick={() => handleWinnerChoice('DEFER')}
            className="bg-orange-500 text-white p-3 rounded hover:bg-orange-600"
          >
            DEFER
          </button>
        )}
      </div>
    </div>
  );

  const renderLoserChoiceDefer = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">
        {coinTossData.losingTeam === 'H' ? 'Home' : 'Visitor'} Team - Winner Deferred
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={() => handleLoserChoice('KICK')}
          className="bg-green-500 text-white p-3 rounded hover:bg-green-600"
        >
          KICK
        </button>
        <button 
          onClick={() => handleLoserChoice('RECEIVE')}
          className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
        >
          RECEIVE
        </button>
        <button 
          onClick={() => handleLoserChoice('DEFEND')}
          className="bg-purple-500 text-white p-3 rounded hover:bg-purple-600"
        >
          DEFEND
        </button>
      </div>
    </div>
  );

  const renderLoserChoiceAfterDefend = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">
        {coinTossData.losingTeam === 'H' ? 'Home' : 'Visitor'} Team - Winner Chose to Defend
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => handleLoserChoice('KICK')}
          className="bg-green-500 text-white p-3 rounded hover:bg-green-600"
        >
          KICK
        </button>
        <button 
          onClick={() => handleLoserChoice('RECEIVE')}
          className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
        >
          RECEIVE
        </button>
      </div>
    </div>
  );

  const renderWinnerEndChoice = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">
        {coinTossData.winningTeam === 'H' ? 'Home' : 'Visitor'} Team - Select End to Defend
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => handleEndChoice('LEFT', true)}
          className="bg-blue-500 text-white p-4 rounded hover:bg-blue-600"
        >
          Defend LEFT End
        </button>
        <button 
          onClick={() => handleEndChoice('RIGHT', true)}
          className="bg-green-500 text-white p-4 rounded hover:bg-green-600"
        >
          Defend RIGHT End
        </button>
      </div>
    </div>
  );

  const renderLoserEndChoice = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">
        {coinTossData.losingTeam === 'H' ? 'Home' : 'Visitor'} Team - Select End to Defend
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => handleEndChoice('LEFT', false)}
          className="bg-blue-500 text-white p-4 rounded hover:bg-blue-600"
        >
          Defend LEFT End
        </button>
        <button 
          onClick={() => handleEndChoice('RIGHT', false)}
          className="bg-green-500 text-white p-4 rounded hover:bg-green-600"
        >
          Defend RIGHT End
        </button>
      </div>
    </div>
  );

  const renderThirdQuarterFlow = () => {
    // Check if this is a deferred situation from Q1
    const isDeferred = gameState?.coinTossData?.winnerChoice === 'DEFER';
    
    if (isDeferred) {
      // Winner gets to choose in Q3
      if (currentStep === 'winner_choice') {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">
              3rd Quarter - {coinTossData.winningTeam === 'H' ? 'Home' : 'Visitor'} Team (Deferred Choice)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => handleDeferChoice('KICK')}
                className="bg-green-500 text-white p-3 rounded hover:bg-green-600"
              >
                KICK
              </button>
              <button 
                onClick={() => handleDeferChoice('RECEIVE')}
                className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
              >
                RECEIVE
              </button>
              <button 
                onClick={() => handleDeferChoice('DEFEND')}
                className="bg-purple-500 text-white p-3 rounded hover:bg-purple-600"
              >
                DEFEND
              </button>
            </div>
          </div>
        );
      }
    } else {
      // Loser gets to choose in Q3
      return renderLoserChoiceDefer();
    }
  };

  const renderCurrentStep = () => {
    if (isThirdQuarter() && gameState?.coinTossData?.winnerChoice === 'DEFER') {
      return renderThirdQuarterFlow();
    }

    switch (currentStep) {
      case 'select_winner':
        return renderWinnerSelection();
      case 'winner_choice':
        return renderWinnerChoice();
      case 'winner_end_choice':
        return renderWinnerEndChoice();
      case 'loser_choice_defer':
        return renderLoserChoiceDefer();
      case 'loser_choice_after_defend':
        return renderLoserChoiceAfterDefend();
      case 'loser_end_choice':
        return renderLoserEndChoice();
      // ...existing cases...
    }
  };

  return (
    <div className="p-6 bg-white border border-black rounded shadow-lg">
      {renderCurrentStep()}
      
      {/* Debug info */}
      <div className="mt-6 p-2 bg-gray-100 rounded text-xs">
        <div>Step: {currentStep}</div>
        <div>Data: {JSON.stringify(coinTossData, null, 2)}</div>
      </div>
    </div>
  );
};

export default CoinTossFlow;
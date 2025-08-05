
// Helper to load the full game state from backend and update UI state
async function loadGameState(gameId) {
  try {
    console.log("Loading game state for GameID:", gameId);
    const response = await fetch(`/api/load_game_state.php?game_id=${gameId}`);
    const data = await response.json();
    console.log("Fetched game state from PHP:", data);

    // Extract game rules/config from the response if available
    if (data.gameRules) {
      // Update gameConfig with rules from the backend
      setGameConfig(prev => ({
        ...prev,
        challengesEnabled: data.gameRules.challengesEnabled === true || data.gameRules.challengesEnabled === "1",
        // Add other game rules as needed
      }));

      console.log("Challenge setting:", data.gameRules.challengesEnabled);
    }

    return data;
  } catch (error) {
    console.error("Error loading game state:", error);
    return null;
  }
}

// Helper to load stats for a game
import React, { useState, useEffect, useRef } from 'react';
import '@fontsource/anton'; // Import Anton font from npm
import PlayFlowManager from './PlayFlowManager';
import { RESULT_TYPES, getFlowInitForResult, getProcessorForResult } from './PlayResultFlows';

  const TimeoutChallengeDisplay = ({ timeouts, challenge, colorScheme, isVisitor, showChallenges = true }) => {
  // Always show timeout circles regardless of challenge setting
  const timeoutCircles = [0, 1, 2].map(i => (
    <div
      key={i}
      className={`w-10 h-4 rounded-full ${i < timeouts ? colorScheme.timeout : 'bg-gray-400'}`}
    />
  ));

  // Only create challenge circle if challenges are enabled
  const challengeCircle = showChallenges ? (
    <div className={`w-10 h-4 rounded-full ${challenge ? colorScheme.challenge : colorScheme.challengeUsed}`} />
  ) : null;

  return (
    <div className={`flex flex-row space-x-1 items-center mt-1`}>
      {isVisitor
        ? (showChallenges
            ? [challengeCircle, ...timeoutCircles.reverse()]
            : [...timeoutCircles.reverse()])
        : (showChallenges
            ? [...timeoutCircles, challengeCircle]
            : [...timeoutCircles])}
    </div>
  );
};

const renderButtons = (idx, section) => (
  <div className="flex space-x-1 mr-1">
    <button className="bg-blue-500 text-white text-xs px-1" onClick={() => alert(`Edit ${section} #${idx}`)}>EDIT</button>
    <button className="bg-red-500 text-white text-xs px-1" onClick={() => window.confirm('Are you sure you want to delete this play?') && alert(`Delete ${section} #${idx}`)}>DEL</button>
    <button className="bg-green-500 text-white text-xs px-1" onClick={() => alert(`Insert after ${section} #${idx}`)}>INS</button>
  </div>
);

export default function GameScoringUI() {
  // --- HOOKS DECLARATION (must be at the top, before any conditional logic) ---
  // React state and refs, in required order:
  const [gameState, setGameState] = useState({
    quarter: 1,
    clock: "15:00",
    possession: "H",
    down: 1,
    distance: 10,
    spot: "H35",
    score: { H: 0, V: 0 },
    scoresByQuarter: { H: [0, 0, 0, 0], V: [0, 0, 0, 0] },
    previousPlays: [],
    timeouts: { H: 3, V: 3 },
    challenges: { H: false, V: false },
    teamStats: {
      H: {
        firstDowns: 0,
        rushesYards: "0-0",
        passing: "0-0-0",
        passingYards: 0,
        playsTotalYards: "0-0",
        avgPerPlay: 0,
        penalties: 0,
        punts: 0,
        timeOfPossession: "0:00",
        thirdDownEff: "0-0",
        fourthDownEff: "0-0"
      },
      V: {
        firstDowns: 0,
        rushesYards: "0-0",
        passing: "0-0-0",
        passingYards: 0,
        playsTotalYards: "0-0",
        avgPerPlay: 0,
        penalties: 0,
        punts: 0,
        timeOfPossession: "0:00",
        thirdDownEff: "0-0",
        fourthDownEff: "0-0"
      }
    },
    topPlayers: {
      H: { passing: ["-", "-"], rushing: ["-", "-"], receiving: ["-", "-"] },
      V: { passing: ["-", "-"], rushing: ["-", "-"], receiving: ["-", "-"] }
    }
  });

  const [playLog, setPlayLog] = useState([]);
  const [stats, setStats] = useState({});
  const [lockRefreshInterval, setLockRefreshInterval] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [playType, setPlayType] = useState('');
  const [primaryPlayer, setPrimaryPlayer] = useState('');
  const [resultText, setResultText] = useState('');
  const [currentPlay, setCurrentPlay] = useState(null);
  const [playReadyToSubmit, setPlayReadyToSubmit] = useState(false);
  // Game Control UI state
  const [gameControlStep, setGameControlStep] = useState(null);
  const [gameControlData, setGameControlData] = useState({});

  // Play flow state for handling common result flows
  const [activeResultFlow, setActiveResultFlow] = useState(null);
  const [resultFlowData, setResultFlowData] = useState({});

  // Team Metadata State
  const [teamMetadata, setTeamMetadata] = useState(null);

  const [debugLog, setDebugLog] = useState([]);
  const field = useRef(null);
  const inProgress = useRef(false);
  const controlInputRef = useRef(null);
  const penaltyInputRef = useRef(null);
  const punterInputRef = useRef(null);
  const kickerInputRef = useRef(null);
  // Helper to submit a play to backend and update UI state
  async function submitPlay(gameId, playObject) {
    setDebugLog(prev => [...prev, '[submitPlay] Submitting play:', JSON.stringify(playObject)]);
    try {
      console.log("UserID being sent:", sessionStorage.getItem('UserID'));
      const response = await fetch('/api/submit_play.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          play: playObject,
          user_id: sessionStorage.getItem('UserID'),
        }),
      });
      const data = await response.json();
      setDebugLog(prev => [...prev, '[submitPlay] Response game state:', JSON.stringify(data.gameState)]);
      if (data.error) {
        console.error("Server error:", data.error);
        return null;
      }
      // Update UI state with backend response
      if (data.gameState) setGameState(data.gameState);
      if (data.playLog) setPlayLog(data.playLog);
      if (data.stats) {
        // Optionally update stats state if you have such state
        // setStats(data.stats);
      }
      return true;
    } catch (error) {
      setDebugLog(prev => [...prev, '[submitPlay] Error:', error.toString()]);
      return false;
    }
  }

  async function loadStats(gameId) {
  try {
    const response = await fetch(`/api/load_stats.php?game_id=${gameId}`);
    const data = await response.json();
    setStats(data);
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

  // --- END HOOKS DECLARATION ---

 // Loading screen while fetching game state
 // if (isLoading) {
 //   return <LoadingScreen />;
 // }

  // Assistance message for input bar
  // Other state and refs previously declared now need to be initialized below if needed
  // (all useState/useRef hooks are now at the top)

  // Wrap loadGameState to also set currentGameId and handle all required state
  const handleLoadGameState = async (gameId) => {
    console.log("handleLoadGameState called with gameId:", gameId);
    setIsLoading(true);
    const result = await loadGameState(gameId);
    console.log("Result from loadGameState:", result);
    if (result) {
      setGameState(result.gameState);
      setPlayLog(result.playLog || []);
      setStats(result.stats || []);
      setCurrentGameId(gameId);

      // Update game configuration from rules if available
      if (result.gameRules) {
        setGameConfig(prev => ({
          ...prev,
          challengesEnabled: result.gameRules.challengesEnabled === true || result.gameRules.challengesEnabled === "1",
          autoClock: prev.autoClock, // Preserve current autoClock setting
          // Add other game rule settings as needed
        }));
      }

      setIsLoading(false);
      sessionStorage.setItem('selectedGameId', String(gameId));
    } else {
      setIsLoading(false);
      console.log("Failed to load game state.");
    }
    await loadStats(gameId);
  };
  // Periodically refresh the lock for the current game and user
  useEffect(() => {
    if (!currentGameId || !sessionStorage.getItem('UserID')) return;

    const interval = setInterval(() => {
      fetch('/api/refresh_lock.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: currentGameId,
          user_id: sessionStorage.getItem('UserID')
        })
      }).catch(err => console.error('Lock refresh error:', err));
    }, 2 * 60 * 1000); // every 2 minutes

    setLockRefreshInterval(interval);
    return () => clearInterval(interval);
  }, [currentGameId]);
  // The following were previously declared with hooks, now must be plain variables or moved:
  const [inputAssistance, setInputAssistance] = useState('');
  const rusherInputRef = useRef();
  const passerInputRef = useRef();
  // punterInputRef and kickerInputRef are already declared above as required
  // controlInputRef and penaltyInputRef are already declared above as required
  // debugLog is already declared as useRef above (for the required order), but if you need setDebugLog, declare:
  // const [debugLogState, setDebugLog] = useState([]);
  const [focusedField, setFocusedField] = useState('');
  const [playInProgress, setPlayInProgress] = useState(false);
  // gameState and playType etc. are now declared at top as required

  // Fetch UserID from backend on mount and store in sessionStorage
  useEffect(() => {
    fetch('/api/whoami.php')
      .then(res => res.json())
      .then(data => {
        if (data.user_id) {
          sessionStorage.setItem('UserID', data.user_id);
          console.log("✅ Set UserID from PHP session:", data.user_id);
        } else {
          console.warn("⚠️ No UserID found in session.");
        }
      })
      .catch(err => console.error("Error fetching UserID from whoami.php:", err));
  }, []);

  // Fetch current game ID from backend on mount (refactored)
  console.log("👀 GameScoringUI mounted.");
  useEffect(() => {
    console.log("🏁 useEffect ran.");
    // Fetch current game ID from backend
    fetch('/api/get_current_game_id.php')
      .then(res => res.json())
      .then(data => {
        console.log("Fetched GameID:", data.GameID);
        if (data && data.GameID) {
          handleLoadGameState(data.GameID); // call the function with GameID
          // Fetch team metadata after loading game state
          fetch(`/api/get_team_metadata.php?game_id=${data.GameID}`)
            .then(res => res.json())
            .then(meta => {
              console.log("Fetched team metadata:", meta);
              setTeamMetadata(meta);
            })
            .catch(err => console.error("Error fetching team metadata:", err));
        } else {
          setIsLoading(false);
          console.warn("No GameID returned from backend");
        }
      })
      .catch(err => {
        setIsLoading(false);
        console.error("Error fetching GameID:", err);
      });
  }, []);

  // (Moved loading check above as per requirements)

  // Focus the relevant input when a play is started, then set playInProgress after focus
  useEffect(() => {
    if (playInProgress) return;
    if (playType === 'Rush' && currentPlay && rusherInputRef.current) {
      rusherInputRef.current.focus();
    } else if (playType === 'Pass' && currentPlay && passerInputRef.current) {
      passerInputRef.current.focus();
    } else if (playType === 'Punt' && currentPlay && punterInputRef.current) {
      punterInputRef.current.focus();
    } else if (playType === 'Kick Menu' && currentPlay && kickerInputRef.current) {
      kickerInputRef.current.focus();
    } else if (playType === 'Game Control' && currentPlay && controlInputRef.current) {
      controlInputRef.current.focus();
    } else if (playType === 'Pre-snap Penalty' && currentPlay && penaltyInputRef.current) {
      penaltyInputRef.current.focus();
    }

    // Delay setting playInProgress until after focus
    if (currentPlay) {
      setTimeout(() => setPlayInProgress(true), 0);
    }
  }, [playType, currentPlay, playInProgress]);

  const [gameConfig, setGameConfig] = useState({
    autoClock: false,
    challengesEnabled: false, // Default to disabled until confirmed by server
  });

  useEffect(() => {
    if (!gameConfig.autoClock) return;
    const interval = setInterval(() => {
      setGameState(prev => {
        const [min, sec] = prev.clock.split(':').map(Number);
        if (min === 0 && sec === 0) return prev;
        const total = min * 60 + sec - 1;
        const newMin = Math.floor(total / 60).toString().padStart(2, '0');
        const newSec = (total % 60).toString().padStart(2, '0');
        return { ...prev, clock: `${newMin}:${newSec}` };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameConfig.autoClock]);

  // Keyboard shortcut handler for play type selection and Game Control flow
  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = event.code;

      if (playType === 'Game Control') {
        if (gameControlStep === 'awaiting-subcommand') {
          if (key === 'KeyT') {
            setGameControlStep('awaiting-timeout-type');
            event.preventDefault();
            return;
          }
        }
        return;
      }

      switch (key) {
        case 'KeyG':
          event.preventDefault();
          setPlayType('Game Control');
          setGameControlStep('awaiting-subcommand');
          logDebug('Game Control initiated');
          break;
        case 'KeyR':
          event.preventDefault();
          setPlayType('Rush');
          startRushPlay();
          logDebug('Play Started: Rush');
          break;
        case 'KeyP':
          event.preventDefault();
          setPlayType('Pass');
          startPassPlay();
          logDebug('Play Started: Pass');
          break;
        case 'KeyE':
          event.preventDefault();
          setPlayType('Pre-snap Penalty');
          break;
        case 'KeyU':
          event.preventDefault();
          setPlayType('Punt');
          break;
        case 'KeyK':
          event.preventDefault();
          setPlayType('Kick Menu');
          break;
        case 'Escape':
          event.preventDefault();
          setPlayType('');
          setCurrentPlay(null);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [playType, gameControlStep]);

  // Helper to add debug log lines
  const logDebug = (message, data = null) => {
    setDebugLog(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}${data ? ' - ' + JSON.stringify(data) : ''}`,
    ]);
  };

  // Start a result flow based on the play result
  const handleResultFlowStart = (resultType) => {
    if (!currentPlay) return;

    logDebug(`Starting ${resultType} flow`);
    setActiveResultFlow(resultType);

    // Initialize result flow data
    const flowInit = getFlowInitForResult(resultType);
    if (flowInit) {
      const initialData = flowInit({ ...currentPlay });
      setResultFlowData(initialData);
    }
  };

  // Handle data updates during result flow
  const handleResultFlowDataChange = (data) => {
    setResultFlowData(data);
  };

  // Process completed result flow
  const handleResultFlowComplete = (flowData) => {
    if (!flowData || !currentPlay) {
      setActiveResultFlow(null);
      return;
    }

    // Process the flow data and update the current play
    const processor = getProcessorForResult(activeResultFlow);
    if (processor) {
      const updatedPlay = processor(currentPlay, flowData);
      setCurrentPlay(updatedPlay);
      logDebug('Updated play with result flow data', updatedPlay);
    }

    setActiveResultFlow(null);

    // If we have enough data to submit, do it automatically
    if (flowData.spot && /^[HV]\d{2}$/.test(flowData.spot)) {
      setTimeout(() => handleSubmitPlay(), 500);
    }
  };

  // Rush play initialization
  const startRushPlay = () => {
    const newPlayData = {
      type: 'rush',
      player: '',
      result: '',
      spot: '',
      clock: gameState.clock,
      quarter: gameState.quarter,
    };
    setCurrentPlay(newPlayData);
    logDebug('Rush play initialized', newPlayData);
  };

  // Pass play initialization
  // Sacks are considered pass plays and any yardage lost or gained on a sack should be attributed to the passer, not the rusher.
  const startPassPlay = () => {
    // catchSpot is only for display/reference with YAC; does not affect game spot or stat engine logic
    const newPlayData = {
      type: 'pass',
      passer: '',
      result: '',
      target: '',
      spot: '',
      clock: gameState.clock,
      quarter: gameState.quarter,
      incompleteTags: [],
      passYardsShouldApply: true,
      // Flag to indicate if a sack should apply its yardage to rushing stats (NCAA rule)
      sackAppliesToRushStats: true,
      // Add flags for sack fumble logic
      isSackFumble: false,
    };
    setCurrentPlay(newPlayData);
    logDebug('Pass play initialized', newPlayData);
  };

  // Submit play and send to backend
  const handleSubmitPlay = async () => {
    if (!currentPlay || !currentGameId) return;

    // Turnover detection logic
    const turnoverTypes = ['X', 'F']; // Interception or Fumble
    const offenseTeam = gameState.possession || 'H';
    const defenseTeam = offenseTeam === 'H' ? 'V' : 'H';
    if (turnoverTypes.includes(currentPlay.result) && currentPlay.recoveryTeam && currentPlay.recoveryTeam !== offenseTeam) {
      currentPlay.isTurnover = true;
    }

    // Prevent sacks from being counted as pass attempts (NCAA rule)
    if (currentPlay.result === 'S') {
      currentPlay.countAsPassAttempt = false;
    }

    // Handle sack fumble logic for pass plays
    if (currentPlay.result === 'F') {
      currentPlay.countAsPassAttempt = false;
      currentPlay.isSackFumble = true;
      currentPlay.passYardsShouldApply = false;
      if (currentPlay.tackler1) currentPlay.forcedBy = currentPlay.tackler1;
      if (currentPlay.tackler2 && !currentPlay.forcedBy) currentPlay.forcedBy = currentPlay.tackler2;
    }

    logDebug('Submitting play', currentPlay);

    // Submit the play to the backend
    const success = await submitPlay(currentGameId, currentPlay);

    if (success) {
      setCurrentPlay(null);
      setPlayType('');
      setPlayInProgress(false);
    }
  };

  // Helper to format play summary for previousPlays
  // Only use play.spot for location, never catchSpot (catchSpot is for YAC display only)
  const formatPlaySummary = (play) => {
    // Sacks are logged as pass plays but do not count toward passing attempts or stats.
    const tacklers = [play.tackler1, play.tackler2].filter(Boolean).join(', ');
    const displayType = play.type === 'pass' && play.result === 'R' ? 'RUSH' : play.type.toUpperCase();
    const playerText = play.type === 'pass'
      ? play.result === 'R'
        ? `#${play.passer || '?'} (scramble)`
        : `#${play.passer || '?'} to #${play.target || '?'}`
      : `#${play.player || '?'}`;
    // Only use play.spot for summary and stats, ignore catchSpot
    return `(${play.clock}) ${displayType} ${playerText} to ${play.spot || '?'} [${play.result || '?'}${tacklers ? ` | TKL: ${tacklers}` : ''}]`;
  };

  const colorSchemes = {
    H: { timeout: 'bg-yellow-400', challenge: 'bg-red-600', challengeUsed: 'bg-red-950' },
    V: { timeout: 'bg-yellow-400', challenge: 'bg-red-600', challengeUsed: 'bg-red-950' },
  };

  const adjustTimeout = (team, delta) => {
    setGameState(prev => ({
      ...prev,
      timeouts: {
        ...prev.timeouts,
        [team]: Math.max(0, Math.min(3, prev.timeouts[team] + delta)),
      },
    }));
  };

  const toggleChallenge = (team) => {
    setGameState(prev => ({
      ...prev,
      challenges: {
        ...prev.challenges,
        [team]: !prev.challenges[team],
      },
    }));
  };

  const toggleClockMode = () => {
    setGameConfig(prev => ({ ...prev, autoClock: !prev.autoClock }));
  };

  const renderTeamStats = (label, key) => (
    <tr>
      <td className="border border-black text-left pl-1">{label}</td>
      <td className="border border-black">{gameState.teamStats.H[key]}</td>
      <td className="border border-black">{gameState.teamStats.V[key]}</td>
    </tr>
  );

  const renderTopPlayers = (label, statKey) => (
    <>
      <tr className="bg-gray-200">
        <td colSpan="3" className="text-left pl-1 font-bold">Top {label}</td>
      </tr>
      {Array.from({ length: 2 }).map((_, i) => (
        <tr key={`${statKey}-row-${i}`}>
          <td className="border border-black text-left pl-1">{i === 0 ? '1.' : '2.'}</td>
          <td className="border border-black">{gameState.topPlayers.H[statKey][i]}</td>
          <td className="border border-black">{gameState.topPlayers.V[statKey][i]}</td>
        </tr>
      ))}
    </>
  );

  // Input box background color logic (based on playType)
  const inputBoxBg =
    playType === 'Pre-snap Penalty'
      ? 'bg-yellow-200'
      : currentPlay?.isTurnover
      ? 'bg-red-200'
      : playType === 'Rush' ||
        playType === 'Pass' ||
        playType === 'Punt' ||
        playType === 'Kick Menu' ||
        playType === 'Game Control'
      ? 'bg-blue-100'
      : 'bg-white';

  return (
    <div className="min-h-screen bg-white flex flex-col font-[Anton]">
      {/* Load Game Button */}
      <div className="mb-2 flex space-x-2">
        <button
          onClick={() => handleLoadGameState(1)} // Replace with real game selection logic
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load Game #1
        </button>
        {/* Example: Show loaded game id */}
        {currentGameId && (
          <span className="ml-2 text-sm text-gray-700">Loaded Game ID: {currentGameId}</span>
        )}
      </div>
      {/* Top HUD */}
      <div className="bg-black text-white flex justify-between items-center px-8 py-4 text-center w-full">
        {teamMetadata ? (
          <>
            <div className="flex items-center space-x-4">
              <img
                src={`${teamMetadata.Home?.logo}`}
                alt={`${teamMetadata.Home?.name || 'Home'} Logo`}
                className="h-12 w-auto"
              />
              <div className="flex flex-col">
                <div className="flex items-center space-x-2 text-[28px]">
                  <div className="flex items-center text-[36px]">
                    <span>{teamMetadata.Home?.shortname ?? 'Home'}</span>
                    {gameState.possession === 'H' && <span className="ml-2">🏈</span>}
                    <span className="ml-[100px]">{gameState.score?.H ?? 0}</span>
                  </div>
                </div>
                <TimeoutChallengeDisplay
                  timeouts={gameState.timeouts.H}
                  challenge={gameState.challenges.H}
                  colorScheme={colorSchemes.H}
                  isVisitor={false}
                  showChallenges={gameConfig.challengesEnabled}
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="text-[34px]">{gameState.clock} | {gameState.quarter}ST</div>
              <div className="relative w-[180px] h-[50px] mt-1 mx-auto">
                <div className="absolute top-0 left-0 right-0 bg-blue-700 text-white rounded h-[22px] flex justify-around items-center text-[11px]">
                  <div className="w-1/3 text-center leading-[22px]">DOWN</div>
                  <div className="w-1/3 text-center leading-[22px]">TO GO</div>
                  <div className="w-1/3 text-center leading-[22px]">BALL ON</div>
                </div>
                <div className="absolute bottom-[-20px] left-0 right-0 flex justify-around text-[30px]">
                  <div className="w-1/3 text-center">{gameState.down}</div>
                  <div className="w-1/3 text-center">{gameState.distance}</div>
                  <div className="w-1/3 text-center">{gameState.spot}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <div className="flex items-center text-[36px]">
                  <span className="mr-[100px]">{gameState.score?.V ?? 0}</span>
                  {gameState.possession === 'V' && <span className="ml-2">🏈</span>}
                  <span>{teamMetadata.Visitor?.shortname ?? 'Visitor'}</span>
                </div>
                <TimeoutChallengeDisplay
                  timeouts={gameState.timeouts.V}
                  challenge={gameState.challenges.V}
                  colorScheme={colorSchemes.V}
                  isVisitor={true}
                  showChallenges={gameConfig.challengesEnabled}
                />
              </div>
              <img
                src={`${teamMetadata.Visitor?.logo}`}
                alt={`${teamMetadata.Visitor?.name || 'Visitor'} Logo`}
                className="h-12 w-auto"
              />
            </div>
          </>
        ) : (
          <div className="w-full text-center text-lg">Loading team information...</div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        <div className="w-1/5 bg-white border-r border-black p-2 overflow-y-auto">
          <h2 className="text-lg font-bold mb-2">TEAM/PLAYER STATS</h2>
          <table className="w-full text-sm text-center border border-black mb-4">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black">Team</th>
                <th className="border border-black">Q1</th>
                <th className="border border-black">Q2</th>
                <th className="border border-black">Q3</th>
                <th className="border border-black">Q4</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black font-bold">{teamMetadata?.Visitor?.abbreviation || "VISITOR"}</td>
                {gameState.scoresByQuarter.V.map((score, idx) => (
                  <td key={`V${idx}`} className="border border-black">{score}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-black font-bold">{teamMetadata?.Home?.abbreviation || "HOME"}</td>
                {gameState.scoresByQuarter.H.map((score, idx) => (
                  <td key={`H${idx}`} className="border border-black">{score}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <table className="w-full text-sm text-center border border-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black text-left pl-1">Stat</th>
                <th className="border border-black">{teamMetadata?.Home?.abbreviation || "HOME"}</th>
                <th className="border border-black">{teamMetadata?.Visitor?.abbreviation || "VISITOR"}</th>
              </tr>
            </thead>
            <tbody>
              {renderTeamStats('First Downs', 'firstDowns')}
              {renderTeamStats('Rush-Yards', 'rushesYards')}
              {renderTeamStats('Passing', 'passing')}
              {renderTeamStats('Passing Yds', 'passingYards')}
              {renderTeamStats('Tot Off.', 'playsTotalYards')}
              {renderTeamStats('Avg Per Play', 'avgPerPlay')}
              {renderTeamStats('Penalties', 'penalties')}
              {renderTeamStats('Punts', 'punts')}
              {renderTeamStats('Possession', 'timeOfPossession')}
              {renderTeamStats('3rd Dn Eff.', 'thirdDownEff')}
              {renderTeamStats('4th Dn Eff.', 'fourthDownEff')}
              {renderTopPlayers('Passers', 'passing')}
              {renderTopPlayers('Rushers', 'rushing')}
              {renderTopPlayers('Receivers', 'receiving')}
            </tbody>
          </table>
        </div>
        <div className="flex-1 bg-gray-300 p-4 border-black border-x min-h-full overflow-visible">
          <div className={`flex flex-col ${debugLog.length > 0 ? 'h-[85%]' : 'h-full'} text-black space-y-4`}>
            {/* Current Drive and Game Snapshot side-by-side */}
            <div className="flex justify-between space-x-4">
              <div className="bg-white p-3 border border-black rounded shadow w-[47.5%]">
                <div className="text-xl font-bold mb-1">Current Drive</div>
                <div className="text-sm space-y-1">
                  <div>Team: WVSU</div>
                  <div>Drive #: 5</div>
                  <div>Start: Q2 07:45, H25</div>
                  <div>Plays: 3</div>
                  <div>Yards: 22</div>
                  <div>Time: 1:16</div>
                </div>
              </div>

              <div className="bg-white p-3 border border-black rounded shadow w-[47.5%]">
                <div className="text-xl font-bold mb-1">Game Snapshot</div>
                <div className="text-sm grid grid-cols-2 gap-y-1">
                  <div>Score:</div><div>WVSU 28, GSU 24</div>
                  <div>Total Plays:</div><div>52 vs 47</div>
                  <div>Total Yards:</div><div>325 vs 298</div>
                  <div>Turnovers:</div><div>1 vs 2</div>
                </div>
              </div>
            </div>

            {/* Field Position Visual */}
                        {/* Helper functions for yardline/marker rendering */}
            {(() => {
              // Helper to convert spot string to percent across the field
              const calculateYardlinePercent = (spot) => {
                if (!spot || typeof spot !== "string") return 50;
                const side = spot[0];
                const yard = parseInt(spot.slice(1), 10);
                return side === "H" ? 100 - yard : yard;
              };
                            const spotPercent = calculateYardlinePercent(gameState?.spot);
              const distance = gameState?.distance || 10;

              // Compute first down marker
              let firstDownPercent = spotPercent;
              if (gameState?.spot && distance !== null) {
                if (gameState.spot[0] === "H") {
                  firstDownPercent = Math.max(0, spotPercent - distance);
                } else {
                  firstDownPercent = Math.min(100, spotPercent + distance);
                }
              }

              return (
                <div className="bg-green-100 p-3 border border-black rounded shadow relative h-20 flex items-center justify-between">
                  <div className="text-xs font-bold ml-2">{teamMetadata?.Visitor?.abbreviation || "VISITOR"}</div>
                  <div className="relative flex-1 h-6 mx-2 bg-green-300">
                    {[...Array(21)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-white"
                        style={{ left: `${(i * 5)}%` }}
                      />
                    ))}
                    {/* Example red zone line (optional, keep or remove as desired) <div className="absolute top-0 bottom-0 w-px bg-red-600" style={{ left: '70%' }} />*/}

                    {/* First Down Line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-500"
                      style={{ left: `${firstDownPercent}%` }}
                    />
                    {/* Ball Marker */}
                    <div
                      className="absolute -top-4 text-xs font-bold"
                      style={{ left: `${spotPercent}%` }}
                    >
                      🏈
                    </div>
                  </div>
                  <div className="text-xs font-bold mr-2">{teamMetadata?.Home?.abbreviation || "HOME"}</div>
                </div>
              );
            })()}


            {/* Input Box Panel */}
            <div className={`flex flex-col space-y-2 ${inputBoxBg} p-3 rounded shadow h-full max-w-full overflow-hidden`}>
              <div className="text-xl font-bold mb-2">{playType ? `${playType} Play Started` : 'Ready for Input'}</div>

              {/* Play Flow Manager - handles all common result flows */}
              {activeResultFlow && (
                <div className="mb-4">
                  <PlayFlowManager
                    initialFlow={activeResultFlow}
                    onPlayDataChange={handleResultFlowDataChange}
                    onFlowComplete={handleResultFlowComplete}
                  />
                </div>
              )}
              {/* Game Control UI */}
              {playType === 'Game Control' && (
                <GameControlUI
                  gameControlStep={gameControlStep}
                  setGameControlStep={setGameControlStep}
                  gameControlData={gameControlData}
                  setGameControlData={setGameControlData}
                  currentGameId={currentGameId}
                  submitPlay={submitPlay}
                  setPlayType={setPlayType}
                  logDebug={logDebug}
                />
              )}
              {/* RUSH PLAY DYNAMIC INPUTS */}
              {currentPlay && playType === 'Rush' && !activeResultFlow && (() => {
                // Dynamic input fields for Rush Play
                const rushFields = [];
                // Rusher input
                rushFields.push(
                  <div key="rush">
                    <label
                      htmlFor="rusher"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Rusher
                    </label>
                    <input
                      ref={rusherInputRef}
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.player}
                      onChange={e => setCurrentPlay({ ...currentPlay, player: e.target.value })}
                      placeholder="Rusher #"
                      onFocus={() => setFocusedField('rusher')}
                      id="rusher"
                    />
                  </div>
                );
                // Result input
                rushFields.push(
                  <div key="result">
                    <label
                      htmlFor="rush-result"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Result
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.result}
                      onChange={e => {
                        const value = e.target.value.toUpperCase();
                        setCurrentPlay({ ...currentPlay, result: value });

                        // Start appropriate result flow based on the result
                        if (['T', 'F', 'O', '.'].includes(value)) {
                          handleResultFlowStart(value);
                        }
                      }}
                      onKeyDown={e => e.stopPropagation()}
                      placeholder="e.g., T"
                      onFocus={() => setFocusedField('result')}
                      id="rush-result"
                    />
                  </div>
                );
                // Tacklers (conditionally rendered)
                if (currentPlay.result === 'T') {
                  rushFields.push(
                    <div key="tackler1">
                      <label
                        htmlFor="tackler1"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Tackler 1
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.tackler1 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                        placeholder="#1"
                        onFocus={() => setFocusedField('tackler1')}
                        id="tackler1"
                      />
                    </div>
                  );
                  rushFields.push(
                    <div key="tackler2">
                      <label
                        htmlFor="tackler2"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Tackler 2
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.tackler2 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                        placeholder="#2"
                        onFocus={() => setFocusedField('tackler2')}
                        id="tackler2"
                      />
                    </div>
                  );
                }
                // Spot
                rushFields.push(
                  <div key="spot">
                    <label
                      htmlFor="rush-spot"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Spot
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.spot}
                      onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                      placeholder="e.g., H34"
                      onFocus={() => setFocusedField('spot')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmitPlay();
                        }
                      }}
                      id="rush-spot"
                    />
                  </div>
                );
                // FUMBLE FLOW: Only show recovery UI if result is 'F', isSackFumble is true, and (tackler1 or tackler2 or rushResult is filled)
                const showRecoveryUI =
                  currentPlay.result === 'F' &&
                  currentPlay.isSackFumble === true &&
                  (currentPlay.rushResult || currentPlay.tackler1 || currentPlay.tackler2);
                // Recovery UI
                let recoveryFields = [];
                if (showRecoveryUI) {
                  recoveryFields = [
                    <div key="recoveryTeam">
                      <label
                        htmlFor="recoveryTeam"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Recovery Team
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.recoveryTeam || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoveryTeam: e.target.value.toUpperCase() })}
                        placeholder="H or V"
                        onFocus={() => setFocusedField('recoveryTeam')}
                        id="recoveryTeam"
                      />
                    </div>,
                    <div key="recoveryPlayer">
                      <label
                        htmlFor="recoveryPlayer"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Recovery Player
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.recoveryPlayer || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoveryPlayer: e.target.value })}
                        placeholder="Player #"
                        onFocus={() => setFocusedField('recoveryPlayer')}
                        id="recoveryPlayer"
                      />
                    </div>,
                    <div key="recoverySpot">
                      <label
                        htmlFor="recoverySpot"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Recovery Spot
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.recoverySpot || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoverySpot: e.target.value.toUpperCase() })}
                        placeholder="e.g., H45"
                        onFocus={() => setFocusedField('recoverySpot')}
                        id="recoverySpot"
                      />
                    </div>,
                    <div key="returnAttempted">
                      <label
                        htmlFor="returnAttempted"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Return Attempted?
                      </label>
                      <select
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.returnAttempted || 'N'}
                        onChange={e => setCurrentPlay({ ...currentPlay, returnAttempted: e.target.value })}
                        id="returnAttempted"
                      >
                        <option value="N">No</option>
                        <option value="Y">Yes</option>
                      </select>
                    </div>
                  ];
                  if (currentPlay.returnAttempted === 'Y') {
                    recoveryFields.push(
                      <div key="returner">
                        <label
                          htmlFor="returner"
                          className="block"
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Returner
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.returner || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, returner: e.target.value })}
                          placeholder="Player #"
                          onFocus={() => setFocusedField('returner')}
                          id="returner"
                        />
                      </div>
                    );
                    recoveryFields.push(
                      <div key="returnSpot">
                        <label
                          htmlFor="returnSpot"
                          className="block"
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Return End Spot
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.returnSpot || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, returnSpot: e.target.value.toUpperCase() })}
                          placeholder="e.g., V45"
                          onFocus={() => setFocusedField('returnSpot')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSubmitPlay();
                            }
                          }}
                          id="returnSpot"
                        />
                      </div>
                    );
                  }
                }
                // Determine if play is ready to submit (for assistance bar)
                const _playReadyToSubmit = /^[HV]\d{2}$/.test(currentPlay.spot);
                // Update playReadyToSubmit state
                if (playReadyToSubmit !== _playReadyToSubmit) setPlayReadyToSubmit(_playReadyToSubmit);
                // Set input assistance message if not ready to submit
                const rushInputAssistance = playReadyToSubmit
                  ? ''
                  : 'Fill all required fields to enable play submission';
                if (inputAssistance !== rushInputAssistance) setInputAssistance(rushInputAssistance);
                return (
                  <>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-1 w-full">
                      {rushFields}
                      {recoveryFields}
                    </div>
                  </>
                );
              })()}
              {/* PASS PLAY DYNAMIC INPUTS */}
              {currentPlay && playType === 'Pass' && !activeResultFlow && (() => {
                // Dynamic input fields for Pass Play
                const passFields = [];
                // Passer
                passFields.push(
                  <div key="passer">
                    <label
                      htmlFor="passer"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Passer
                    </label>
                    <input
                      ref={passerInputRef}
                      type="text"
                      name="passer"
                      value={currentPlay.passer}
                      onChange={e => setCurrentPlay({ ...currentPlay, passer: e.target.value })}
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      autoFocus={focusedField === 'passer'}
                      placeholder="Passer #"
                      onFocus={() => setFocusedField('passer')}
                      id="passer"
                    />
                  </div>
                );
                // Pass Result
                passFields.push(
                  <div key="result">
                    <label
                      htmlFor="pass-result"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Pass Result
                    </label>
                    <input
                      type="text"
                      name="result"
                      placeholder="C, I, S, F, X, R"
                      value={currentPlay.result}
                      onChange={e => {
                        const value = e.target.value.toUpperCase();
                        setCurrentPlay({ ...currentPlay, result: value });

                        // For direct result types that use the common flows
                        if (['T', 'F', 'O', '.'].includes(value)) {
                          handleResultFlowStart(value);
                        }
                      }}
                      className="w-20 px-1 py-1 border border-black rounded text-black uppercase"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      onFocus={() => setFocusedField('result')}
                      onKeyDown={e => e.stopPropagation()}
                      id="pass-result"
                    />
                  </div>
                );
                // Tacklers for T result
                if (currentPlay.result === 'T') {
                  passFields.push(
                    <div key="tackler1">
                      <label
                        htmlFor="pass-tackler1"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Tackler 1
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.tackler1 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                        placeholder="#1"
                        onFocus={() => setFocusedField('tackler1')}
                        id="pass-tackler1"
                      />
                    </div>
                  );
                  passFields.push(
                    <div key="tackler2">
                      <label
                        htmlFor="pass-tackler2"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Tackler 2
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.tackler2 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                        placeholder="#2"
                        onFocus={() => setFocusedField('tackler2')}
                        id="pass-tackler2"
                      />
                    </div>
                  );
                }
                // Fumble branch (complex)
                if (['C', 'F', 'X', 'I'].includes(currentPlay.result) && currentPlay.result === 'F') {
                  // Tackler 1
                  passFields.push(
                    <div key="fumble-tackler1">
                      <label
                        htmlFor="fumble-tackler1"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Tackler 1
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.tackler1 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                        placeholder="#1"
                        onFocus={() => setFocusedField('tackler1')}
                        id="fumble-tackler1"
                      />
                    </div>
                  );
                  // Tackler 2
                  passFields.push(
                    <div key="fumble-tackler2">
                      <label
                        htmlFor="fumble-tackler2"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Tackler 2
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.tackler2 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                        placeholder="#2"
                        onFocus={() => setFocusedField('tackler2')}
                        id="fumble-tackler2"
                      />
                    </div>
                  );
                  // Spot
                  passFields.push(
                    <div key="fumble-spot">
                      <label
                        htmlFor="fumble-spot"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Spot
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.spot}
                        onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                        placeholder="e.g., H34"
                        onFocus={() => setFocusedField('spot')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitPlay();
                          }
                        }}
                        id="fumble-spot"
                      />
                    </div>
                  );
                  if (/^[HV]\d{2}$/.test(currentPlay.spot)) {
                    passFields.push(
                      <div key="fumble-submitHint" className="col-span-4">
                        <p className="text-xs text-gray-700 mt-1 italic">Hit Enter to submit play</p>
                      </div>
                    );
                  }
                  // Recovery Team
                  passFields.push(
                    <div key="fumble-recoveryTeam">
                      <label
                        htmlFor="fumble-recoveryTeam"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Recovered By (Team)
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.recoveryTeam || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoveryTeam: e.target.value.toUpperCase() })}
                        placeholder="H or V"
                        onFocus={() => setFocusedField('recoveryTeam')}
                        id="fumble-recoveryTeam"
                      />
                    </div>
                  );
                  // Recovery Player
                  passFields.push(
                    <div key="fumble-recoveryPlayer">
                      <label
                        htmlFor="fumble-recoveryPlayer"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Recovered By (Player)
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.recoveryPlayer || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoveryPlayer: e.target.value })}
                        placeholder="Player #"
                        onFocus={() => setFocusedField('recoveryPlayer')}
                        id="fumble-recoveryPlayer"
                      />
                    </div>
                  );
                  // Recovery Spot
                  passFields.push(
                    <div key="fumble-recoverySpot">
                      <label
                        htmlFor="fumble-recoverySpot"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Recovery Spot
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.recoverySpot || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoverySpot: e.target.value.toUpperCase() })}
                        placeholder="e.g., H45"
                        onFocus={() => setFocusedField('recoverySpot')}
                        id="fumble-recoverySpot"
                      />
                    </div>
                  );
                  // Return Attempted
                  passFields.push(
                    <div key="fumble-returnAttempted">
                      <label
                        htmlFor="fumble-returnAttempted"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Return Attempted?
                      </label>
                      <select
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.returnAttempted || 'N'}
                        onChange={e => setCurrentPlay({ ...currentPlay, returnAttempted: e.target.value })}
                        id="fumble-returnAttempted"
                      >
                        <option value="N">No</option>
                        <option value="Y">Yes</option>
                      </select>
                    </div>
                  );
                  if (currentPlay.returnAttempted === 'Y') {
                    passFields.push(
                      <div key="fumble-returner">
                        <label
                          htmlFor="fumble-returner"
                          className="block"
                          style={{
                            fontSize: '16px', // changed from 24px to 16px
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Returner
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px', // changed from 20px to 18px
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.returner || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, returner: e.target.value })}
                          placeholder="Player #"
                          onFocus={() => setFocusedField('returner')}
                          id="fumble-returner"
                        />
                      </div>
                    );
                    passFields.push(
                      <div key="fumble-returnSpot">
                        <label
                          htmlFor="fumble-returnSpot"
                          className="block"
                          style={{
                            fontSize: '16px', // changed from 24px to 16px
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Return End Spot
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px', // changed from 20px to 18px
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.returnSpot || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, returnSpot: e.target.value.toUpperCase() })}
                          placeholder="e.g., V45"
                          onFocus={() => setFocusedField('returnSpot')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSubmitPlay();
                            }
                          }}
                          id="fumble-returnSpot"
                        />
                      </div>
                    );
                  // Add Return Result field when returnAttempted is 'Y'
                  passFields.push(
                    <div key="fumble-returnResult">
                      <label
                        htmlFor="fumble-returnResult"
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Return Result
                      </label>
                      <input
                        className="w-20 px-1 py-1 border border-black rounded text-black"
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          fontFamily: "'Arial', sans-serif"
                        }}
                        value={currentPlay.returnResult || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, returnResult: e.target.value.toUpperCase() })}
                        placeholder="T, O, ., F"
                        onFocus={() => setFocusedField('returnResult')}
                        id="fumble-returnResult"
                      />
                      <div className="text-xs text-gray-600 mt-1">
                        T - Tackled | O - Out of Bounds | . - End of Play | F - Fumble
                      </div>
                    </div>
                  );
                  }
                  return (
                    <div className="grid grid-cols-4 gap-x-2 gap-y-1 w-full">
                      {passFields}
                    </div>
                  );
                }
                // Not fumble - continue with other pass fields
                if (['C', 'X', 'I'].includes(currentPlay.result)) {
                  // Target
                  passFields.push(
                    <div key="target">
                    <label
                      htmlFor="target"
                      className="block"
                      style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      {currentPlay.result === 'C' ? 'Caught By:' : 'Target:'}
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.target}
                      onChange={e => setCurrentPlay({ ...currentPlay, target: e.target.value })}
                      placeholder="Receiver #"
                      onFocus={() => setFocusedField('target')}
                      id="target"
                    />
                    </div>
                  );
                  // Incomplete reason checkboxes
                  if (currentPlay.result === 'I') {
                    passFields.push(
                      <div key="incompleteTags">
                      <label
                        className="block"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          fontFamily: "'Arial Black', Gadget, sans-serif"
                        }}
                      >
                        Reason:
                      </label>
                        <div className="flex flex-wrap gap-2">
                          {['Dropped', 'Overthrown', 'Uncatchable', 'Thrown Away'].map(tag => (
                            <label key={tag} className="flex items-center space-x-1 text-xs">
                              <input
                                type="checkbox"
                                checked={currentPlay.incompleteTags?.includes(tag) || false}
                                onChange={e => {
                                  const updatedTags = currentPlay.incompleteTags || [];
                                  if (e.target.checked) {
                                    setCurrentPlay({ ...currentPlay, incompleteTags: [...updatedTags, tag] });
                                  } else {
                                    setCurrentPlay({ ...currentPlay, incompleteTags: updatedTags.filter(t => t !== tag) });
                                  }
                                }}
                              />
                              <span>{tag}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  // Caught At (input) if yacTracking
                  if (gameConfig.yacTracking) {
                    passFields.push(
                      <div key="catchSpot">
                        <label
                          htmlFor="catchSpot"
                          className="block"
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Caught At
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.catchSpot || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, catchSpot: e.target.value })}
                          placeholder="e.g., V45"
                          onFocus={() => setFocusedField('catchSpot')}
                          id="catchSpot"
                        />
                      </div>
                    );
                  }
                  // Reception Result (input) for Complete passes
                  if (currentPlay.result === 'C') {
                    passFields.push(
                      <div key="receptionResult">
                        <label
                          htmlFor="receptionResult"
                          className="block"
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Reception Result
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.receptionResult || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, receptionResult: e.target.value.toUpperCase() })}
                          placeholder="e.g., T, F, O, ."
                          onFocus={() => setFocusedField('receptionResult')}
                          id="receptionResult"
                        />
                      </div>
                    );
                  }
                  // Tacklers for T result after complete
                  if (currentPlay.result === 'C' && currentPlay.receptionResult === 'T') {
                    passFields.push(
                      <div key="reception-tackler1">
                        <label
                          htmlFor="reception-tackler1"
                          className="block"
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Tackler 1
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.tackler1 || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                          placeholder="#1"
                          onFocus={() => setFocusedField('tackler1')}
                          id="reception-tackler1"
                        />
                      </div>
                    );
                    passFields.push(
                      <div key="reception-tackler2">
                        <label
                          htmlFor="reception-tackler2"
                          className="block"
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Tackler 2
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.tackler2 || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                          placeholder="#2"
                          onFocus={() => setFocusedField('tackler2')}
                          id="reception-tackler2"
                        />
                      </div>
                    );
                  }
                // Spot (input)
                passFields.push(
                  <div key="spot">
                    <label
                      htmlFor="pass-spot"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Spot
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.spot}
                      onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                      placeholder="e.g., H34"
                      onFocus={() => setFocusedField('spot')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmitPlay();
                        }
                      }}
                      id="pass-spot"
                    />
                  </div>
                );
                // Determine if play is ready to submit (for assistance bar)
                const _playReadyToSubmit = /^[HV]\d{2}$/.test(currentPlay.spot);
                if (playReadyToSubmit !== _playReadyToSubmit) setPlayReadyToSubmit(_playReadyToSubmit);
                // Set input assistance message if not ready to submit
                const passInputAssistance = playReadyToSubmit
                  ? ''
                  : 'Fill all required fields to enable play submission';
                if (inputAssistance !== passInputAssistance) setInputAssistance(passInputAssistance);
                }
                // Sack: Show only tacklers and spot
                if (currentPlay.result === 'S') {
                  passFields.push(
                    <div key="sack-tackler1">
                    <label
                      htmlFor="sack-tackler1"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Tackler 1
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.tackler1 || ''}
                      onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                      placeholder="#1"
                      onFocus={() => setFocusedField('tackler1')}
                      id="sack-tackler1"
                    />
                    </div>
                  );
                  passFields.push(
                    <div key="sack-tackler2">
                    <label
                      htmlFor="sack-tackler2"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Tackler 2
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.tackler2 || ''}
                      onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                      placeholder="#2"
                      onFocus={() => setFocusedField('tackler2')}
                      id="sack-tackler2"
                    />
                    </div>
                  );
                  passFields.push(
                    <div key="sack-spot">
                    <label
                      htmlFor="sack-spot"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Spot
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.spot}
                      onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                      placeholder="e.g., H34"
                      onFocus={() => setFocusedField('spot')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmitPlay();
                        }
                      }}
                      id="sack-spot"
                    />
                    </div>
                  );
                  if (/^[HV]\d{2}$/.test(currentPlay.spot)) {
                    passFields.push(
                      <div key="sack-submitHint" className="col-span-4">
                        <p className="text-xs text-gray-700 mt-1 italic">Hit Enter to submit play</p>
                      </div>
                    );
                  }
                }
                // Scramble: Like a rush
                if (currentPlay.result === 'R') {
                  passFields.push(
                    <div key="scramble-receptionResult">
                    <label
                      htmlFor="scramble-receptionResult"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Rush Result
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.receptionResult || ''}
                      onChange={e => setCurrentPlay({ ...currentPlay, receptionResult: e.target.value.toUpperCase() })}
                      placeholder="e.g., T, F, O, ."
                      onFocus={() => setFocusedField('receptionResult')}
                      id="scramble-receptionResult"
                    />
                    </div>
                  );
                  if (currentPlay.receptionResult === 'T') {
                    passFields.push(
                      <div key="scramble-tackler1">
                        <label
                          htmlFor="scramble-tackler1"
                          className="block"
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Tackler 1
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.tackler1 || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                          placeholder="#1"
                          onFocus={() => setFocusedField('tackler1')}
                          id="scramble-tackler1"
                        />
                      </div>
                    );
                    passFields.push(
                      <div key="scramble-tackler2">
                        <label
                          htmlFor="scramble-tackler2"
                          className="block"
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            fontFamily: "'Arial Black', Gadget, sans-serif"
                          }}
                        >
                          Tackler 2
                        </label>
                        <input
                          className="w-20 px-1 py-1 border border-black rounded text-black"
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            fontFamily: "'Arial', sans-serif"
                          }}
                          value={currentPlay.tackler2 || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                          placeholder="#2"
                          onFocus={() => setFocusedField('tackler2')}
                          id="scramble-tackler2"
                        />
                      </div>
                    );
                  }
                  passFields.push(
                    <div key="scramble-spot">
                    <label
                      htmlFor="scramble-spot"
                      className="block"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: "'Arial Black', Gadget, sans-serif"
                      }}
                    >
                      Spot
                    </label>
                    <input
                      className="w-20 px-1 py-1 border border-black rounded text-black"
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Arial', sans-serif"
                      }}
                      value={currentPlay.spot}
                      onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                      placeholder="e.g., H34"
                      onFocus={() => setFocusedField('spot')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmitPlay();
                        }
                      }}
                      id="scramble-spot"
                    />
                    </div>
                  );
                  if (/^[HV]\d{2}$/.test(currentPlay.spot)) {
                    passFields.push(
                      <div key="scramble-submitHint" className="col-span-4">
                        <p className="text-xs text-gray-700 mt-1 italic">Hit Enter to submit play</p>
                      </div>
                    );
                  }
                }
                return (
                  <>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-1 w-full">
                      {passFields}
                    </div>
            {/* Input Assistance Bar */}
                        <div>
              className={`p-4 border-t border-black text-center text-sm transition-all duration-300 ${
                playReadyToSubmit ? 'bg-green-600 text-white font-bold' : 'bg-gray-100 text-black'
              }`}
              aria-label="INPUT ASSISTANCE"
              {playReadyToSubmit ? 'Press Enter to Submit' : inputAssistance}
            </div>
                  </>
                );
              })()}
            </div>

            <div className="bg-black text-white text-left p-2 text-xs h-40 overflow-y-scroll font-mono rounded">
              <div className="font-bold mb-1">DEBUG LOG</div>
              {debugLog.map((entry, idx) => (
                <div key={idx}>{entry}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-1/5 bg-white border-l border-black p-2 overflow-y-auto">
          <details open>
            <summary className="font-bold mb-1 cursor-pointer">Last 15 Plays</summary>
            <div className="text-sm space-y-1 max-h-48 overflow-y-auto pr-1">
              {gameState.previousPlays?.slice(-15).map((play, idx) => (
                <div key={idx} className="border-b border-gray-400 pb-1 flex justify-between items-start">
                  {renderButtons(idx, 'play')}
                  <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{play}</span>
                </div>
              ))}
            </div>
          </details>

          <details className="mt-4">
            <summary className="font-bold mb-1 cursor-pointer">All Drives</summary>
            <div className="space-y-2">
              {gameState.drives?.map((drive, dIdx) => (
                <details key={dIdx} className="ml-2">
                  <summary className="cursor-pointer font-semibold">
                    {`${drive.team} - ${drive.startTime} ${drive.startQuarter} ${drive.startYardline}`}
                  </summary>
                  <div className="ml-4 text-sm space-y-1 pt-1">
                    {drive.plays.map((p, i) => (
                      <div key={i} className="border-b border-gray-300 pb-1 flex justify-between items-start">
                        {renderButtons(i, `drive ${dIdx}`)}
                        <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{p}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        </div>
      </div> {/* close main content row */}
      <div className="bg-white border-t border-black text-center p-3 font-bold text-lg sticky bottom-0 z-20">
        INPUT ASSISTANCE
        <div className="mt-2 text-sm font-normal">
          {focusedField === 'rusher' && <span>Enter the rusher's jersey number.</span>}
          {focusedField === 'result' && (
            <>
              {playType === 'Rush' && (
                <span>T - Tackle &nbsp;|&nbsp; F - Fumble &nbsp;|&nbsp; O - Out of Bounds &nbsp;|&nbsp; . - End of Play</span>
              )}
              {playType === 'Pass' && (
                <span>C - Complete &nbsp;|&nbsp; I - Incomplete &nbsp;|&nbsp; S - Sack &nbsp;|&nbsp; F - Fumble (Sack) &nbsp;|&nbsp; X - Interception &nbsp;|&nbsp; R - Scramble</span>
              )}
              {playType === 'Punt' && (
                <span>R - Return &nbsp;|&nbsp; D - Downed &nbsp;|&nbsp; C - Fair Catch &nbsp;|&nbsp; M - Muffed</span>
              )}
              {playType === 'Kick Menu' && (
                <span>G - Good &nbsp;|&nbsp; B - Blocked &nbsp;|&nbsp; M - Missed &nbsp;|&nbsp; F - Fumbled &nbsp;|&nbsp; X - Intercepted</span>
              )}
              {playType === 'Game Control' && (
                <span>Used for game management and timeouts. No result codes needed.</span>
              )}
            </>
          )}
          {focusedField === 'receptionResult' && (
            <span>T - Tackle &nbsp;|&nbsp; F - Fumble &nbsp;|&nbsp; O - Out of Bounds &nbsp;|&nbsp; . - End of Play</span>
          )}
          {focusedField === 'spot' && <span>Enter the ending spot (e.g., H34).</span>}
          {/* Optionally, add debug instructions for new fumble fields */}
          {focusedField === 'recoveryTeam' && <span>Team that recovered the fumble (H or V).</span>}
          {focusedField === 'recoveryPlayer' && <span>Player number who recovered the fumble.</span>}
          {focusedField === 'recoverySpot' && <span>Spot where the fumble was recovered.</span>}
          {focusedField === 'returner' && <span>Player returning the fumble.</span>}
          {focusedField === 'returnSpot' && <span>Spot where the fumble return ended.</span>}
          {!playType && (
            <>
              <span className="font-bold">KEY SHORTCUTS:</span>
              <span className="ml-2">G - Game Control</span>
              <span className="ml-2">R - Rush</span>
              <span className="ml-2">P - Pass</span>
              <span className="ml-2">E - Pre-snap Penalty</span>
              <span className="ml-2">U - Punt</span>
              <span className="ml-2">K - Kick Menu</span>
            </>
          )}
        </div>
      </div>

      <div className="bg-gray-100 p-4 border-t border-black text-center text-sm">
        <div className="mb-2 font-bold">DEMO CONTROLS</div>
        <div className="flex justify-center space-x-4 mb-2">
          <button className="bg-yellow-300 px-2 py-1 rounded" onClick={() => adjustTimeout('H', 1)}>+ TO H</button>
          <button className="bg-yellow-300 px-2 py-1 rounded" onClick={() => adjustTimeout('H', -1)}>- TO H</button>
          <button className="bg-red-400 px-2 py-1 rounded" onClick={() => toggleChallenge('H')}>Toggle CH H</button>
          <button className="bg-yellow-300 px-2 py-1 rounded" onClick={() => adjustTimeout('V', 1)}>+ TO V</button>
          <button className="bg-yellow-300 px-2 py-1 rounded" onClick={() => adjustTimeout('V', -1)}>- TO V</button>
          <button className="bg-red-400 px-2 py-1 rounded" onClick={() => toggleChallenge('V')}>Toggle CH V</button>
        </div>
        <div>
          <button className="bg-blue-400 px-4 py-1 rounded text-white" onClick={toggleClockMode}>
            {gameConfig.autoClock ? 'Stop Clock' : 'Start Clock'}
          </button>
        </div>
      </div>
      {/* DEBUG LOG PANEL (moved to main content column) */}
    </div>
  );
}
// InputAssistance component: shows dynamic assistance bar below input fields
function InputAssistance({ playReadyToSubmit }) {
  // If playReadyToSubmit, background green and text "Hit Enter to submit play"
  // Otherwise, subtle gray and generic input guidance (or nothing)
  const bg = playReadyToSubmit ? "bg-green-400" : "bg-gray-200";
  const text = playReadyToSubmit ? "Hit Enter to submit play" : "";
  // Hide if no text to show
  if (!text) return null;
  return (
    <div
      className={`${bg} px-2 py-1 rounded mt-2 text-xs font-semibold text-black text-center`}
      style={{ transition: 'background 0.2s' }}
    >
      {text}
    </div>
  );
}
      {/* Loader Spinner Styles */}
      <style>
      {`
        .loader {
          border: 8px solid #444;
          border-top: 8px solid #ffc800;
          border-radius: 50%;
          width: 64px;
          height: 64px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}
      </style>
// LoadingScreen component for loading UI
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-bold text-4xl">
      <div className="animate-pulse">Loading Game...</div>
    </div>
  );
}
// GameControlUI component for Game Control step logic including focusing timeout type input
function GameControlUI({
  gameControlStep,
  setGameControlStep,
  gameControlData,
  setGameControlData,
  currentGameId,
  submitPlay,
  setPlayType,
}) {
  const timeoutTypeRef = React.useRef(null);

  React.useEffect(() => {
    if (gameControlStep === 'awaiting-timeout-type' && timeoutTypeRef.current) {
      timeoutTypeRef.current.focus();
    }
  }, [gameControlStep]);

  return (
    <div className="bg-white border border-black rounded p-3 mt-2 shadow">
      {gameControlStep === 'awaiting-subcommand' && (
        <div>
          <div className="text-lg font-bold mb-2">Game Control</div>
          <div className="space-x-2">
            <button className="bg-yellow-500 px-2 py-1 rounded" onClick={() => setGameControlStep('awaiting-timeout-type')}>Timeouts (T)</button>
          </div>
        </div>
      )}
      {gameControlStep === 'awaiting-timeout-type' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold">Timeout Type (H/V/M/O):</label>
            <input
              ref={timeoutTypeRef}
              className="border border-black rounded px-2 py-1 w-24"
              placeholder="e.g. H"
              value={gameControlData.subtype || ''}
              onChange={(e) =>
                setGameControlData(prev => ({ ...prev, subtype: e.target.value.toLowerCase() }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // stay here, wait for clock input
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-bold">Clock Time:</label>
            <input
              className="border border-black rounded px-2 py-1 w-24"
              placeholder="e.g. 12:34"
              value={gameControlData.clock || ''}
              onChange={(e) => setGameControlData(prev => ({ ...prev, clock: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && gameControlData.subtype && gameControlData.clock) {
                  const playObject = {
                    type: 'game_control',
                    action: 'timeout',
                    subtype: gameControlData.subtype,
                    clock: gameControlData.clock,
                  };
                  submitPlay(currentGameId, playObject);
                  setPlayType('');
                  setGameControlStep(null);
                  setGameControlData({});
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
  // Awaiting subcommand step
  if (gameControlStep === 'awaiting-subcommand') {
    return (
      <div className="flex flex-col space-y-2">
        <div className="text-lg font-bold">Game Control Menu</div>
        <div>
          <button
            className="bg-yellow-400 text-black px-3 py-1 rounded mr-2"
            onClick={() => setGameControlStep('awaiting-timeout-type')}
          >
            Timeout
          </button>
          <button
            className="bg-red-600 text-white px-3 py-1 rounded"
            onClick={() => alert('Challenge not implemented')}
          >
            Challenge
          </button>
        </div>
      </div>
    );
  }
  return null;
}
import React, { useState, useEffect, useRef } from 'react';
import '@fontsource/anton'; // Import Anton font from npm

const TimeoutChallengeDisplay = ({ timeouts, challenge, colorScheme, isVisitor }) => {
  const timeoutCircles = [0, 1, 2].map(i => (
    <div
      key={i}
      className={`w-6 h-4 rounded-full ${i < timeouts ? colorScheme.timeout : 'bg-gray-400'}`}
    />
  ));

  const challengeCircle = (
    <div className={`w-6 h-4 rounded-full ${challenge ? colorScheme.challenge : colorScheme.challengeUsed}`} />
  );

  return (
    <div className={`flex flex-row space-x-1 items-center mt-1`}>
      {isVisitor ? [challengeCircle, ...timeoutCircles.reverse()] : [...timeoutCircles, challengeCircle]}
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
  const rusherInputRef = useRef();
  const passerInputRef = useRef();
  const punterInputRef = useRef();
  const kickerInputRef = useRef();
  const controlInputRef = useRef();
  const penaltyInputRef = useRef();
  const [debugLog, setDebugLog] = useState([]);
  const [focusedField, setFocusedField] = useState('');
  const [playInProgress, setPlayInProgress] = useState(false);
  const [gameState, setGameState] = useState({
    timeouts: { H: 2, V: 1 },
    challenges: { H: true, V: false },
    clock: '12:00',
    quarter: 1,
    scoresByQuarter: {
      H: [7, 14, 0, 7],
      V: [3, 10, 7, 6],
    },
    teamStats: {
      H: {
        firstDowns: 20,
        rushesYards: '35-145',
        passing: '12-20-1',
        passingYards: 175,
        playsTotalYards: '55-320',
        avgPerPlay: 5.8,
        penalties: '5-45',
        punts: '3-120',
        timeOfPossession: '28:34',
        thirdDownEff: '6-12',
        fourthDownEff: '1-2'
      },
      V: {
        firstDowns: 17,
        rushesYards: '30-110',
        passing: '10-18-1',
        passingYards: 155,
        playsTotalYards: '48-265',
        avgPerPlay: 5.5,
        penalties: '7-60',
        punts: '4-150',
        timeOfPossession: '25:26',
        thirdDownEff: '4-11',
        fourthDownEff: '0-1'
      }
    },
    topPlayers: {
      H: {
        passing: ['Smith 12-20-1, 175 YDS'],
        rushing: ['Jones 15-85 YDS', 'Brown 10-60 YDS'],
        receiving: ['Taylor 6-90 YDS', 'White 4-50 YDS']
      },
      V: {
        passing: ['Green 10-18-1, 155 YDS'],
        rushing: ['Thomas 12-70 YDS', 'Adams 8-40 YDS'],
        receiving: ['Lee 5-80 YDS', 'Young 3-45 YDS']
      }
    },
    previousPlays: [
      '(08:45) No Huddle-Shotgun Green pass complete to Lee for 20 yards to the WVSU45, 1ST DOWN',
      '(08:01) Thomas rush for 5 yards to the WVSU40 (Brown)',
      '(07:22) Green pass incomplete intended for Young'
    ],
    drives: [
      {
        team: 'WVSU',
        startTime: '12:00',
        startQuarter: 'Q1',
        startYardline: 'H35',
        plays: [
          '(12:00) Kickoff returned by Smith to the WVSU25',
          '(11:45) Jones rush for 5 yards to the WVSU30'
        ]
      },
      {
        team: 'GSU',
        startTime: '10:10',
        startQuarter: 'Q1',
        startYardline: 'V20',
        plays: [
          '(10:10) Green pass complete to Young for 12 yards to the GSU42',
          '(09:45) Thomas rush for 3 yards to the GSU45'
        ]
      }
    ]
  });
  const [playType, setPlayType] = useState('');
  const [primaryPlayer, setPrimaryPlayer] = useState('');
  const [resultText, setResultText] = useState('');
  const [currentPlay, setCurrentPlay] = useState(null);

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

  // Keyboard shortcut handler for play type selection
  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = event.code.toUpperCase();
      switch (key) {
        case 'KEYG':
          event.preventDefault();
          setPlayType('Game Control');
          break;
        case 'KEYR':
          event.preventDefault();
          setPlayType('Rush');
          startRushPlay();
          logDebug('Play Started: Rush');
          break;
        case 'KEYP':
          event.preventDefault();
          setPlayType('Pass');
          startPassPlay();
          logDebug('Play Started: Pass');
          break;
        case 'KEYE':
          event.preventDefault();
          setPlayType('Pre-snap Penalty');
          break;
        case 'KEYU':
          event.preventDefault();
          setPlayType('Punt');
          break;
        case 'KEYK':
          event.preventDefault();
          setPlayType('Kick Menu');
          break;
        case 'ESCAPE':
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
    // eslint-disable-next-line
  }, []);

  // Helper to add debug log lines
  const logDebug = (message, data = null) => {
    setDebugLog(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}${data ? ' - ' + JSON.stringify(data) : ''}`,
    ]);
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

  // Submit play and append to previous plays
  const handleSubmitPlay = () => {
    if (!currentPlay) return;

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
      // Fumble on a pass play, treat as sack fumble (strip sack)
      currentPlay.countAsPassAttempt = false;
      currentPlay.isSackFumble = true;
      currentPlay.passYardsShouldApply = false;
      // Mark forcedBy as tackler if available
      if (currentPlay.tackler1) currentPlay.forcedBy = currentPlay.tackler1;
      if (currentPlay.tackler2 && !currentPlay.forcedBy) currentPlay.forcedBy = currentPlay.tackler2;
    }

    logDebug('Submitting play', currentPlay);

    // Append to previousPlays
    setGameState(prev => ({
      ...prev,
      previousPlays: [...prev.previousPlays, formatPlaySummary(currentPlay)]
    }));

    // Reset play input
    setCurrentPlay(null);
    setPlayType('');
    setPlayInProgress(false);
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
      {/* Top HUD */}
      <div className="bg-black text-white flex justify-between items-center px-8 py-4 text-center w-full">
        <div className="flex items-center space-x-4">
          <img src="/logos/wvsu.png" alt="WVSU Logo" className="h-12 w-auto" />
          <div className="flex flex-col">
            <div className="flex items-center space-x-2 text-[28px]">
              <span>WEST VIRGINIA ST.</span>
              <span>🏈</span>
              <span>88</span>
            </div>
            <TimeoutChallengeDisplay
              timeouts={gameState.timeouts.H}
              challenge={gameState.challenges.H}
              colorScheme={colorSchemes.H}
              isVisitor={false}
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
              <div className="w-1/3 text-center">1ST</div>
              <div className="w-1/3 text-center">10</div>
              <div className="w-1/3 text-center">V23</div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-2 text-[28px]">
              <span>88</span>
              <span>🏈</span>
              <span>GLENVILLE STATE</span>
            </div>
            <TimeoutChallengeDisplay
              timeouts={gameState.timeouts.V}
              challenge={gameState.challenges.V}
              colorScheme={colorSchemes.V}
              isVisitor={true}
            />
          </div>
          <img src="/logos/glenville.png" alt="Glenville Logo" className="h-12 w-auto" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        <div className="w-1/5 bg-white border-r border-black p-2">
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
                <td className="border border-black font-bold">WVSU</td>
                {gameState.scoresByQuarter.H.map((score, idx) => (
                  <td key={`H${idx}`} className="border border-black">{score}</td>
                ))}
              </tr>
              <tr>
                <td className="border border-black font-bold">GSU</td>
                {gameState.scoresByQuarter.V.map((score, idx) => (
                  <td key={`V${idx}`} className="border border-black">{score}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <table className="w-full text-sm text-center border border-black">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black text-left pl-1">Stat</th>
                <th className="border border-black">WVSU</th>
                <th className="border border-black">GSU</th>
              </tr>
            </thead>
            <tbody>
              {renderTeamStats('First Downs', 'firstDowns')}
              {renderTeamStats('Rush-Yards', 'rushesYards')}
              {renderTeamStats('Passing', 'passing')}
              {renderTeamStats('Passing Yds', 'passingYards')}
              {renderTeamStats('Plays-Tot Yds', 'playsTotalYards')}
              {renderTeamStats('Avg Per Play', 'avgPerPlay')}
              {renderTeamStats('Penalties', 'penalties')}
              {renderTeamStats('Punts', 'punts')}
              {renderTeamStats('Possession', 'timeOfPossession')}
              {renderTeamStats('3rd Down Eff.', 'thirdDownEff')}
              {renderTeamStats('4th Down Eff.', 'fourthDownEff')}
              {renderTopPlayers('Passers', 'passing')}
              {renderTopPlayers('Rushers', 'rushing')}
              {renderTopPlayers('Receivers', 'receiving')}
            </tbody>
          </table>
        </div>
        <div className="flex-1 bg-gray-300 p-4 border-black border-x">
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
            <div className="bg-green-100 p-3 border border-black rounded shadow relative h-20 flex items-center justify-between">
              <div className="text-xs font-bold ml-2">GSU</div>
              <div className="relative flex-1 h-6 mx-2 bg-green-300">
                {[...Array(21)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-white"
                    style={{ left: `${(i * 5)}%` }}
                  />
                ))}
                <div className="absolute top-0 bottom-0 w-px bg-red-600" style={{ left: '70%' }} />
                <div className="absolute -top-4 left-[60%] text-xs font-bold">🏈</div>
              </div>
              <div className="text-xs font-bold mr-2">WVSU</div>
            </div>

            {/* Input Box Panel */}
            <div className={`flex flex-col space-y-2 ${inputBoxBg} p-3 rounded shadow h-full max-w-full overflow-hidden`}>
              <div className="text-xl font-bold mb-2">{playType ? `${playType} Play Started` : 'Ready for Input'}</div>
              {/* RUSH PLAY DYNAMIC INPUTS */}
              {currentPlay && playType === 'Rush' && (() => {
                // Gather dynamic input fields as React nodes in an array
                const rushInputs = [
                  // 1: Rush (input)
                  <div className="flex items-center space-x-2" key="rush">
                    <label className="w-20">Rush:</label>
                    <input
                      ref={rusherInputRef}
                      className="w-28 p-1 border border-gray-400 rounded"
                      value={currentPlay.player}
                      onChange={e => setCurrentPlay({ ...currentPlay, player: e.target.value })}
                      placeholder="Rusher #"
                      onFocus={() => setFocusedField('rusher')}
                    />
                  </div>,
                  // 2: Result (input)
                  <div className="flex items-center space-x-2" key="result">
                    <label className="w-20">Result:</label>
                    <input
                      className="w-28 p-1 border border-gray-400 rounded"
                      value={currentPlay.result}
                      onChange={e => {
                        const value = e.target.value.toUpperCase();
                        setCurrentPlay({ ...currentPlay, result: value });
                        if (value === 'T') {
                          logDebug('Result: T - prompt for tacklers');
                        }
                      }}
                      onKeyDown={e => e.stopPropagation()}
                      placeholder="e.g., T"
                      onFocus={() => setFocusedField('result')}
                    />
                  </div>,
                  // 3,4: Tacklers (input, input) (conditionally rendered)
                  ...(currentPlay.result === 'T'
                    ? [
                        <div className="flex items-center space-x-2" key="tacklers">
                          <label className="w-20">Tacklers:</label>
                          <input
                            className="w-16 p-1 border border-gray-400 rounded"
                            value={currentPlay.tackler1 || ''}
                            onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                            placeholder="#1"
                            onFocus={() => setFocusedField('tackler1')}
                          />,
                          <input
                            className="w-16 p-1 border border-gray-400 rounded"
                            value={currentPlay.tackler2 || ''}
                            onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                            placeholder="#2"
                            onFocus={() => setFocusedField('tackler2')}
                          />,
                        </div>,
                      ]
                    : []),
                  // 5: Rush Result (input)
                  <div className="flex items-center space-x-2" key="rushResult">
                    <label className="w-20">Rush Result:</label>
                    <input
                      className="w-28 p-1 border border-gray-400 rounded"
                      value={currentPlay.rushResult || ''}
                      onChange={e => setCurrentPlay({ ...currentPlay, rushResult: e.target.value.toUpperCase() })}
                      placeholder="e.g., T, F, O, ."
                      onFocus={() => setFocusedField('rushResult')}
                    />
                  </div>,
                  // 6: Spot (input)
                  <div className="flex items-center space-x-2" key="spot">
                    <label className="w-20">Spot:</label>
                    <input
                      className="w-28 p-1 border border-gray-400 rounded"
                      value={currentPlay.spot}
                      onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                      placeholder="e.g., H34"
                      onFocus={() => setFocusedField('spot')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmitPlay();
                        }
                      }}
                    />
                  </div>,
                  // Submit hint
                  (/^[HV]\d{2}$/.test(currentPlay.spot) ? (
                    <p className="text-xs text-gray-700 mt-1 italic" key="submitHint">Hit Enter to submit play</p>
                  ) : null),
                ].filter(Boolean);

                // Split into columns if more than 6 fields (start second col after 6th field)
                let rushFields = null;
                if (rushInputs.length > 6) {
                  rushFields = (
                    <div className="flex flex-wrap gap-4 w-full max-w-full">
                      <div className="w-full md:w-1/2 space-y-2 min-w-[220px]">
                        {rushInputs.slice(0, 6)}
                      </div>
                      <div className="w-full md:w-1/2 space-y-2 min-w-[220px]">
                        {rushInputs.slice(6)}
                      </div>
                    </div>
                  );
                } else {
                  rushFields = (
                    <div className="flex flex-wrap gap-4 w-full max-w-full">
                      {rushInputs}
                    </div>
                  );
                }

                // FUMBLE FLOW: Only show recovery UI if result is 'F', isSackFumble is true, and (tackler1 or tackler2 or rushResult is filled)
                // (rushResult or at least one tackler must be filled)
                const showRecoveryUI =
                  currentPlay.result === 'F' &&
                  currentPlay.isSackFumble === true &&
                  (currentPlay.rushResult || currentPlay.tackler1 || currentPlay.tackler2);

                return (
                  <>
                    {rushFields}
                    {/* Recovery UI for sack-fumble only, after rushResult or tackler filled */}
                    {showRecoveryUI && (
                      <>
                        {/* Fumble recovery fields in flex row for side-by-side layout */}
                        <div className="flex flex-wrap gap-2 mt-2" key="recovery-row">
                          <div className="flex items-center w-[140px]">
                            <label className="w-20">Team:</label>
                            <input
                              className="w-[48%] p-1 border border-gray-400 rounded"
                              value={currentPlay.recoveryTeam || ''}
                              onChange={e => setCurrentPlay({ ...currentPlay, recoveryTeam: e.target.value.toUpperCase() })}
                              placeholder="H or V"
                              onFocus={() => setFocusedField('recoveryTeam')}
                            />
                          </div>
                          <div className="flex items-center w-[140px]">
                            <label className="w-20">Player:</label>
                            <input
                              className="w-[48%] p-1 border border-gray-400 rounded"
                              value={currentPlay.recoveryPlayer || ''}
                              onChange={e => setCurrentPlay({ ...currentPlay, recoveryPlayer: e.target.value })}
                              placeholder="Player #"
                              onFocus={() => setFocusedField('recoveryPlayer')}
                            />
                          </div>
                          <div className="flex items-center w-[140px]">
                            <label className="w-20">Spot:</label>
                            <input
                              className="w-[48%] p-1 border border-gray-400 rounded"
                              value={currentPlay.recoverySpot || ''}
                              onChange={e => setCurrentPlay({ ...currentPlay, recoverySpot: e.target.value.toUpperCase() })}
                              placeholder="e.g., H45"
                              onFocus={() => setFocusedField('recoverySpot')}
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-2" key="returnAttempted">
                          <label className="w-32">Return Attempted?</label>
                          <select
                            className="w-28 p-1 border border-gray-400 rounded"
                            value={currentPlay.returnAttempted || 'N'}
                            onChange={e => setCurrentPlay({ ...currentPlay, returnAttempted: e.target.value })}
                          >
                            <option value="N">No</option>
                            <option value="Y">Yes</option>
                          </select>
                        </div>
                        {currentPlay.returnAttempted === 'Y' && (
                          <>
                            <div className="flex items-center space-x-2" key="returner">
                              <label className="w-32">Returner:</label>
                              <input
                                className="w-28 p-1 border border-gray-400 rounded"
                                value={currentPlay.returner || ''}
                                onChange={e => setCurrentPlay({ ...currentPlay, returner: e.target.value })}
                                placeholder="Player #"
                                onFocus={() => setFocusedField('returner')}
                              />
                            </div>
                            <div className="flex items-center space-x-2" key="returnSpot">
                              <label className="w-32">Return End Spot:</label>
                              <input
                                className="w-28 p-1 border border-gray-400 rounded"
                                value={currentPlay.returnSpot || ''}
                                onChange={e => setCurrentPlay({ ...currentPlay, returnSpot: e.target.value.toUpperCase() })}
                                placeholder="e.g., V45"
                                onFocus={() => setFocusedField('returnSpot')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSubmitPlay();
                                  }
                                }}
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
              {/* PASS PLAY DYNAMIC INPUTS */}
              {currentPlay && playType === 'Pass' && (() => {
                // Always render Passer and Result fields, side by side in grid
                const passerAndResult = (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="flex flex-col">
                      <label className="font-bold text-sm text-left pl-1">Passer</label>
                      <input
                        ref={passerInputRef}
                        type="text"
                        name="passer"
                        value={currentPlay.passer}
                        onChange={e => setCurrentPlay({ ...currentPlay, passer: e.target.value })}
                        className="border p-1 text-black w-full"
                        autoFocus={focusedField === 'passer'}
                        placeholder="Passer #"
                        onFocus={() => setFocusedField('passer')}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="font-bold text-sm text-left pl-1">Pass Result</label>
                      <input
                        type="text"
                        name="result"
                        placeholder="C, I, S, F, X, R"
                        value={currentPlay.result}
                        onChange={e => {
                          const value = e.target.value.toUpperCase();
                          setCurrentPlay({ ...currentPlay, result: value });
                          if (value === 'T') {
                            logDebug('Result: T - prompt for tacklers');
                          }
                        }}
                        className="border p-1 text-black w-full uppercase"
                        onFocus={() => setFocusedField('result')}
                        onKeyDown={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                );

                // Additional dynamic fields (below Passer/Result)
                const additionalFields = [];
                // Tacklers for T result
                if (currentPlay.result === 'T') {
                  additionalFields.push(
                    <div className="flex items-center space-x-2" key="tacklers">
                      <label className="w-20">Tacklers:</label>
                      <input
                        className="w-16 p-1 border border-gray-400 rounded"
                        value={currentPlay.tackler1 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                        placeholder="#1"
                        onFocus={() => setFocusedField('tackler1')}
                      />
                      <input
                        className="w-16 p-1 border border-gray-400 rounded"
                        value={currentPlay.tackler2 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                        placeholder="#2"
                        onFocus={() => setFocusedField('tackler2')}
                      />
                    </div>
                  );
                }
                // Fumble branch (complex: split into two columns)
                if (['C', 'F', 'X', 'I'].includes(currentPlay.result) && currentPlay.result === 'F') {
                  // Move "Return Attempted?" and its children to fumbleCol2
                  const fumbleCol1 = [
                    <div className="flex items-center space-x-2" key="fumble-tacklers">
                      <label className="w-20">Tacklers:</label>
                      <input
                        className="w-16 p-1 border border-gray-400 rounded"
                        value={currentPlay.tackler1 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                        placeholder="#1"
                        onFocus={() => setFocusedField('tackler1')}
                      />,
                      <input
                        className="w-16 p-1 border border-gray-400 rounded"
                        value={currentPlay.tackler2 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                        placeholder="#2"
                        onFocus={() => setFocusedField('tackler2')}
                      />,
                    </div>,
                    <div className="flex items-center space-x-2" key="fumble-spot">
                      <label className="w-20">Spot:</label>
                      <input
                        className="w-28 p-1 border border-gray-400 rounded"
                        value={currentPlay.spot}
                        onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                        placeholder="e.g., H34"
                        onFocus={() => setFocusedField('spot')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitPlay();
                          }
                        }}
                      />
                    </div>,
                    (/^[HV]\d{2}$/.test(currentPlay.spot) ? (
                      <p className="text-xs text-gray-700 mt-1 italic" key="fumble-submitHint">Hit Enter to submit play</p>
                    ) : null),
                    <div className="flex items-center space-x-2" key="recoveredBy">
                      <label className="w-20">Recovered By:</label>
                      <input
                        className="w-16 p-1 border border-gray-400 rounded"
                        value={currentPlay.recoveryTeam || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoveryTeam: e.target.value.toUpperCase() })}
                        placeholder="H or V"
                        onFocus={() => setFocusedField('recoveryTeam')}
                      />
                      <input
                        className="w-16 p-1 border border-gray-400 rounded"
                        value={currentPlay.recoveryPlayer || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoveryPlayer: e.target.value })}
                        placeholder="Player #"
                        onFocus={() => setFocusedField('recoveryPlayer')}
                      />
                    </div>,
                    <div className="flex items-center space-x-2" key="recoverySpot">
                      <label className="w-20">Recovery Spot:</label>
                      <input
                        className="w-28 p-1 border border-gray-400 rounded"
                        value={currentPlay.recoverySpot || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, recoverySpot: e.target.value.toUpperCase() })}
                        placeholder="e.g., H45"
                        onFocus={() => setFocusedField('recoverySpot')}
                      />
                    </div>,
                  ].filter(Boolean);
                  const fumbleCol2 = [
                    <div className="col-span-2 md:col-span-1 flex items-center space-x-2" key="returnAttempted">
                      <label className="w-20">Return Attempted?</label>
                      <select
                        className="w-28 p-1 border border-gray-400 rounded"
                        value={currentPlay.returnAttempted || 'N'}
                        onChange={e => setCurrentPlay({ ...currentPlay, returnAttempted: e.target.value })}
                      >
                        <option value="N">No</option>
                        <option value="Y">Yes</option>
                      </select>
                    </div>,
                    ...(currentPlay.returnAttempted === 'Y'
                      ? [
                          <div className="flex items-center space-x-2" key="returner">
                            <label className="w-20">Returner:</label>
                            <input
                              className="w-28 p-1 border border-gray-400 rounded"
                              value={currentPlay.returner || ''}
                              onChange={e => setCurrentPlay({ ...currentPlay, returner: e.target.value })}
                              placeholder="Player #"
                              onFocus={() => setFocusedField('returner')}
                            />
                          </div>,
                          <div className="flex items-center space-x-2" key="returnSpot">
                            <label className="w-20">Return End Spot:</label>
                            <input
                              className="w-28 p-1 border border-gray-400 rounded"
                              value={currentPlay.returnSpot || ''}
                              onChange={e => setCurrentPlay({ ...currentPlay, returnSpot: e.target.value.toUpperCase() })}
                              placeholder="e.g., V45"
                              onFocus={() => setFocusedField('returnSpot')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSubmitPlay();
                                }
                              }}
                            />
                          </div>,
                        ]
                      : []),
                  ].filter(Boolean);
                  // Wrap all fumble fields in responsive grid
                  return (
                    <>
                      {passerAndResult}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full mt-2">
                        <div className="space-y-2">{fumbleCol1}</div>
                        <div className="space-y-2">{fumbleCol2}</div>
                      </div>
                    </>
                  );
                }
                // Not fumble - continue with other pass fields
                if (['C', 'X', 'I'].includes(currentPlay.result)) {
                  // Target
                  additionalFields.push(
                    <div className="flex items-center space-x-2" key="target">
                      <label className="w-20">
                        {currentPlay.result === 'C' ? 'Caught By:' : 'Target:'}
                      </label>
                      <input
                        className="w-28 p-1 border border-gray-400 rounded"
                        value={currentPlay.target}
                        onChange={e => setCurrentPlay({ ...currentPlay, target: e.target.value })}
                        placeholder="Receiver #"
                        onFocus={() => setFocusedField('target')}
                      />
                    </div>
                  );
                  // Incomplete reason checkboxes
                  if (currentPlay.result === 'I') {
                    additionalFields.push(
                      <div className="flex flex-wrap items-center space-x-2" key="incompleteTags">
                        <label className="w-20">Reason:</label>
                        {['Dropped', 'Overthrown', 'Uncatchable', 'Thrown Away'].map(tag => (
                          <label key={tag} className="flex items-center space-x-1">
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
                    );
                  }
                  // Caught At (input) if yacTracking
                  if (gameConfig.yacTracking) {
                    additionalFields.push(
                      <div className="flex items-center space-x-2" key="catchSpot">
                        <label className="w-20">Caught At:</label>
                        <input
                          className="w-28 p-1 border border-gray-400 rounded"
                          value={currentPlay.catchSpot || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, catchSpot: e.target.value })}
                          placeholder="e.g., V45"
                          onFocus={() => setFocusedField('catchSpot')}
                        />
                      </div>
                    );
                  }
                  // Reception Result (input) for Complete passes
                  if (currentPlay.result === 'C') {
                    additionalFields.push(
                      <div className="flex items-center space-x-2" key="receptionResult">
                        <label className="w-20">Reception Result:</label>
                        <input
                          className="w-28 p-1 border border-gray-400 rounded"
                          value={currentPlay.receptionResult || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, receptionResult: e.target.value.toUpperCase() })}
                          placeholder="e.g., T, F, O, ."
                          onFocus={() => setFocusedField('receptionResult')}
                        />
                      </div>
                    );
                  }
                  // Tacklers for T result after complete
                  if (currentPlay.result === 'C' && currentPlay.receptionResult === 'T') {
                    additionalFields.push(
                      <div className="flex items-center space-x-2" key="reception-tacklers">
                        <label className="w-20">Tacklers:</label>
                        <input
                          className="w-16 p-1 border border-gray-400 rounded"
                          value={currentPlay.tackler1 || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                          placeholder="#1"
                          onFocus={() => setFocusedField('tackler1')}
                        />
                        <input
                          className="w-16 p-1 border border-gray-400 rounded"
                          value={currentPlay.tackler2 || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                          placeholder="#2"
                          onFocus={() => setFocusedField('tackler2')}
                        />
                      </div>
                    );
                  }
                  // Spot (input)
                  additionalFields.push(
                    <div className="flex items-center space-x-2" key="spot">
                      <label className="w-20">Spot:</label>
                      <input
                        className="w-28 p-1 border border-gray-400 rounded"
                        value={currentPlay.spot}
                        onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                        placeholder="e.g., H34"
                        onFocus={() => setFocusedField('spot')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitPlay();
                          }
                        }}
                      />
                    </div>
                  );
                  // Submit hint
                  if (/^[HV]\d{2}$/.test(currentPlay.spot)) {
                    additionalFields.push(
                      <p className="text-xs text-gray-700 mt-1 italic" key="submitHint">Hit Enter to submit play</p>
                    );
                  }
                }
                // Sack: Show only tacklers and spot
                if (currentPlay.result === 'S') {
                  additionalFields.push(
                    <div className="flex items-center space-x-2" key="sack-tacklers">
                      <label className="w-20">Tacklers:</label>
                      <input
                        className="w-16 p-1 border border-gray-400 rounded"
                        value={currentPlay.tackler1 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                        placeholder="#1"
                        onFocus={() => setFocusedField('tackler1')}
                      />
                      <input
                        className="w-16 p-1 border border-gray-400 rounded"
                        value={currentPlay.tackler2 || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                        placeholder="#2"
                        onFocus={() => setFocusedField('tackler2')}
                      />
                    </div>
                  );
                  additionalFields.push(
                    <div className="flex items-center space-x-2" key="sack-spot">
                      <label className="w-20">Spot:</label>
                      <input
                        className="w-28 p-1 border border-gray-400 rounded"
                        value={currentPlay.spot}
                        onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                        placeholder="e.g., H34"
                        onFocus={() => setFocusedField('spot')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitPlay();
                          }
                        }}
                      />
                    </div>
                  );
                  if (/^[HV]\d{2}$/.test(currentPlay.spot)) {
                    additionalFields.push(
                      <p className="text-xs text-gray-700 mt-1 italic" key="sack-submitHint">Hit Enter to submit play</p>
                    );
                  }
                }
                // Scramble: Like a rush
                if (currentPlay.result === 'R') {
                  additionalFields.push(
                    <div className="flex items-center space-x-2" key="scramble-receptionResult">
                      <label className="w-20">Rush Result:</label>
                      <input
                        className="w-28 p-1 border border-gray-400 rounded"
                        value={currentPlay.receptionResult || ''}
                        onChange={e => setCurrentPlay({ ...currentPlay, receptionResult: e.target.value.toUpperCase() })}
                        placeholder="e.g., T, F, O, ."
                        onFocus={() => setFocusedField('receptionResult')}
                      />
                    </div>
                  );
                  if (currentPlay.receptionResult === 'T') {
                    additionalFields.push(
                      <div className="flex items-center space-x-2" key="scramble-tacklers">
                        <label className="w-20">Tacklers:</label>
                        <input
                          className="w-16 p-1 border border-gray-400 rounded"
                          value={currentPlay.tackler1 || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, tackler1: e.target.value })}
                          placeholder="#1"
                          onFocus={() => setFocusedField('tackler1')}
                        />
                        <input
                          className="w-16 p-1 border border-gray-400 rounded"
                          value={currentPlay.tackler2 || ''}
                          onChange={e => setCurrentPlay({ ...currentPlay, tackler2: e.target.value })}
                          placeholder="#2"
                          onFocus={() => setFocusedField('tackler2')}
                        />
                      </div>
                    );
                  }
                  additionalFields.push(
                    <div className="flex items-center space-x-2" key="scramble-spot">
                      <label className="w-20">Spot:</label>
                      <input
                        className="w-28 p-1 border border-gray-400 rounded"
                        value={currentPlay.spot}
                        onChange={e => setCurrentPlay({ ...currentPlay, spot: e.target.value.toUpperCase() })}
                        placeholder="e.g., H34"
                        onFocus={() => setFocusedField('spot')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitPlay();
                          }
                        }}
                      />
                    </div>
                  );
                  if (/^[HV]\d{2}$/.test(currentPlay.spot)) {
                    additionalFields.push(
                      <p className="text-xs text-gray-700 mt-1 italic" key="scramble-submitHint">Hit Enter to submit play</p>
                    );
                  }
                }
                // Wrap the whole dynamic input section in a responsive grid
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                    <div className="col-span-2">{passerAndResult}</div>
                    {additionalFields}
                  </div>
                );
              })()}
            </div>

            {/* Debug Log (relocated) */}
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
      <div className="bg-white border-t border-black text-center p-3 font-bold text-lg">
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
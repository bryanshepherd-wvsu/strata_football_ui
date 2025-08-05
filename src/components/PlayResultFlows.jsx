/**
 * PlayResultFlows.jsx
 * 
 * Contains the definitions and handlers for common play result flows that are shared
 * across different play types (rush, pass, punt, etc.)
 */

// Main result types
export const RESULT_TYPES = {
  TACKLE: 'T',
  FUMBLE: 'F',
  OUT_OF_BOUNDS: 'O',
  END_OF_PLAY: '.',
  INCOMPLETE: 'I',
  COMPLETE: 'C',
  SACK: 'S'
};

/**
 * Initialize a tackle flow with optional initial data
 */
export const initTackleFlow = (initialData = {}) => ({
  result: RESULT_TYPES.TACKLE,
  tackler1: initialData.tackler1 || '',
  tackler2: initialData.tackler2 || '',
  spot: initialData.spot || '',
  tackleType: initialData.tackler2 ? 'assisted' : 'solo'
});

/**
 * Initialize a fumble flow with optional initial data
 */
export const initFumbleFlow = (initialData = {}) => ({
  result: RESULT_TYPES.FUMBLE,
  forcedBy: initialData.forcedBy || '',
  recoveryTeam: initialData.recoveryTeam || '',
  recoveryPlayer: initialData.recoveryPlayer || '',
  recoverySpot: initialData.recoverySpot || '',
  returnAttempted: initialData.returnAttempted || 'N',
  returner: initialData.returner || '',
  returnSpot: initialData.returnSpot || '',
  returnResult: initialData.returnResult || ''
});

/**
 * Initialize an out of bounds flow with optional initial data
 */
export const initOutOfBoundsFlow = (initialData = {}) => ({
  result: RESULT_TYPES.OUT_OF_BOUNDS,
  tackler1: initialData.tackler1 || '',
  spot: initialData.spot || '',
  isOutOfBounds: true
});

/**
 * Initialize an end of play flow with optional initial data
 */
export const initEndOfPlayFlow = (initialData = {}) => ({
  result: RESULT_TYPES.END_OF_PLAY,
  spot: initialData.spot || ''
});

/**
 * Initialize an incomplete flow with optional initial data
 */
export const initIncompleteFlow = (initialData = {}) => ({
  result: RESULT_TYPES.INCOMPLETE,
  intendedFor: initialData.intendedFor || '',
  spot: initialData.spot || '',
  dropped: initialData.dropped || false,
  brokenUp: initialData.brokenUp || false,
  brokenUpBy: initialData.brokenUpBy || '',
  overthrown: initialData.overthrown || false,
  thrownAway: initialData.thrownAway || false,
  qbHurries: initialData.qbHurries || 0
});

/**
 * Initialize a complete flow with optional initial data
 */
export const initCompleteFlow = (initialData = {}) => ({
  result: RESULT_TYPES.COMPLETE,
  receiver: initialData.receiver || '',
  catchSpot: initialData.catchSpot !== undefined ? initialData.catchSpot : '',
  receptionResult: initialData.receptionResult || ''
});

/**
 * Initialize a sack flow with optional initial data
 */
export const initSackFlow = (initialData = {}) => ({
  result: RESULT_TYPES.SACK,
  tackler1: initialData.tackler1 || '',
  tackler2: initialData.tackler2 || '',
  spot: initialData.spot || '',
  tackleType: initialData.tackler2 ? 'assisted' : 'solo',
  isSack: true
});

/**
 * Initialize a sack fumble flow with optional initial data
 * This is a special fumble that starts with sack data (tacklers)
 */
export const initSackFumbleFlow = (initialData = {}) => ({
  result: RESULT_TYPES.FUMBLE,
  tackler1: initialData.tackler1 || '',
  tackler2: initialData.tackler2 || '',
  forcedBy: initialData.forcedBy || initialData.tackler1 || '', // Use sacker as forcer
  recoveryTeam: initialData.recoveryTeam || '',
  recoveryPlayer: initialData.recoveryPlayer || '',
  recoverySpot: initialData.recoverySpot || '',
  returnAttempted: initialData.returnAttempted || 'N',
  returner: initialData.returner || '',
  returnSpot: initialData.returnSpot || '',
  returnResult: initialData.returnResult || '',
  isSack: true,
  isFumble: true,
  isSackFumble: true // Special flag to identify sack fumbles
});

/**
 * Get the appropriate flow initialization function based on result type
 */
export const getFlowInitForResult = (resultType, context = {}) => {
  switch (resultType) {
    case RESULT_TYPES.TACKLE:
      return initTackleFlow;
    case RESULT_TYPES.FUMBLE:
      // Check if this is a sack fumble context
      if (context.isSackFumble || context.playType === 'pass') {
        return initSackFumbleFlow;
      }
      return initFumbleFlow;
    case RESULT_TYPES.OUT_OF_BOUNDS:
      return initOutOfBoundsFlow;
    case RESULT_TYPES.END_OF_PLAY:
      return initEndOfPlayFlow;
    case RESULT_TYPES.INCOMPLETE:
      return initIncompleteFlow;
    case RESULT_TYPES.COMPLETE:
      return initCompleteFlow;
    case RESULT_TYPES.SACK:
      return initSackFlow;
    default:
      return null;
  }
};

/**
 * Process tackle result data to prepare for submission
 */
export const processTackleData = (playData, tackleData) => {
  return {
    ...playData,
    result: RESULT_TYPES.TACKLE,
    tackler1: tackleData.tackler1,
    tackler2: tackleData.tackler2,
    spot: tackleData.spot
  };
};

/**
 * Process fumble result data to prepare for submission
 */
export const processFumbleData = (playData, fumbleData) => {
  const fumble = {
    forcedBy: fumbleData.forcedBy ? [fumbleData.forcedBy] : [],
    recoveredBy: {
      player: fumbleData.recoveryPlayer,
      team: fumbleData.recoveryTeam
    },
    recoverySpot: fumbleData.recoverySpot,
    returnSpot: fumbleData.returnSpot || null,
    endSpot: fumbleData.returnSpot || fumbleData.recoverySpot,
    td: fumbleData.returnResult === 'TD' || false
  };

  return {
    ...playData,
    result: RESULT_TYPES.FUMBLE,
    fumble,
    tackler1: fumbleData.tackler1 || playData.tackler1,
    tackler2: fumbleData.tackler2 || playData.tackler2,
    spot: fumbleData.spot || fumbleData.recoverySpot,
    recoveryTeam: fumbleData.recoveryTeam,
    recoveryPlayer: fumbleData.recoveryPlayer,
    isTurnover: fumbleData.recoveryTeam !== playData.team
  };
};

/**
 * Process out of bounds result data to prepare for submission
 */
export const processOutOfBoundsData = (playData, outOfBoundsData) => {
  return {
    ...playData,
    result: RESULT_TYPES.OUT_OF_BOUNDS,
    tackler1: outOfBoundsData.tackler1,
    spot: outOfBoundsData.spot,
    isOutOfBounds: true
  };
};

/**
 * Process end of play result data to prepare for submission
 */
export const processEndOfPlayData = (playData, endOfPlayData) => {
  return {
    ...playData,
    result: RESULT_TYPES.END_OF_PLAY,
    spot: endOfPlayData.spot
  };
};

/**
 * Process incomplete result data to prepare for submission
 */
export const processIncompleteData = (playData, incompleteData) => {
  return {
    ...playData,
    result: RESULT_TYPES.INCOMPLETE,
    intendedFor: incompleteData.intendedFor,
    spot: incompleteData.spot,
    dropped: incompleteData.dropped,
    brokenUp: incompleteData.brokenUp,
    brokenUpBy: incompleteData.brokenUpBy,
    overthrown: incompleteData.overthrown,
    thrownAway: incompleteData.thrownAway,
    qbHurries: incompleteData.qbHurries
  };
};

/**
 * Process complete result data to prepare for submission
 */
export const processCompleteData = (playData, completeData) => {
  return {
    ...playData,
    result: RESULT_TYPES.COMPLETE,
    receiver: completeData.receiver,
    catchSpot: completeData.catchSpot,
    receptionResult: completeData.receptionResult
  };
};

/**
 * Process sack result data to prepare for submission
 */
export const processSackData = (playData, sackData) => {
  return {
    ...playData,
    result: RESULT_TYPES.SACK,
    tackler1: sackData.tackler1,
    tackler2: sackData.tackler2,
    spot: sackData.spot,
    isSack: true,
    sackYards: calculateSackYards(playData.spot, sackData.spot)
  };
};

/**
 * Process sack fumble result data to prepare for submission
 */
export const processSackFumbleData = (playData, sackFumbleData) => {
  const fumble = {
    forcedBy: sackFumbleData.forcedBy ? [sackFumbleData.forcedBy] : [],
    recoveredBy: {
      player: sackFumbleData.recoveryPlayer,
      team: sackFumbleData.recoveryTeam
    },
    recoverySpot: sackFumbleData.recoverySpot,
    returnSpot: sackFumbleData.returnSpot || null,
    endSpot: sackFumbleData.returnSpot || sackFumbleData.recoverySpot,
    td: sackFumbleData.returnResult === 'TD' || false
  };

  return {
    ...playData,
    result: RESULT_TYPES.FUMBLE,
    fumble,
    tackler1: sackFumbleData.tackler1,
    tackler2: sackFumbleData.tackler2,
    spot: sackFumbleData.spot || sackFumbleData.recoverySpot,
    recoveryTeam: sackFumbleData.recoveryTeam,
    recoveryPlayer: sackFumbleData.recoveryPlayer,
    isTurnover: sackFumbleData.recoveryTeam !== playData.team,
    isSack: true,
    isFumble: true,
    isSackFumble: true,
    sackYards: calculateSackYards(playData.spot, sackFumbleData.recoverySpot)
  };
};

/**
 * Process scramble result data to prepare for submission
 * Scrambles are handled as rush plays with special flagging
 */
export const processScrambleData = (playData, scrambleData) => {
  return {
    ...playData,
    result: RESULT_TYPES.TACKLE, // Scrambles end with tackles
    playType: 'rush', // Convert to rush
    rusher: playData.passer || playData.rusher, // Use QB as rusher
    tackler1: scrambleData.tackler1,
    tackler2: scrambleData.tackler2,
    spot: scrambleData.spot,
    isScramble: true, // Flag for stats
    yards: calculateYardsGained(playData.spot, scrambleData.spot)
  };
};

/**
 * Helper function to calculate sack yardage (always negative for offense)
 */
const calculateSackYards = (fromSpot, toSpot) => {
  if (!fromSpot || !toSpot) return 0;
  
  const fromSide = fromSpot[0];
  const fromYard = parseInt(fromSpot.slice(1));
  const toSide = toSpot[0];
  const toYard = parseInt(toSpot.slice(1));
  
  // Calculate field position change
  const fromFieldPos = fromSide === 'H' ? fromYard : (100 - fromYard);
  const toFieldPos = toSide === 'H' ? toYard : (100 - toYard);
  
  // For sacks, this should always be negative (loss of yards)
  return toFieldPos - fromFieldPos;
};

/**
 * Helper function to calculate yards gained from spot change
 */
const calculateYardsGained = (fromSpot, toSpot) => {
  if (!fromSpot || !toSpot) return 0;
  
  const fromSide = fromSpot[0];
  const fromYard = parseInt(fromSpot.slice(1));
  const toSide = toSpot[0];
  const toYard = parseInt(toSpot.slice(1));
  
  // Calculate field position change
  const fromFieldPos = fromSide === 'H' ? fromYard : (100 - fromYard);
  const toFieldPos = toSide === 'H' ? toYard : (100 - toYard);
  
  // Return the difference in field position
  return Math.abs(toFieldPos - fromFieldPos);
};

/**
 * Get the appropriate data processor function based on result type
 */
export const getProcessorForResult = (resultType, context = {}) => {
  switch (resultType) {
    case RESULT_TYPES.TACKLE:
      return processTackleData;
    case RESULT_TYPES.FUMBLE:
      // Check if this is a sack fumble context
      if (context.isSackFumble || context.playType === 'pass') {
        return processSackFumbleData;
      }
      return processFumbleData;
    case RESULT_TYPES.OUT_OF_BOUNDS:
      return processOutOfBoundsData;
    case RESULT_TYPES.END_OF_PLAY:
      return processEndOfPlayData;
    case RESULT_TYPES.INCOMPLETE:
      return processIncompleteData;
    case RESULT_TYPES.COMPLETE:
      return processCompleteData;
    case RESULT_TYPES.SACK:
      return processSackData;
    default:
      return (playData) => playData; // No-op processor
  }
};
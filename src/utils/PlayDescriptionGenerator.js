export const generatePlayDescription = (playData) => {
  console.log('Generating play description for:', playData);
  
  // Helper function to format terminal data
  const formatTerminalData = (terminalResult, playData) => {
    switch (terminalResult) {
      case 'T': // Tackle
        const tackler = playData.tackler1 ? ` (tackled by ${playData.tackler1}` : '';
        const assistedBy = playData.tackler2 && playData.tackler2.trim() !== '' ? `, ${playData.tackler2}` : '';
        const tackleClose = tackler ? ')' : '';
        return `${tackler}${assistedBy}${tackleClose}`;
      case 'O': // Out of bounds
        return ' (out of bounds)';
      case '.': // End of play
        // For auto-terminal cases, don't add extra notation
        if (playData.resultCode === 'I') return ''; // Incomplete pass - no extra notation
        if (playData.resultCode === 'D') return ' (downed)'; // Punt downed
        if (playData.resultCode === 'B') return ' (blocked)'; // Punt blocked
        if (playData.resultCode === 'A') return ' (accepted)'; // Penalty accepted
        return ' (touchdown)'; // Default for manual . terminal
      default:
        return '';
    }
  };
  
  const spot = playData.spot ? ` at ${playData.spot}` : '';
  const terminalOutcome = formatTerminalData(playData.terminalResult, playData);
  
  // Use resultCode (original primary result) instead of result (which gets overwritten)
  const primaryResult = playData.resultCode || playData.result;
  
  // Generate play description based on play type
  switch (playData.playType) {
    case 'rush':
      return `${playData.rusher} rush for ${playData.yards || 0} yards${terminalOutcome}${spot}`;
      
    case 'pass':
      if (primaryResult === 'C') {
        const receiver = playData.receiver ? ` to ${playData.receiver}` : '';
        const caughtAt = playData.caughtAt ? ` caught at ${playData.caughtAt}` : '';
        return `${playData.passer} pass complete${receiver}${caughtAt}${terminalOutcome}${spot}`;
      } else if (primaryResult === 'I') {
        const intended = playData.intendedFor ? ` intended for ${playData.intendedFor}` : '';
        return `${playData.passer} pass incomplete${intended}${spot}`;
      } else if (primaryResult === 'S') {
        const sacker = playData.tackler1 ? ` (sacked by ${playData.tackler1}` : '';
        const assistedBy = playData.tackler2 && playData.tackler2.trim() !== '' ? `, ${playData.tackler2}` : '';
        const sackClose = sacker ? ')' : '';
        const sackYards = playData.sackYards ? ` for ${Math.abs(playData.sackYards)} yard loss` : '';
        return `${playData.passer} sacked${sackYards}${sacker}${assistedBy}${sackClose}${spot}`;
      } else if (primaryResult === 'F' && playData.isSackFumble) {
        const sacker = playData.forcedBy ? ` (sack fumble forced by ${playData.forcedBy})` : ' (sack fumble)';
        const recovery = playData.recoveryTeam && playData.recoveryPlayer ? 
          ` recovered by ${playData.recoveryTeam} #${playData.recoveryPlayer}` : '';
        return `${playData.passer} sacked${sacker}${recovery}${terminalOutcome}${spot}`;
      } else {
        return `${playData.passer} pass - result: ${primaryResult}${terminalOutcome}`;
      }
      
    // ...existing cases for punt, kickoff, field_goal, penalty, game...
      
    default:
      return `${playData.playType} play${terminalOutcome}${spot}`;
  }
};

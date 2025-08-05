const TimeoutChallengeDisplay = ({ timeouts, challenge, colorScheme, isVisitor, showChallenges = true }) => {
  const timeoutCircles = [0, 1, 2].map(i => (
    <div key={i} className={`w-12 h-4 rounded-full ${i < timeouts ? colorScheme.timeout : 'bg-gray-400'}`} />
  ));

  const challengeCircle = showChallenges ? (
    <div className={`w-12 h-4 rounded-full ${challenge ? colorScheme.challenge : colorScheme.challengeUsed}`} />
  ) : null;

  return (
    <div className="flex flex-row space-x-1 items-center mt-1">
      {isVisitor
        ? (showChallenges ? [challengeCircle, ...timeoutCircles.reverse()] : [...timeoutCircles.reverse()])
        : (showChallenges ? [...timeoutCircles, challengeCircle] : [...timeoutCircles])}
    </div>
  );
};

export default TimeoutChallengeDisplay;

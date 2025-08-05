import React from 'react';
import { useGameState } from './GameStateContext';

const StatWindow = () => {
  const { gameState, teamMetadata } = useGameState();

  const renderTeamStats = (label, key) => (
    <tr>
      <td className="border border-black text-left pl-1">{label}</td>
      <td className="border border-black">{gameState?.teamStats?.H?.[key] ?? '-'}</td>
      <td className="border border-black">{gameState?.teamStats?.V?.[key] ?? '-'}</td>
    </tr>
  );

  const renderTopPlayers = (label, statKey) => (
    <>
      <tr className="bg-gray-200">
        <td colSpan="3" className="text-left pl-1 font-bold">Top {label}</td>
      </tr>
      {Array.from({ length: 2 }).map((_, i) => (
        <tr key={`${statKey}-row-${i}`}>
          <td className="border border-black text-left pl-1">{i + 1}.</td>
          <td className="border border-black">{gameState?.topPlayers?.H?.[statKey]?.[i] ?? '-'}</td>
          <td className="border border-black">{gameState?.topPlayers?.V?.[statKey]?.[i] ?? '-'}</td>
        </tr>
      ))}
    </>
  );

  return (
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
            {(gameState?.scoresByQuarter?.V || [0, 0, 0, 0]).map((score, idx) => (
              <td key={`V${idx}`} className="border border-black">{score}</td>
            ))}
          </tr>
          <tr>
            <td className="border border-black font-bold">{teamMetadata?.Home?.abbreviation || "HOME"}</td>
            {(gameState?.scoresByQuarter?.H || [0, 0, 0, 0]).map((score, idx) => (
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
          {renderTeamStats('Penalty Yds', 'penaltyYards')}
          {renderTeamStats('Touchbacks', 'touchbacks')}
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
  );
};

export default StatWindow;
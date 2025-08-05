import React, { useState } from 'react';

const PenaltyTable = ({ onPenaltySelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('HS'); // HS or NCAA

  const penalties = [
    // Alphabetized Penalties
    { name: 'Chop Block', code: 'CB', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Repeat' },
    { name: 'Clipping', code: 'CLP', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Repeat' },
    { name: 'Delay of Game', code: 'DOG', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Encroachment', code: 'EN', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Facemask', code: 'FM', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Fair Catch Interference', code: 'FCI', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'False Start', code: 'FS', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Holding (Defensive)', code: 'DH', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Automatic 1st' },
    { name: 'Holding (Offensive)', code: 'OH', hsYards: 10, hsDown: 'Repeat', ncaaYards: 10, ncaaDown: 'Repeat' },
    { name: 'Horse Collar Tackle', code: 'HCT', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Illegal Batting', code: 'IB', hsYards: 10, hsDown: 'Repeat', ncaaYards: 10, ncaaDown: 'Repeat' },
    { name: 'Illegal Block in the Back', code: 'IBB', hsYards: 10, hsDown: 'Repeat', ncaaYards: 10, ncaaDown: 'Repeat' },
    { name: 'Illegal Contact', code: 'IC', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Automatic 1st' },
    { name: 'Illegal Equipment', code: 'IE', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Illegal Formation', code: 'IF', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Illegal Forward Pass', code: 'IFP', hsYards: 5, hsDown: 'Loss of Down', ncaaYards: 5, ncaaDown: 'Loss of Down' },
    { name: 'Illegal Kicking', code: 'IK', hsYards: 10, hsDown: 'Repeat', ncaaYards: 10, ncaaDown: 'Repeat' },
    { name: 'Illegal Motion', code: 'IM', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Illegal Participation', code: 'IP', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Repeat' },
    { name: 'Illegal Procedure', code: 'IPR', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Illegal Shift', code: 'IS', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Illegal Substitution', code: 'ISUB', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Illegal Use of Hands', code: 'IUH', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Automatic 1st' },
    { name: 'Ineligible Receiver Downfield', code: 'IRD', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Intentional Grounding', code: 'IG', hsYards: 'Loss of Down', hsDown: 'Loss of Down', ncaaYards: 'Loss of Down', ncaaDown: 'Loss of Down' },
    { name: 'Kick Catch Interference', code: 'KCI', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Kickoff Out of Bounds', code: 'KOB', hsYards: 5, hsDown: 'Rekick', ncaaYards: 5, ncaaDown: 'Rekick' },
    { name: 'Neutral Zone Infraction', code: 'NZI', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Offside', code: 'OS', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Pass Interference (Defensive)', code: 'DPI', hsYards: 'Spot', hsDown: 'Repeat', ncaaYards: 'Spot', ncaaDown: 'Automatic 1st' },
    { name: 'Pass Interference (Offensive)', code: 'OPI', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Repeat' },
    { name: 'Personal Foul', code: 'PF', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Roughing the Kicker', code: 'RTK', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Roughing the Passer', code: 'RTP', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Running into the Kicker', code: 'RIK', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Safety Kick Out of Bounds', code: 'SKOB', hsYards: 5, hsDown: 'Rekick', ncaaYards: 5, ncaaDown: 'Rekick' },
    { name: 'Sideline Interference', code: 'SI', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Spearing', code: 'SP', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Targeting', code: 'TGT', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
    { name: 'Too Many Men on Field', code: 'TMM', hsYards: 5, hsDown: 'Repeat', ncaaYards: 5, ncaaDown: 'Repeat' },
    { name: 'Unsportsmanlike Conduct', code: 'UC', hsYards: 15, hsDown: 'Repeat', ncaaYards: 15, ncaaDown: 'Automatic 1st' },
  ];

  const filteredPenalties = penalties.filter(penalty =>
    penalty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    penalty.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePenaltyClick = (penalty) => {
    const yards = selectedLevel === 'HS' ? penalty.hsYards : penalty.ncaaYards;
    const down = selectedLevel === 'HS' ? penalty.hsDown : penalty.ncaaDown;
    
    if (onPenaltySelect) {
      onPenaltySelect({
        code: penalty.code,
        name: penalty.name,
        yards: yards,
        down: down,
        level: selectedLevel,
        playerNumber: '' // Will be filled in by user
      });
    }
  };

  return (
    <div className="p-4 bg-white border border-black rounded shadow">
      <h3 className="text-lg font-bold mb-4">Penalty Reference Table</h3>
      
      {/* Controls */}
      <div className="flex space-x-4 mb-4">
        <div>
          <label className="block font-bold text-sm">Search:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search penalties..."
            className="border px-2 py-1 rounded w-48"
          />
        </div>
        <div>
          <label className="block font-bold text-sm">Level:</label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="HS">High School</option>
            <option value="NCAA">NCAA</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead className="bg-gray-200 sticky top-0">
            <tr>
              <th className="border border-gray-300 px-2 py-1 text-left">Name</th>
              <th className="border border-gray-300 px-2 py-1 text-center">Code</th>
              <th className="border border-gray-300 px-2 py-1 text-center">HS Yards</th>
              <th className="border border-gray-300 px-2 py-1 text-center">HS Down</th>
              <th className="border border-gray-300 px-2 py-1 text-center">NCAA Yards</th>
              <th className="border border-gray-300 px-2 py-1 text-center">NCAA Down</th>
            </tr>
          </thead>
          <tbody>
            {filteredPenalties.map((penalty, index) => (
              <tr 
                key={index} 
                className="hover:bg-gray-100 cursor-pointer"
                onClick={() => handlePenaltyClick(penalty)}
              >
                <td className="border border-gray-300 px-2 py-1">{penalty.name}</td>
                <td className="border border-gray-300 px-2 py-1 text-center font-mono">{penalty.code}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{penalty.hsYards}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{penalty.hsDown}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{penalty.ncaaYards}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{penalty.ncaaDown}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-2 text-xs text-gray-600">
        Click any row to select that penalty. Use search to find specific penalties quickly.
      </div>
    </div>
  );
};

export default PenaltyTable;

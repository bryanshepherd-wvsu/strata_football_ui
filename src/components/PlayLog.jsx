import React, { useState } from 'react';
import { useGameState } from './GameStateContext';
import GameAPI from '../services/GameAPI';

const PlayLog = () => {
  const { gameState, setGameState, playLog, setPlayLog, generatePlayDescription, apiStatus, currentGameId } = useGameState();
  const [editingPlay, setEditingPlay] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [replacingPlayData, setReplacingPlayData] = useState(null);

  // Helper function to calculate play numbers
  const calculatePlayNumber = (playIndex) => {
    if (!playLog || playIndex >= playLog.length) return "[0,0,0]";
    
    let driveNum = 0;
    let playInDriveNum = 0;
    let overallPlayNum = playIndex + 1;
    
    // Count through plays to determine drive and play-in-drive numbers
    let currentDrive = 0;
    let playsInCurrentDrive = 0;
    
    for (let i = 0; i <= playIndex; i++) {
      const play = playLog[i];
      
      // Check if this play starts a new drive
      if (play?.playType === 'kickoff' && play?.finalSpot) {
        // Kickoff ending starts a new drive
        currentDrive++;
        playsInCurrentDrive = 0;
      } else if (play?.playType === 'rush' || play?.playType === 'pass' || 
                 play?.playType === 'punt' || play?.playType === 'field_goal') {
        // Regular plays count in the drive
        playsInCurrentDrive++;
      }
      
      // If this is our target play
      if (i === playIndex) {
        driveNum = currentDrive;
        playInDriveNum = playsInCurrentDrive;
      }
    }
    
    return `[${driveNum},${playInDriveNum},${overallPlayNum}]`;
  };

  const handleEdit = (idx, section, play) => {
    console.log(`Edit ${section} #${idx}:`, play);
    console.log('Current playLog length:', playLog.length);
    console.log('Current previousPlays length:', gameState.previousPlays?.length);
    
    // For play log entries, find the actual play data
    if (section === 'play') {
      // Fix the index calculation - we need to map from the "Last 15" slice back to playLog
      const previousPlays = gameState.previousPlays || [];
      const last15Plays = previousPlays.slice(-15);
      
      // The idx is relative to the last15Plays array, we need to find the corresponding playLog entry
      // The playLog should have the same number of entries as previousPlays (or close to it)
      const actualPlayLogIndex = playLog.length - last15Plays.length + idx;
      
      console.log('Fixed calculation:');
      console.log('- last15Plays length:', last15Plays.length);
      console.log('- idx in last15 array:', idx);
      console.log('- actualPlayLogIndex:', actualPlayLogIndex);
      
      const playLogEntry = playLog[actualPlayLogIndex];
      console.log('PlayLog at actualPlayLogIndex:', playLogEntry);
      
      if (playLogEntry && typeof playLogEntry === 'object') {
        console.log('Found play data for editing:', playLogEntry);
        setEditingPlay({ idx, section, actualPlayLogIndex });
        // Remove description, timestamp, AND playType from edit fields
        const { description, timestamp, playType, ...editableFields } = playLogEntry;
        console.log('Editable fields:', editableFields);
        setEditFields(editableFields);
        return;
      } else {
        console.log('No valid play object found, falling back to text editing');
        console.log('PlayLog entry type:', typeof playLogEntry);
        console.log('PlayLog entry value:', playLogEntry);
      }
    }
    
    // Fallback for drives - use string editing since we don't have structured data
    setEditingPlay({ idx, section });
    setEditFields({ text: typeof play === 'string' ? play : JSON.stringify(play) });
  };

  const handleReplace = (idx, section, play) => {
    console.log(`Replace ${section} #${idx}:`, play);
    
    // For play log entries, store the replacement context
    if (section === 'play') {
      const previousPlays = gameState.previousPlays || [];
      const last15Plays = previousPlays.slice(-15);
      const actualPlayLogIndex = playLog.length - last15Plays.length + idx;
      
      // Trigger replacement mode in InputContainer
      window.dispatchEvent(new CustomEvent('replacePlay', {
        detail: {
          originalPlayIndex: idx,
          originalSection: section,
          actualPlayLogIndex: actualPlayLogIndex,
          originalPlayData: playLog[actualPlayLogIndex]
        }
      }));
    }
  };

  const handleFieldChange = (field, value) => {
    setEditFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = () => {
    if (!editingPlay) return;
    
    const { idx, section, actualPlayLogIndex } = editingPlay;
    
    if (section === 'play') {
      // Update the play log entry with edited fields, regenerate description
      const updatedPlayLogEntry = { ...editFields };
      const newPlayLog = [...playLog];
      const indexToUpdate = actualPlayLogIndex !== undefined ? actualPlayLogIndex : playLog.length - 15 + idx;
      
      if (indexToUpdate >= 0 && indexToUpdate < playLog.length) {
        // Add back timestamp if it existed
        if (playLog[indexToUpdate] && playLog[indexToUpdate].timestamp) {
          updatedPlayLogEntry.timestamp = playLog[indexToUpdate].timestamp;
        }
        newPlayLog[indexToUpdate] = updatedPlayLogEntry;
        setPlayLog(newPlayLog);
        
        // Regenerate the description from the edited data
        const newDescription = generatePlayDescription(updatedPlayLogEntry);
        setGameState(prev => ({
          ...prev,
          previousPlays: prev.previousPlays.map((play, i) => 
            i === idx ? newDescription : play
          )
        }));
      } else {
        console.error('Invalid playLog index:', indexToUpdate);
      }
    } else if (section.startsWith('drive')) {
      // Handle drive play editing - just update the text
      const driveIdx = parseInt(section.split(' ')[1]);
      setGameState(prev => ({
        ...prev,
        drives: prev.drives.map((drive, dIdx) => 
          dIdx === driveIdx ? {
            ...drive,
            plays: drive.plays.map((play, pIdx) => 
              pIdx === idx ? editFields.text : play
            )
          } : drive
        )
      }));
    }
    
    setEditingPlay(null);
    setEditFields({});
  };

  const handleCancelEdit = () => {
    setEditingPlay(null);
    setEditFields({});
  };

  const handleDelete = async (idx, section) => {
    if (section !== 'play') {
      // Handle non-play deletions the same way
      if (section.startsWith('drive')) {
        const driveIdx = parseInt(section.split(' ')[1]);
        setGameState(prev => ({
          ...prev,
          drives: prev.drives.map((drive, dIdx) =>
            dIdx === driveIdx ? {
              ...drive,
              plays: drive.plays.filter((_, pIdx) => pIdx !== idx)
            } : drive
          )
        }));
      }
      return;
    }

    // For play deletions, calculate the overall play number
    const previousPlays = gameState.previousPlays || [];
    const last15Plays = previousPlays.slice(-15);
    const actualPlayLogIndex = playLog.length - last15Plays.length + idx;
    const overallPlayNumber = actualPlayLogIndex + 1; // Convert to 1-based play number
    
    const playNumberDisplay = calculatePlayNumber(actualPlayLogIndex);
    
    if (!window.confirm(`Are you sure you want to delete play ${playNumberDisplay}?`)) return;

    console.log('Deleting play:', { 
      idx, 
      actualPlayLogIndex, 
      overallPlayNumber, 
      playNumberDisplay, 
      totalPlays: playLog.length 
    });
    
    // Try API deletion first if connected
    if (apiStatus.connected && currentGameId) {
      try {
        console.log(`Calling API to delete play #${overallPlayNumber}`);
        const response = await GameAPI.deletePlay(currentGameId, overallPlayNumber);
        
        if (response.success) {
          console.log(`✅ Play #${overallPlayNumber} deleted from API successfully`);
          
          // Update local state with API response
          if (response.gameState) {
            setGameState(response.gameState);
          }
          if (response.playLog) {
            setPlayLog(response.playLog);
            
            // Regenerate previousPlays from updated play log
            const newPreviousPlays = response.playLog
              .map(play => generatePlayDescription(play))
              .slice(-15);
            
            setGameState(prev => ({
              ...prev,
              previousPlays: newPreviousPlays
            }));
          }
          if (response.stats) {
            setGameState(prev => ({
              ...prev,
              teamStats: response.stats.teamStats || prev.teamStats,
              topPlayers: response.stats.topPlayers || prev.topPlayers
            }));
          }
          return;
        }
      } catch (error) {
        console.error('❌ API deletion failed:', error);
        alert(`Failed to delete play #${overallPlayNumber} from database. The play may reappear on refresh.`);
      }
    }
    
    // Fallback to local deletion (will be temporary until refresh)
    console.log('Falling back to local deletion only');
    setGameState(prev => ({
      ...prev,
      previousPlays: prev.previousPlays.filter((_, i) => i !== idx)
    }));
  };

  const handleInsert = (idx, section) => {
    const newPlayText = prompt(`Enter new play to insert after ${section} #${idx}:`);
    if (!newPlayText) return;

    if (section === 'play') {
      setGameState(prev => ({
        ...prev,
        previousPlays: [
          ...prev.previousPlays.slice(0, idx + 1),
          newPlayText,
          ...prev.previousPlays.slice(idx + 1)
        ]
      }));
    } else if (section.startsWith('drive')) {
      const driveIdx = parseInt(section.split(' ')[1]);
      setGameState(prev => ({
        ...prev,
        drives: prev.drives.map((drive, dIdx) =>
          dIdx === driveIdx ? {
            ...drive,
            plays: [
              ...drive.plays.slice(0, idx + 1),
              newPlayText,
              ...drive.plays.slice(idx + 1)
            ]
          } : drive
        )
      }));
    }
  };

  const handlePlayComplete = (playData) => {
    console.log('Play completed:', playData);
    
    // If we were editing a play, this is an update
    if (editingPlayData) {
      console.log('Updating existing play');
      setEditingPlayData(null);
    }
    
    // If we were replacing a play, handle the replacement
    if (replacingPlayData) {
      console.log('Replacing existing play with new play data');
      // Add replacement metadata to the play data
      playData.isReplacement = true;
      playData.replacedPlayIndex = replacingPlayData.originalIndex;
      playData.replacedSection = replacingPlayData.originalSection;
      playData.replacedActualIndex = replacingPlayData.actualPlayLogIndex;
      
      setReplacingPlayData(null);
    }
  };

  const renderButtons = (idx, section, play) => {
    const isEditing = editingPlay?.idx === idx && editingPlay?.section === section;

    if (isEditing) {
      return (
        <div className="flex space-x-1 mr-1">
          <button className="bg-green-500 text-white text-xs px-1" onClick={handleSaveEdit}>SAVE</button>
          <button className="bg-gray-500 text-white text-xs px-1" onClick={handleCancelEdit}>CANCEL</button>
        </div>
      );
    }

    return (
      <div className="flex space-x-1 mr-1">
        <button className="bg-blue-500 text-white text-xs px-1 hover:bg-blue-600" onClick={() => handleEdit(idx, section, play)} title={section === 'play' ? 'Edit play data' : 'Edit text'}>EDIT</button>
        <button className="bg-purple-500 text-white text-xs px-1 hover:bg-purple-600" onClick={() => handleReplace(idx, section, play)} title="Replace with completely new play">REPLACE</button>
        <button className="bg-red-500 text-white text-xs px-1 hover:bg-red-600" onClick={() => handleDelete(idx, section)}>DEL</button>
        <button className="bg-green-500 text-white text-xs px-1 hover:bg-green-600" onClick={() => handleInsert(idx, section)}>INS</button>
      </div>
    );
  };

  const renderJsonEditor = () => {
    // Only show drive text editor for drive sections
    if (editingPlay?.section.startsWith('drive')) {
      return (
        <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-50 p-2 rounded border">
          <div className="text-xs font-bold text-blue-600 mb-2">Drive Play Text Editor</div>
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-700">Drive Play Text:</label>
            <textarea
              value={editFields.text || ''}
              onChange={(e) => handleFieldChange('text', e.target.value)}
              className="text-xs border border-gray-300 px-2 py-1 rounded"
              rows={2}
            />
          </div>
          <div className="flex space-x-2 pt-2 border-t border-gray-300">
            <button 
              className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
              onClick={handleSaveEdit}
            >
              SAVE CHANGES
            </button>
            <button 
              className="bg-gray-500 text-white text-xs px-2 py-1 rounded hover:bg-gray-600"
              onClick={handleCancelEdit}
            >
              CANCEL
            </button>
          </div>
        </div>
      );
    }

    // For play log entries, show all editable fields (excluding playType)
    const editableFields = Object.keys(editFields).filter(key => 
      key !== 'description' && key !== 'timestamp' && key !== 'playType'
    ).sort();
    
    return (
      <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-50 p-2 rounded border">
        <div className="text-xs font-bold text-blue-600 mb-2">Play Data Editor</div>
        <div className="text-xs text-gray-600 mb-2">
          Edit play data fields - description will be auto-generated
        </div>
        <div className="text-xs text-orange-600 mb-2">
          Note: playType cannot be edited. Use REPLACE to change play type.
        </div>
        {editableFields.length === 0 ? (
          <div className="text-xs text-red-600">No editable fields found in play data</div>
        ) : (
          editableFields.map(key => (
            <div key={key} className="flex flex-col space-y-1">
              <label className="text-xs font-semibold text-gray-700">{key}:</label>
              <textarea
                value={typeof editFields[key] === 'object' ? JSON.stringify(editFields[key], null, 2) : (editFields[key] || '')}
                onChange={(e) => {
                  let value = e.target.value;
                  // Try to parse as JSON for object fields, otherwise use as string
                  if (typeof editFields[key] === 'object' && editFields[key] !== null) {
                    try {
                      value = JSON.parse(value);
                    } catch {
                      // Keep as string if JSON parsing fails
                    }
                  }
                  handleFieldChange(key, value);
                }}
                className="text-xs border border-gray-300 px-2 py-1 rounded font-mono"
                rows={typeof editFields[key] === 'object' ? 3 : 1}
                style={{ minHeight: '24px' }}
              />
            </div>
          ))
        )}
        
        <div className="flex space-x-2 pt-2 border-t border-gray-300">
          <button 
            className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
            onClick={handleSaveEdit}
          >
            SAVE CHANGES
          </button>
          <button 
            className="bg-gray-500 text-white text-xs px-2 py-1 rounded hover:bg-gray-600"
            onClick={handleCancelEdit}
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  };

  const renderPlayText = (idx, section, play) => {
    const isEditing = editingPlay?.idx === idx && editingPlay?.section === section;
    
    if (isEditing) {
      return (
        <div className="flex-1">
          {renderJsonEditor()}
        </div>
      );
    }
    
    // Calculate play number for display
    let playNumber = "";
    if (section === 'play') {
      const previousPlays = gameState.previousPlays || [];
      const last15Plays = previousPlays.slice(-15);
      const actualPlayLogIndex = playLog.length - last15Plays.length + idx;
      playNumber = calculatePlayNumber(actualPlayLogIndex);
    }
    
    const playText = typeof play === 'string' ? play : play.description || JSON.stringify(play);
    
    return (
      <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
        {section === 'play' && (
          <span className="text-xs text-blue-600 font-mono mr-2">{playNumber}</span>
        )}
        {playText}
      </span>
    );
  };

  return (
    <div className="w-1/5 bg-white border-l border-black p-2 overflow-y-auto">
      <details open>
        <summary className="font-bold mb-1 cursor-pointer">Last 15 Plays</summary>
        <div className="text-sm space-y-1 max-h-48 overflow-y-auto pr-1">
          {gameState.previousPlays?.slice(-15).map((play, idx) => (
            <div key={idx} className="border-b border-gray-400 pb-1 flex justify-between items-start">
              {renderButtons(idx, 'play', play)}
              {renderPlayText(idx, 'play', play)}
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
                {`Drive ${dIdx + 1}: ${drive.team} - ${drive.startTime} ${drive.startQuarter} ${drive.startYardline}`}
              </summary>
              <div className="ml-4 text-sm space-y-1 pt-1">
                {drive.plays.map((play, pIdx) => (
                  <div key={pIdx} className="border-b border-gray-300 pb-1 flex justify-between items-start">
                    {renderButtons(pIdx, `drive ${dIdx}`, play)}
                    {renderPlayText(pIdx, `drive ${dIdx}`, play)}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </details>
    </div>
  );
};

export default PlayLog;
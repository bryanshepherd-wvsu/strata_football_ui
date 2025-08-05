// This file needs to be created based on the existing API structure from the old GameScoringUI
// I'll need to find the existing API files to implement the correct connection protocols

class GameAPI {
  static BASE_URL = window.location.origin;

  // Get user information
  static async whoami() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/whoami.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GameAPI: Error in whoami:', error);
      throw error;
    }
  }

  // Get current game ID
  static async getCurrentGameId() {
    try {
      const response = await fetch(`${this.BASE_URL}/api/get_current_game_id.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GameAPI: Error getting current game ID:', error);
      throw error;
    }
  }

  // Load game state with better error handling and debugging
  static async loadGameState(gameId) {
    try {
      console.log('GameAPI: Loading game state for game ID:', gameId);
      
      const response = await fetch(`${this.BASE_URL}/api/load_game_state.php?game_id=${gameId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      console.log('GameAPI: Load game state response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('GameAPI: Response not OK:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('GameAPI: Raw game state data:', data);
      
      if (data.error) {
        console.error('GameAPI: Server returned error:', data.error);
        throw new Error(data.error);
      }

      // Ensure we have at least basic structure
      if (!data.gameState) {
        console.warn('GameAPI: No gameState in response, creating default structure');
        data.gameState = {
          quarter: 1,
          clock: "15:00",
          possession: "H",
          down: 1,
          distance: 10,
          spot: "H35",
          score: { H: 0, V: 0 }
        };
      }

      // Parse play log if it's a string
      if (data.playLog && typeof data.playLog === 'string') {
        try {
          data.playLog = JSON.parse(data.playLog);
          console.log('GameAPI: Parsed playLog JSON, found', data.playLog.length, 'plays');
        } catch (parseError) {
          console.error('Error parsing playLog JSON:', parseError);
          data.playLog = [];
        }
      }

      return data;
    } catch (error) {
      console.error('GameAPI: Error loading game state:', error);
      throw error;
    }
  }

  // Submit play with enhanced debugging
  static async submitPlay(gameId, playData) {
    try {
      console.log('GameAPI: Submitting play for game ID:', gameId);
      console.log('GameAPI: Play data:', playData);
      
      const response = await fetch(`${this.BASE_URL}/api/submit_play.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          game_id: gameId,
          play_data: playData
        })
      });

      console.log('GameAPI: Submit play response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('GameAPI: Submit play response not OK:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('GameAPI: Submit play result:', result);
      
      return result;
    } catch (error) {
      console.error('GameAPI: Error submitting play:', error);
      throw error;
    }
  }

  // Get team metadata
  static async getTeamMetadata(gameId) {
    try {
      console.log('GameAPI: Loading team metadata for game ID:', gameId);
      
      const response = await fetch(`${this.BASE_URL}/api/get_team_metadata.php?game_id=${gameId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GameAPI: Team metadata response not OK:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('GameAPI: Team metadata result:', data);
      
      return data;
    } catch (error) {
      console.error('GameAPI: Error loading team metadata:', error);
      throw error;
    }
  }

  // Load stats
  static async loadStats(gameId) {
    try {
      console.log('GameAPI: Loading stats for game ID:', gameId);
      
      const response = await fetch(`${this.BASE_URL}/api/load_stats.php?game_id=${gameId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GameAPI: Stats response not OK:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('GameAPI: Stats result:', data);
      
      return data;
    } catch (error) {
      console.error('GameAPI: Error loading stats:', error);
      throw error;
    }
  }

  // Refresh lock for current game
  static async refreshLock(gameId, userId) {
    try {
      const response = await fetch(`${this.BASE_URL}/api/refresh_lock.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          game_id: gameId,
          user_id: userId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GameAPI: Error refreshing lock:', error);
      throw error;
    }
  }

  static async deletePlay(gameId, overallPlayNumber) {
    try {
      console.log(`🗑️ GameAPI.deletePlay called with gameId: ${gameId}, overallPlayNumber: ${overallPlayNumber}`);
      
      const response = await fetch(`${this.BASE_URL}/api/delete_play.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          overall_play_num: overallPlayNumber
        })
      });
      
      console.log(`🗑️ Delete API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🗑️ Delete API failed with status ${response.status}:`, errorText);
        throw new Error(`Delete play failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`🗑️ Delete API response data:`, result);
      
      return result;
    } catch (error) {
      console.error(`🗑️ GameAPI.deletePlay error:`, error);
      throw error;
    }
  }
}

export default GameAPI;
import React from 'react';
import ReactDOM from 'react-dom/client';
import GameScoringPage from './pages/GameScoringPage'; // This is your UI loader page
import './index.css'; // or your global CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GameScoringPage />
  </React.StrictMode>,
);

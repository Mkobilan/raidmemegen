import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import LandingPage from './components/pages/LandingPage';
import WarRoom from './components/pages/Home';
import SharedRaid from './components/pages/SharedRaid';
import Gallery from './components/pages/Gallery';
import ProfilePage from './components/pages/ProfilePage';
import Lobby from './components/collab/Lobby';
import LiveRoom from './components/collab/LiveRoom';
import RaidOverlay from './components/overlay/RaidOverlay';
import Settings from './components/pages/Settings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/war-room" element={<WarRoom />} />
          <Route path="/share" element={<SharedRaid />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/room/:roomId" element={<LiveRoom />} />
          <Route path="/overlay" element={<RaidOverlay />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
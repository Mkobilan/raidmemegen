import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Home from './components/pages/Home';
import SharedRaid from './components/pages/SharedRaid';
import Gallery from './components/pages/Gallery';
import ProfilePage from './components/pages/ProfilePage';
import Lobby from './components/collab/Lobby';
import LiveRoom from './components/collab/LiveRoom';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/share" element={<SharedRaid />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/room/:roomId" element={<LiveRoom />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
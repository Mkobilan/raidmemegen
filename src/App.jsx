import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Home from './components/pages/Home';
import SharedRaid from './components/pages/SharedRaid';
import Gallery from './components/pages/Gallery';
import ProfilePage from './components/pages/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/share" element={<SharedRaid />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
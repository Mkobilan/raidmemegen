
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/pages/Home';
import SharedRaid from './components/pages/SharedRaid';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/share" element={<SharedRaid />} />
      </Routes>
    </Router>
  );
}

export default App;
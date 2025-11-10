import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import jsPDF from 'jspdf';
import seedrandom from 'seedrandom';
import raidsData from './data/raids.json';
import memesData from './data/memes.json';
import { auth } from './firebase'; // Firebase auth import
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // Auth functions

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [game, setGame] = useState('');
  const [raid, setRaid] = useState('');
  const [squadSize, setSquadSize] = useState(6);
  const [vibe, setVibe] = useState('Meme Chaos');
  const [plan, setPlan] = useState(null); // Stores generated plan
  const [loading, setLoading] = useState(false);

  // Auth states
  const [user, setUser] = useState(null); // Current user
  const [authLoading, setAuthLoading] = useState(true); // Spinner while checking auth
  const [showAuthModal, setShowAuthModal] = useState(false); // Signup/Login modal
  const [isSignup, setIsSignup] = useState(false); // Toggle signup vs login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Free limits: 3 gens/day
  const today = new Date().toDateString();
  const testInterval = Math.floor(Date.now() / 30000); // 30s slots for testing
  const gensToday = JSON.parse(localStorage.getItem(`gens_test_${testInterval}`) || '0');
  const gensCount = parseInt(gensToday) || 0;

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Parse URL params for share
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramGame = params.get('game');
    const paramRaid = params.get('raid');
    const paramSquad = params.get('squadSize');
    const paramVibe = params.get('vibe');
    if (paramGame) setGame(paramGame);
    if (paramRaid) setRaid(paramRaid);
    if (paramSquad) setSquadSize(parseInt(paramSquad));
    if (paramVibe) setVibe(paramVibe);
  }, []);

  // Filter raids by game
  const availableRaids = game ? raidsData.filter(r => r.game === game).map(r => r.raid) : [];

  // Signup/Login handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError(error.message); // e.g., "auth/user-not-found"
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Generate raid plan
  const generateRaid = () => {
    if (!raid) return;
    if (gensCount >= 3) {
      alert('Free limit: 3 gens/day. Pro ($5/mo) for unlimited!');
      return;
    }
    setLoading(true);
    const seed = seedrandom(`${raid}-${Date.now()}`); // Seeded for reproducibility
    const selectedRaidData = raidsData.find(r => r.raid === raid);
    const phases = selectedRaidData.phases.map(phase => {
      const role = phase.roles[Math.floor(seed() * phase.roles.length)];
      const action = phase.actions[Math.floor(seed() * phase.actions.length)];
      const target = phase.targets[Math.floor(seed() * phase.targets.length)];
      const hazard = phase.hazards[Math.floor(seed() * phase.hazards.length)];
      const quip = phase.quips[Math.floor(seed() * phase.quips.length)];

      // Always random for max variety (thematic match if possible)
      let meme;
      const matchedMeme = memesData.find(m => m.quip.includes(quip.substring(0, 10))); // Loose match on first 10 chars
      if (matchedMeme) {
        meme = matchedMeme;
      } else {
        // Full random from all, seeded per phase
        const phaseSeed = seedrandom(`${seed()}-${Date.now()}-${phase.name}`); // Unique per phase/gen
        const randomIndex = Math.floor(phaseSeed() * memesData.length);
        meme = memesData[randomIndex];
      }

      const generatedText = phase.baseTemplate
        .replace('[role]', role)
        .replace('[action]', action)
        .replace('[target]', target)
        .replace('[hazard]', hazard)
        .replace('[quip]', quip);

      return {
        name: phase.name,
        text: generatedText,
        time: Math.floor(seed() * 10 + 5), // Fake 5-15 min per phase
        meme: meme.gif
      };
    });

    // Squad twist
    const title = squadSize < 4 ? `Short Stack ${vibe} Mode – No Rezzes!` : `${vibe} Fireteam Plan`;
    setPlan({ title, phases, squadSize });

    // Update limit
    localStorage.setItem(`gens_${today}`, (gensCount + 1).toString());
    setLoading(false);
  };

  // Export to PDF
  const exportPDF = () => {
    if (!plan) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 6;
    let yPos = 20;

    // Background: Dark gamer fill
    doc.setFillColor(26, 26, 46); // #1a1a2e
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Title: Neon bold header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 255, 136); // Neon green
    doc.text(plan.title, margin, yPos);
    yPos += 15;

    // Phases: Wrapped text with borders & icons
    plan.phases.forEach((phase, idx) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
        // Re-apply bg to new page
        doc.setFillColor(26, 26, 46);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
      }

      // Phase header: Bold, underlined with icon
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setDrawColor(0, 255, 136); // Green line
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos); // Top border
      yPos += lineHeight;
      doc.text(`* ${phase.name}`, margin, yPos); // Simple icon fallback
      yPos += lineHeight;
      doc.line(margin, yPos, pageWidth - margin, yPos); // Bottom border for header

      // Phase text: Wrapped, smaller font
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const phaseText = `${phase.text} (Est. Time: ${phase.time} mins)`;
      const splitText = doc.splitTextToSize(phaseText, pageWidth - (margin * 2));
      splitText.forEach(line => {
        if (yPos > 280) { // Page break mid-phase
          doc.addPage();
          yPos = 20;
          doc.setFillColor(26, 26, 46);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });

      yPos += 5; // Space between phases
    });

    // Footer: Watermark tease
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Generated by Meme Raid Gen - Pro for Squad Saves!', margin, doc.internal.pageSize.getHeight() - 10);

    doc.save(`${raid}-plan.pdf`);
  };

  // Chart data for timeline
  const chartData = plan ? {
    labels: plan.phases.map(p => p.name),
    datasets: [{
      label: 'Est. Time (mins)',
      data: plan.phases.map(p => p.time),
      borderColor: '#00ff88', // Neon green
      backgroundColor: 'rgba(0, 255, 136, 0.2)',
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true } }
  };

  // Share link
  const shareLink = () => {
    const params = new URLSearchParams({ game, raid, squadSize: squadSize.toString(), vibe });
    const url = `${window.location.origin}?${params}`;
    navigator.clipboard.writeText(url);
    alert('Link copied! Share the chaos.');
  };

  // Open auth modal
  const openAuth = () => {
    setShowAuthModal(true);
    setIsSignup(!user); // Signup if new, login if existing
    setAuthError('');
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><p className="text-raid-neon">Loading Pro Chaos...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-raid-neon">Meme Raid Generator</h1>
      
      {/* Auth Header */}
      <div className="max-w-md mx-auto mb-4 text-center">
        {user ? (
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm">Pro: {user.email}</span>
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 py-1 px-3 rounded text-sm transition">
              Logout
            </button>
          </div>
        ) : (
          <button onClick={openAuth} className="bg-raid-neon text-black py-2 px-4 rounded font-bold hover:bg-green-400 transition">
            Go Pro: Signup/Login
          </button>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 border border-raid-neon">
            <h3 className="text-xl mb-4 text-raid-neon">{isSignup ? 'Signup for Pro Chaos' : 'Login to Pro'}</h3>
            <form onSubmit={handleAuth}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 mb-2 bg-gray-700 rounded text-white border border-gray-600 focus:border-raid-neon"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 mb-2 bg-gray-700 rounded text-white border border-gray-600 focus:border-raid-neon"
                required
              />
              {authError && <p className="text-red-500 text-sm mb-2">{authError}</p>}
              <button type="submit" className="w-full bg-raid-neon text-black py-2 rounded font-bold hover:bg-green-400 mb-2 transition">
                {isSignup ? 'Signup' : 'Login'}
              </button>
            </form>
            <div className="text-center">
              <button 
                onClick={() => { setIsSignup(!isSignup); setAuthError(''); }} 
                className="text-sm text-gray-400 hover:text-raid-neon"
              >
                Switch to {isSignup ? 'Login' : 'Signup'}
              </button>
              <button 
                onClick={() => { setShowAuthModal(false); setAuthError(''); }} 
                className="ml-2 text-sm text-gray-400 hover:text-red-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg mb-8">
        <select
          value={game}
          onChange={(e) => { setGame(e.target.value); setRaid(''); }}
          className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
        >
          <option value="">Select Game</option>
          <option value="Destiny 2">Destiny 2</option>
          <option value="World of Warcraft">World of Warcraft</option>
          <option value="Arc Raiders">Arc Raiders</option>
          <option value="Helldivers 2">Helldivers 2</option>
          <option value="Final Fantasy XIV">Final Fantasy XIV</option>
          <option value="Path of Exile 2">Path of Exile 2</option>
          <option value="Monster Hunter Wilds">Monster Hunter Wilds</option>
        </select>
        
        <select
          value={raid}
          onChange={(e) => setRaid(e.target.value)}
          disabled={!game}
          className="w-full p-2 mb-4 bg-gray-700 rounded text-white disabled:opacity-50"
        >
          <option value="">Select Raid</option>
          {availableRaids.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        
        <label className="block mb-2">Squad Size: {squadSize}</label>
        <input
          type="range"
          min="2" max="6"
          value={squadSize}
          onChange={(e) => setSquadSize(Number(e.target.value))}
          className="w-full mb-4"
        />
        
        <select
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
        >
          <option value="Meme Chaos">Meme Chaos</option>
          <option value="Sweaty Tryhard">Sweaty Tryhard</option>
        </select>

        <p className="text-xs text-gray-400">Gens today: {gensCount}/3</p>
        
        <button
          onClick={generateRaid}
          disabled={!raid || loading || gensCount >= 3}
          className="w-full bg-raid-neon text-black py-2 rounded font-bold disabled:opacity-50"
        >
          {loading ? 'Generating Chaos...' : 'Generate Raid Plan'}
        </button>
      </div>

      {/* Output */}
      {plan && (
        <div className="max-w-2xl mx-auto bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-wipe-red">{plan.title}</h2>
          <div className="mb-6">
            <h3 className="text-xl mb-2">Timeline</h3>
            <Line data={chartData} options={chartOptions} />
          </div>
          <div>
            {plan.phases.map((phase, idx) => (
              <div key={idx} className="phase-card mb-4 p-4 bg-gray-700 rounded">
                <h4 className="font-bold text-raid-neon">
                  <span className="phase-icon">⚔️</span>
                  {phase.name}
                </h4>
                <p className="text-sm">{phase.text}</p>
                <p className="text-xs text-gray-400">Est. Time: {phase.time} mins</p>
                {phase.meme && <img src={phase.meme} alt="Meme" className="w-24 h-24 mt-2 rounded" />}
              </div>
            ))}
          </div>
          <button
            onClick={exportPDF}
            className="mt-4 bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded transition"
          >
            Export PDF
          </button>
          <button
            onClick={shareLink}
            className="mt-2 bg-green-600 hover:bg-green-700 py-2 px-4 rounded transition"
          >
            Copy Share Link
          </button>
          {/* Pro Tease: Gated by auth */}
          <div className="mt-4 p-4 bg-gray-700 rounded text-center">
            {user ? (
              <button
                onClick={() => alert('Pro unlocked! Saves & chats coming next. Stripe paywall soon.')}
                className="bg-raid-neon text-black py-2 px-4 rounded font-bold hover:bg-green-400 transition"
              >
                Pro Active: Save This Raid?
              </button>
            ) : (
              <button
                onClick={openAuth}
                className="bg-raid-neon text-black py-2 px-4 rounded font-bold hover:bg-green-400 transition"
              >
                Unlock Squad Chaos?
              </button>
            )}
            <p className="text-xs text-gray-400 mt-2">Pro: Save raids, form groups, chat memes.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
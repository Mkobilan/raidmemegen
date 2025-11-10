import { useState, useEffect, useRef } from 'react';
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
import { auth, db, realtimeDb } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, push, onValue, set } from 'firebase/database'; // Realtime DB for chats

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
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auth states
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // New: For profile
  const [authError, setAuthError] = useState('');

  // Saves states
  const [savedRaids, setSavedRaids] = useState([]);
  const [saving, setSaving] = useState(false);

  // New: Chat states
  const [currentRoom, setCurrentRoom] = useState(null); // Room ID
  const [messages, setMessages] = useState([]); // [{text, userId, displayName, timestamp}]
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef(null); // Auto-scroll

  // Free limits
  const today = new Date().toDateString();
  const testInterval = Math.floor(Date.now() / 30000);
  const gensToday = JSON.parse(localStorage.getItem(`gens_test_${testInterval}`) || '0');
  const gensCount = parseInt(gensToday) || 0;

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Saved raids listener
  useEffect(() => {
    if (!user) {
      setSavedRaids([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, `users/${user.uid}/raids`),
      (snapshot) => {
        const raids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedRaids(raids.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
      }
    );
    return unsub;
  }, [user]);

  // New: Chat listener
  useEffect(() => {
    if (!currentRoom || !user) return;
    const messagesRef = ref(realtimeDb, `chats/${currentRoom}/messages`);
    const unsub = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const loadedMessages = data ? Object.entries(data).map(([id, msg]) => ({ id, ...msg })) : [];
      setMessages(loadedMessages.sort((a, b) => a.timestamp - b.timestamp));
    });
    return unsub;
  }, [currentRoom, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse URL for share + chat room
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramGame = params.get('game');
    const paramRaid = params.get('raid');
    const paramSquad = params.get('squadSize');
    const paramVibe = params.get('vibe');
    const paramRoom = params.get('chatRoom');
    if (paramGame) setGame(paramGame);
    if (paramRaid) setRaid(paramRaid);
    if (paramSquad) setSquadSize(parseInt(paramSquad));
    if (paramVibe) setVibe(paramVibe);
    if (paramRoom && user) {
      setCurrentRoom(paramRoom);
      setShowChat(true);
    }
  }, [user]);

  // Filter raids
  const availableRaids = game ? raidsData.filter(r => r.game === game).map(r => r.raid) : [];

  // Auth handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      let result;
      if (isSignup) {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      // New: Set display name if provided
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
        await setDoc(doc(db, `users/${result.user.uid}/profile`), { displayName });
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentRoom(null);
    setShowChat(false);
  };

  // Save raid
  const saveRaid = async () => {
    if (!user || !plan) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, `users/${user.uid}/raids`), {
        ...plan,
        game,
        raid,
        vibe,
        createdAt: serverTimestamp()
      });
      alert('Raid saved! Create a squad chat below.');
      return docRef.id; // For chat tie-in
    } catch (error) {
      alert('Save failed: ' + error.message);
    }
    setSaving(false);
  };

  // Load saved raid
  const loadSavedRaid = (saved) => {
    setGame(saved.game);
    setRaid(saved.raid);
    setSquadSize(saved.squadSize);
    setVibe(saved.vibe);
    setPlan(saved);
  };

  // Delete saved raid
  const deleteSavedRaid = async (id) => {
    if (!confirm('Delete this raid?')) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/raids`, id));
    } catch (error) {
      alert('Delete failed: ' + error.message);
    }
  };

  // New: Create/join chat room
  const createChatRoom = () => {
    if (!user || !plan) return alert('Save a raid first!');
    const roomId = push(ref(realtimeDb, 'chats')).key; // Unique ID
    setCurrentRoom(roomId);
    setShowChat(true);
    // Tie to saved raid (optional metadata)
    set(ref(realtimeDb, `chats/${roomId}/metadata`), {
      raid: raid,
      createdBy: user.uid,
      createdAt: Date.now()
    });
    // Copy invite link
    const inviteUrl = `${window.location.origin}?chatRoom=${roomId}&raid=${raid}`;
    navigator.clipboard.writeText(inviteUrl);
    alert(`Squad chat created! Invite link copied: ${inviteUrl}`);
  };

  // New: Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentRoom || !user) return;
    const messagesRef = ref(realtimeDb, `chats/${currentRoom}/messages`);
    const newMsgRef = push(messagesRef);
    await set(newMsgRef, {
      text: newMessage,
      userId: user.uid,
      displayName: user.displayName || email,
      timestamp: Date.now()
    });
    setNewMessage('');
  };

  // New: Leave room
  const leaveRoom = () => {
    setCurrentRoom(null);
    setShowChat(false);
    setMessages([]);
  };

  // Generate raid (unchanged)
  const generateRaid = () => {
    if (!raid) return;
    if (gensCount >= 3) {
      alert('Free limit: 3 gens/day. Pro ($5/mo) for unlimited!');
      return;
    }
    setLoading(true);
    const seed = seedrandom(`${raid}-${Date.now()}`);
    const selectedRaidData = raidsData.find(r => r.raid === raid);
    const phases = selectedRaidData.phases.map(phase => {
      const role = phase.roles[Math.floor(seed() * phase.roles.length)];
      const action = phase.actions[Math.floor(seed() * phase.actions.length)];
      const target = phase.targets[Math.floor(seed() * phase.targets.length)];
      const hazard = phase.hazards[Math.floor(seed() * phase.hazards.length)];
      const quip = phase.quips[Math.floor(seed() * phase.quips.length)];

      let meme;
      const matchedMeme = memesData.find(m => m.quip.includes(quip.substring(0, 10)));
      if (matchedMeme) {
        meme = matchedMeme;
      } else {
        const phaseSeed = seedrandom(`${seed()}-${Date.now()}-${phase.name}`);
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
        time: Math.floor(seed() * 10 + 5),
        meme: meme.gif
      };
    });

    const title = squadSize < 4 ? `Short Stack ${vibe} Mode – No Rezzes!` : `${vibe} Fireteam Plan`;
    setPlan({ title, phases, squadSize });

    localStorage.setItem(`gens_${today}`, (gensCount + 1).toString());
    setLoading(false);
  };

  // Export PDF (unchanged)
  const exportPDF = () => {
    if (!plan) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 6;
    let yPos = 20;

    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 255, 136);
    doc.text(plan.title, margin, yPos);
    yPos += 15;

    plan.phases.forEach((phase) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
        doc.setFillColor(26, 26, 46);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setDrawColor(0, 255, 136);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += lineHeight;
      doc.text(`* ${phase.name}`, margin, yPos);
      yPos += lineHeight;
      doc.line(margin, yPos, pageWidth - margin, yPos);

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const phaseText = `${phase.text} (Est. Time: ${phase.time} mins)`;
      const splitText = doc.splitTextToSize(phaseText, pageWidth - (margin * 2));
      splitText.forEach(line => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
          doc.setFillColor(26, 26, 46);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });

      yPos += 5;
    });

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Generated by Meme Raid Gen - Pro for Squad Saves!', margin, doc.internal.pageSize.getHeight() - 10);

    doc.save(`${raid}-plan.pdf`);
  };

  // Chart data
  const chartData = plan ? {
    labels: plan.phases.map(p => p.name),
    datasets: [{
      label: 'Est. Time (mins)',
      data: plan.phases.map(p => p.time),
      borderColor: '#00ff88',
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

  // Open auth
  const openAuth = () => {
    setShowAuthModal(true);
    setIsSignup(!user);
    setAuthError('');
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><p className="text-raid-neon">Loading Pro Chaos...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex">
      {/* Main Content - Left */}
      <div className={`flex-1 max-w-2xl mx-auto ${showChat ? 'mr-4' : ''}`}>
        <h1 className="text-4xl font-bold text-center mb-8 text-raid-neon">Meme Raid Generator</h1>
        
        {/* Auth Header */}
        <div className="max-w-md mx-auto mb-4 text-center">
          {user ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm">Pro: {user.displayName || user.email}</span>
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
                {isSignup && (
                  <input
                    type="text"
                    placeholder="Display Name (optional)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-2 mb-2 bg-gray-700 rounded text-white border border-gray-600 focus:border-raid-neon"
                  />
                )}
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
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
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
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={exportPDF}
                className="bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded transition"
              >
                Export PDF
              </button>
              <button
                onClick={shareLink}
                className="bg-green-600 hover:bg-green-700 py-2 px-4 rounded transition"
              >
                Copy Share Link
              </button>
              {user && (
                <>
                  <button
                    onClick={saveRaid}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded transition disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save This Raid'}
                  </button>
                  {savedRaids.some(s => s.id === plan.id) && ( // Assume plan has id after save
                    <button
                      onClick={createChatRoom}
                      className="bg-orange-600 hover:bg-orange-700 py-2 px-4 rounded transition"
                    >
                      Create Squad Chat
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* My Saved Raids */}
        {user && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4 text-raid-neon">My Saved Raids ({savedRaids.length})</h3>
            {savedRaids.length === 0 ? (
              <p className="text-gray-400">No saved raids yet. Generate one and hit Save!</p>
            ) : (
              <div className="space-y-4">
                {savedRaids.map((saved) => (
                  <div key={saved.id} className="phase-card p-4 bg-gray-700 rounded flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-wipe-red">{saved.title}</h4>
                      <p className="text-sm text-gray-300">{saved.game} - {saved.raid} - Squad: {saved.squadSize}</p>
                      <p className="text-xs text-gray-500">Saved: {saved.createdAt?.toDate().toLocaleDateString()}</p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => loadSavedRaid(saved)}
                        className="bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded text-sm"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteSavedRaid(saved.id)}
                        className="bg-red-600 hover:bg-red-700 py-1 px-3 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Sidebar - Right (Desktop) / Modal (Mobile) */}
      {showChat && (
        <div className={`ml-4 w-80 bg-gray-800 rounded-lg p-4 h-[calc(100vh-2rem)] flex flex-col ${window.innerWidth < 768 ? 'fixed inset-0 z-40 bg-black bg-opacity-50' : ''}`}>
          {window.innerWidth < 768 && (
            <button onClick={leaveRoom} className="self-end text-gray-400 mb-2">Close</button>
          )}
          <h3 className="text-xl font-bold mb-4 text-raid-neon">Squad Chat: {raid || 'General'}</h3>
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`p-2 rounded ${msg.userId === user.uid ? 'bg-raid-neon text-black ml-auto' : 'bg-gray-700'}`}>
                <span className="text-xs">{msg.displayName}:</span>
                <p>{msg.text}</p>
                <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type meme..."
              className="flex-1 p-2 bg-gray-700 rounded-l text-white"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="bg-raid-neon text-black px-4 rounded-r font-bold">
              Send
            </button>
          </div>
          <button onClick={leaveRoom} className="mt-2 text-sm text-gray-400">Leave Room</button>
        </div>
      )}

      {/* Mobile Overlay Backdrop */}
      {showChat && window.innerWidth < 768 && (
        <div className="fixed inset-0 z-30" onClick={leaveRoom} />
      )}
    </div>
  );
}

export default App;
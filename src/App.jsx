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
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, setDoc, getDoc, updateDoc, arrayUnion, deleteField, runTransaction } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';  // Assume your firebase.js exports 'functions'

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

const AuthModal = ({
  isSignup,
  email,
  password,
  displayName,
  authError,
  setEmail,
  setPassword,
  setDisplayName,
  onAuthSubmit,
  onToggleSignup,
  onClose
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
      <h2 className="text-xl font-bold mb-4">{isSignup ? 'Sign Up' : 'Login'}</h2>
      <form onSubmit={onAuthSubmit}>
        {isSignup && (
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full p-2 mb-2 bg-gray-700 text-green-400 border border-green-400 rounded focus:outline-none focus:border-green-500"
            autoComplete="name"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-2 bg-gray-700 text-green-400 border border-green-400 rounded focus:outline-none focus:border-green-500"
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 bg-gray-700 text-green-400 border border-green-400 rounded focus:outline-none focus:border-green-500"
          autoComplete="current-password"
          required
        />
        {authError && <p className="text-red-400 mb-2">{authError}</p>}
        <button
          type="submit"
          className="w-full bg-green-500 text-black py-2 rounded mb-2 focus:outline-none"
        >
          {isSignup ? 'Sign Up' : 'Login'}
        </button>
        <button
          type="button"
          onClick={onToggleSignup}
          className="w-full text-green-400 underline focus:outline-none"
        >
          {isSignup ? 'Switch to Login' : 'Switch to Sign Up'}
        </button>
      </form>
      <button
        onClick={onClose}
        className="w-full mt-2 text-gray-400 focus:outline-none"
      >
        Cancel
      </button>
    </div>
  </div>
);

const UpgradeModal = ({ onUpgrade, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 text-center">
      <h2 className="text-xl font-bold mb-4 text-green-400">Out of Free Gens? Level Up the Chaos! 🚀</h2>
      <p className="text-white mb-4">Your squad's meme raids are hitting a wall? Don't let the fun die – Go Pro for <strong>unlimited generations</strong>, endless quips, and raid plans that keep the wipes coming (in a good way)!</p>
      <p className="text-green-400 mb-6 font-bold">Just $5/mo – Cheaper than a single revive token, but with infinite glory!</p>
      <div className="space-y-2">
        <button
          onClick={onUpgrade}
          className="w-full bg-yellow-500 text-black py-2 rounded font-bold focus:outline-none hover:bg-yellow-400"
        >
          Upgrade Now & Unleash the Memes!
        </button>
        <button
          onClick={onClose}
          className="w-full text-gray-400 underline focus:outline-none"
        >
          Nah, I'll Hoard My Gens
        </button>
      </div>
    </div>
  </div>
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
  const [pro, setPro] = useState(false);
  const [gensCount, setGensCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Saves states
  const [savedRaids, setSavedRaids] = useState([]);
  const [saving, setSaving] = useState(false);

  // User limits state
  const getUTCToday = () => new Date().toISOString().split('T')[0];

  // Auth listener (old style with pro/gensCount)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      setAuthLoading(false);
      if (authUser) {
        console.log('🔑 Auth user loaded:', authUser.email);
        // Fetch or create user doc
        const userDocRef = doc(db, 'users', authUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          const today = getUTCToday();
          if (userDoc.exists()) {
            const data = userDoc.data();
            const lastReset = data.lastResetDate || '';
            let todayGens = data.gensToday || 0;
            if (lastReset !== today) {
              // Reset for new day (UTC midnight)
              todayGens = 0;
              await updateDoc(userDocRef, { gensToday: 0, lastResetDate: today });
            }
            // Migrate old 'pro' to 'isPro' if needed
            const rawPro = data.isPro ?? data.pro ?? false;
            if (data.pro !== undefined && data.isPro === undefined) {
              await updateDoc(userDocRef, { isPro: rawPro, pro: deleteField() });  // Standardize
            }
            // Set old states
            setPro(rawPro);
            setGensCount(todayGens);
            console.log('✅ Loaded:', { pro: rawPro, gensCount: todayGens });
          } else {
            // New user: create doc
            await setDoc(userDocRef, {
              isPro: false,
              gensToday: 0,
              lastResetDate: today,
              displayName: authUser.displayName || authUser.email.split('@')[0],
              createdAt: serverTimestamp()
            });
            setPro(false);
            setGensCount(0);
          }
        } catch (error) {
          console.error('Error fetching user doc:', error);
          setPro(false);
          setGensCount(0); // Fallback
        }
        // ... your existing savedRaids listener (keep all lines after this)
      } else {
        setPro(false);
        setGensCount(0);
        setSavedRaids([]);
      }
    });
    return unsubscribe;
  }, []); // Stable, no date dep (handled inside)

  // Listen for upgrade success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true' && user) {
      const handleUpgrade = async () => {
        console.log('🎉 Upgrade detected - refreshing user doc');
        // Re-fetch user doc
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPro(data.isPro ?? data.pro ?? false);
          setGensCount(data.gensToday || 0);
        }
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('✅ Refreshed:', { pro: pro, gensCount });
      };
      handleUpgrade();
    }
  }, [user]);

  // Saved raids listener
  useEffect(() => {
    if (!user) {
      setSavedRaids([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, `users/${user.uid}/raids`),
      (snapshot) => {
        try {
          const raids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSavedRaids(raids.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
        } catch (error) {
          console.error('Error fetching saved raids:', error);
          setSavedRaids([]); // Fallback on permissions error
        }
      },
      (error) => {
        console.error('Snapshot error:', error);
        setSavedRaids([]);
      }
    );
    return unsub;
  }, [user]);

  // Parse URL
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
        if (displayName && result.user) {
          await updateProfile(result.user, { displayName });
        }
        // Doc creation handled by listener
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
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
    // Clear plan on logout
    setPlan(null);
    // Unauth gens persist in local
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
        squadSize,
        createdAt: serverTimestamp()
      });
      setPlan(prev => ({ ...prev, id: docRef.id }));
      alert('Raid saved!');
    } catch (error) {
      alert('Save failed: ' + error.message);
    }
    setSaving(false);
  };

  // Load saved raid
  const loadSavedRaid = (saved) => {
    setGame(saved.game);
    setRaid(saved.raid);
    setSquadSize(saved.squadSize || 6);
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

  // Generate raid
  const generateRaid = async () => {
    if (!raid || loading) return; // Guard against double-click
    if (!user) {
      // Prompt auth for unauth users
      setShowAuthModal(true);
      return;
    }
    if (!pro && gensCount >= 3) {
      setShowUpgradeModal(true);
      return;
    }
    setLoading(true);
    try {
      const seed = seedrandom(`${raid}-${Date.now()}`);
      const selectedRaidData = raidsData.find(r => r.raid === raid);
      const phases = selectedRaidData.phases.map(phase => {
        const role = phase.roles[Math.floor(seed() * phase.roles.length)];
        const action = phase.actions[Math.floor(seed() * phase.actions.length)];
        const target = phase.targets[Math.floor(seed() * phase.targets.length)];
        const hazard = phase.hazards[Math.floor(seed() * phase.hazards.length)];
        const quip = phase.quips[Math.floor(seed() * phase.quips.length)];

        const generatedText = phase.baseTemplate
          .replace('[role]', role)
          .replace('[action]', action)
          .replace('[target]', target)
          .replace('[hazard]', hazard)
          .replace('[quip]', quip);

        return {
          name: phase.name,
          text: generatedText,
          time: Math.floor(seed() * 10 + 5)
        };
      });

      const title = squadSize < 4 ? `Short Stack ${vibe} Mode – No Rezzes!` : `${vibe} Fireteam Plan`;
      setPlan({ title, phases, squadSize });

      // Update gens count transactionally 
      if (!pro) {
        await runTransaction(db, async (transaction) => {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) throw new Error('User doc missing');
          const data = userDoc.data();
          const today = getUTCToday();
          let todayGens = data.gensToday || 0;
          const lastReset = data.lastResetDate || '';
          if (lastReset !== today) {
            // Reset for new day
            todayGens = 1; // First gen of day
            transaction.update(userDocRef, { gensToday: todayGens, lastResetDate: today });
          } else if (todayGens < 3) {
            todayGens += 1;
            transaction.update(userDocRef, { gensToday: todayGens });
          } else {
            throw new Error('Daily limit reached'); // Block in transaction
          }
          setGensCount(todayGens); // Safe post-transaction
        });
      }
    } catch (error) {
      if (error.message.includes('limit reached')) {
        setShowUpgradeModal(true);
      } else if (error.code === 'permission-denied') {
        console.error('Permissions error—check rules for /users/{uid}');
        alert('Generated, but count failed to update (permissions).');
      } else {
        console.error('Gen error:', error);
        alert('Generation failed: ' + error.message);
      }
    }
    setLoading(false);
  };

  // Export PDF
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
    doc.text('Generated by Meme Raid Gen - Go Pro for unlimited generations and fun for your squad.', margin, doc.internal.pageSize.getHeight() - 10);

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

  const upgradeToPro = async () => {
    console.log('🔥 CLICK DETECTED - upgradeToPro started');
    if (!user) {
      console.log('❌ No user - bail');
      return;
    }
    console.log('✅ User OK:', user.email);
    setLoading(true); // Your existing loading state

    try {
      // Get ID token for auth (same as SDK uses)
      const idToken = await auth.currentUser.getIdToken();
      console.log('📞 Got ID token');

      // Build the v2 callable URL (region + project + function name)
      const functionUrl = `https://us-central1-raidmemegen.cloudfunctions.net/createStripeCheckoutSession`;
      const origin = window.location.origin; // Or hardcode 'http://localhost:5173'
      console.log('📡 Calling URL:', functionUrl, 'with origin:', origin);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { origin }, // Matches what you'd pass to httpsCallable
        }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('💥 Fetch error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Success:', result);

      // Redirect to Stripe (FIX: Use result.result.sessionUrl)
      if (result.result?.sessionUrl) {
        console.log('🚀 Redirecting to:', result.result.sessionUrl);
        window.location.href = result.result.sessionUrl;
      } else {
        console.warn('⚠️ No sessionUrl in response - full result:', result);
      }
    } catch (error) {
      console.error('💥 Full fetch error:', error);
      // Handle error (e.g., show toast)
    } finally {
      setLoading(false);
    }
  };

 // Updated cancelPro (replace the httpsCallable version)
async function cancelPro() {
  if (!user || !pro) {
    console.log('❌ No user or not Pro – bail');
    return;
  }

  if (!confirm('Cancel Pro sub? You\'ll keep access until the end of your billing period. This can\'t be undone.')) {
    return;
  }

  setLoading(true);
  try {
    console.log('🔥 CANCEL CLICK - Starting cancel (fetch mode)');
    
    // Get fresh ID token
    const idToken = await user.getIdToken();
    console.log('📞 Got ID token for cancel');

    // Build URL (match your upgrade endpoint)
    const functionUrl = `https://us-central1-raidmemegen.cloudfunctions.net/cancelSubscription`;
    const origin = window.location.origin;  // For consistency, though cancel doesn't need it
    console.log('📡 Calling URL:', functionUrl, 'with origin:', origin);

    // In cancelPro, replace the fetch body line:
const response = await fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ data: {} }),  // <- Wrap in "data"; empty since no params needed
});

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('💥 Fetch error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Cancel response:', data);

    if (data.success) {
      alert(data.message);  // e.g., "Canceled – until [date]"
      // Refetch user state (triggers listener)
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const freshData = userDoc.data();
        setPro(freshData.isPro ?? false);
        setGensCount(freshData.gensToday || 0);
      }
    } else {
      throw new Error(data.message || 'Unknown response');
    }
  } catch (error) {
    console.error('💥 Full fetch error:', error);
    alert('Cancel failed: ' + (error.message || 'Check console/logs.'));
  } finally {
    setLoading(false);
  }
}

  // Close upgrade modal
  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
  };

  // Toggle signup/login
  const toggleSignup = () => {
    setIsSignup(!isSignup);
    setAuthError('');
  };

  // Close auth modal
  const closeAuthModal = () => {
    setShowAuthModal(false);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setAuthError('');
    setIsSignup(false);
  };

  // Button text logic
  const buttonText = loading 
    ? 'Generating...' 
    : !user
      ? 'Login to Generate Raid Plan'
      : pro 
        ? 'Generate Raid Plan (Unlimited!)' 
        : `Generate Raid Plan (${gensCount}/3 free today)`;

 const isButtonDisabled = loading || !raid || !user;

  if (authLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><p className="text-green-400">Loading...</p></div>;
  }

  return (
  <div className="min-h-screen bg-gray-900 p-4">
    <header className="mb-8 flex justify-between items-center">
      <h1 className="text-3xl font-bold text-green-400">Raid Gen</h1>
      {user ? (
        <span className="text-green-400">
          Welcome, {user.displayName || user.email}! {pro && '(Pro)'} 
          <button onClick={handleLogout} className="underline focus:outline-none ml-2">
            Logout
          </button>
        </span>
      ) : (
        <button onClick={() => setShowAuthModal(true)} className="bg-green-500 px-4 py-2 rounded focus:outline-none">
          Login / Sign Up
        </button>
      )}
    </header>

    {/* Native Static Base Tags – Always renders, overrides index.html */}
    <title>Raid Meme Generator: Custom Plans for Destiny 2, WoW & Helldivers 2</title>
    <meta name="description" content="Generate custom raid plans with meme chaos for Destiny 2 raids, World of Warcraft strategies, Helldivers 2 squad missions, and more." />
    <meta property="og:title" content="Raid Meme Gen: Custom Raid Plans for Gamers" />
    <meta property="og:description" content="Create hilarious or serious raid strategies for your squad. Destiny 2, WoW, Helldivers 2—generate plans with phases and timelines." />
    <meta property="og:image" content="https://raidmemegen.vercel.app/vite.svg" />
    <meta name="twitter:card" content="summary_large_image" />

    {/* SEO Intro Paragraphs */}
    <div className="max-w-4xl mx-auto mb-8 text-center bg-gray-800 p-6 rounded-lg border border-green-400">
      <h2 className="text-2xl font-bold mb-4 text-green-400">Raid Generator: Custom Plans for Arc Raiders, Destiny 2, WoW & Helldivers 2</h2>
      <p className="text-lg mb-4 text-white">Dive into the ultimate <strong>raid generator</strong> designed for gamers tackling tough content. Whether you're building a <strong>Destiny 2 raid generator</strong> strategy for Vault of Glass or a <strong>WoW raid strategy generator</strong> for mythic bosses, this tool creates squad-specific plans with phases, estimated times, and timeline charts. Add a twist with "Meme Chaos" vibe for funny raid plans that roast your wipes, or go "Serious Strat" for focused <strong>Helldivers 2 squad plans</strong>.</p>
      <p className="text-lg text-white">Tailored for MMOs like Final Fantasy XIV savage raids, Path of Exile 2 encounters, and Monster Hunter Wilds hunts—select your game, raid, squad size (3-6 players), and generate <strong>meme raid strategies</strong> instantly. Free tier: 3 gens/day. Pro: Unlimited for $5/mo. Export as PDF, share links, or save to your account. Less wipes, more laughs—start generating!</p>
    </div>

    {showAuthModal && (
      <AuthModal
        isSignup={isSignup}
        email={email}
        password={password}
        displayName={displayName}
        authError={authError}
        setEmail={setEmail}
        setPassword={setPassword}
        setDisplayName={setDisplayName}
        onAuthSubmit={handleAuth}
        onToggleSignup={toggleSignup}
        onClose={closeAuthModal}
      />
    )}
    {showUpgradeModal && (
      <UpgradeModal onUpgrade={upgradeToPro} onClose={closeUpgradeModal} />
    )}

    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-8">
        <div className="flex-1">
          <label className="block text-green-400 mb-2">Game:</label>
          <select
            value={game}
            onChange={(e) => { setGame(e.target.value); setRaid(''); }}
            className="w-full p-2 bg-gray-700 text-green-400 border border-green-400 rounded focus:outline-none focus:border-green-500"
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
        </div>
        {availableRaids.length > 0 && (
          <div className="flex-1">
            <label className="block text-green-400 mb-2">Raid:</label>
            <select
              value={raid}
              onChange={(e) => setRaid(e.target.value)}
              className="w-full p-2 bg-gray-700 text-green-400 border border-green-400 rounded focus:outline-none focus:border-green-500"
            >
              <option value="">Select Raid</option>
              {availableRaids.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8">
        <div className="flex-1">
          <label className="block text-green-400 mb-2">Squad Size:</label>
          <input
            type="number"
            min="3"
            max="6"
            value={squadSize}
            onChange={(e) => setSquadSize(parseInt(e.target.value) || 6)}
            className="w-full p-2 bg-gray-700 text-green-400 border border-green-400 rounded focus:outline-none focus:border-green-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-green-400 mb-2">Vibe:</label>
          <select
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            className="w-full p-2 bg-gray-700 text-green-400 border border-green-400 rounded focus:outline-none focus:border-green-500"
          >
            <option value="Meme Chaos">Meme Chaos</option>
            <option value="Serious Strat">Serious Strat</option>
          </select>
        </div>
      </div>

      <button
        onClick={generateRaid}
        disabled={isButtonDisabled}
        className="w-full bg-green-500 px-4 py-2 rounded disabled:opacity-50 focus:outline-none"
      >
        {buttonText}
      </button>

      {/* Add gens count display */}
      {!pro && user && (
        <p className="text-sm text-green-400 mt-2 text-center">
          {gensCount}/3 Gens Today
        </p>
      )}

      {plan && (
        <>
          {/* Dynamic Tags for Generated Plans */}
          <title>{`${game} ${raid} Raid Plan | Raid Gen`}</title>
          <meta name="description" content={`Custom ${vibe} raid plan for ${squadSize}-player squad in ${game}'s ${raid}. Phases, timeline, and ${vibe === 'Meme Chaos' ? 'funny wipes' : 'serious strats'}.`} />
          <meta property="og:title" content={`${game} ${raid} Meme Raid Strategy`} />
          <meta property="og:description" content={`Generated plan: ${plan.title}. Est. time: ${plan.phases.reduce((a, b) => a + b.time, 0)} mins.`} />

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-green-400">{plan.title}</h2>
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-lg font-bold text-green-400 mb-2">Timeline</h3>
              <Line data={chartData} options={chartOptions} />
            </div>
            <div className="space-y-4">
              {plan.phases.map((phase) => (
                <div key={phase.name} className="phase-card bg-gray-800 p-4 rounded border border-green-400">
                  <h3 className="text-lg font-bold text-green-400">{phase.name}</h3>
                  <p className="text-white">{phase.text}</p>
                  <p className="text-green-400 mt-2">Est. Time: {phase.time} mins</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap space-x-4 space-y-2">
              <button onClick={exportPDF} className="bg-blue-500 px-4 py-2 rounded focus:outline-none">Export PDF</button>
              <button onClick={shareLink} className="bg-purple-500 px-4 py-2 rounded focus:outline-none">Share Link</button>
              {user && (
                <button onClick={saveRaid} disabled={saving} className="bg-yellow-500 px-4 py-2 rounded disabled:opacity-50 focus:outline-none">
                  {saving ? 'Saving...' : 'Save Raid'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {user && savedRaids.length > 0 && (
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-xl font-bold text-green-400 mb-4">Saved Raids</h3>
          <div className="space-y-2">
            {savedRaids.map((saved) => (
              <div key={saved.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span className="text-green-400">{saved.title} ({saved.raid})</span>
                <div>
                  <button onClick={() => loadSavedRaid(saved)} className="bg-green-500 px-2 py-1 rounded mr-2 focus:outline-none">Load</button>
                  <button onClick={() => deleteSavedRaid(saved.id)} className="bg-red-500 px-2 py-1 rounded focus:outline-none">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center pt-8">
        {user ? (
          pro ? (
            <div className="space-y-2">
              <button
                disabled={loading}
                className="bg-green-500 text-black px-6 py-3 rounded font-bold focus:outline-none hover:bg-green-400 disabled:opacity-50"
              >
                {loading ? 'Canceling...' : 'Pro Account Active – Unlimited Chaos! 🚀'}
              </button>
              <button
                onClick={cancelPro}
                disabled={loading}
                className="bg-red-500 text-white px-6 py-3 rounded font-bold focus:outline-none hover:bg-red-400 disabled:opacity-50"
              >
                {loading ? 'Canceling...' : 'Cancel Pro Subscription'}
              </button>
              <p className="text-sm text-gray-400 mt-2">
                Manage billing at <a href="https://dashboard.stripe.com/subscriptions" target="_blank" rel="noopener noreferrer" className="underline text-blue-400">stripe.com</a>
              </p>
            </div>
          ) : (
            <button
              onClick={upgradeToPro}
              disabled={loading}
              className="bg-yellow-500 text-black px-6 py-3 rounded font-bold focus:outline-none hover:bg-yellow-400 disabled:opacity-50"
            >
              {loading ? 'Upgrading...' : 'Go Pro for Unlimited Gens & Squad Fun ($5/mo)'}
            </button>
          )
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-yellow-500 text-black px-6 py-3 rounded font-bold focus:outline-none hover:bg-yellow-400"
          >
            Log In to Go Pro ($5/mo)
          </button>
        )}
      </div>
    </div>
  </div>
);
}

export default App;
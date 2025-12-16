import { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AuthModal from './components/auth/AuthModal';
import RaidGenerator from './components/raid/RaidGenerator';
import RaidPlan from './components/raid/RaidPlan';
import UpgradeModal from './components/raid/UpgradeModal';
import { useAuth } from './hooks/useAuth';
import { useRaidGen } from './hooks/useRaidGen';
import { auth } from './firebase';

function App() {
  // Auth Hook
  const {
    user,
    pro,
    gensCount,
    authLoading,
    login,
    signup,
    logout,
    incrementGens
  } = useAuth();

  // Dialog States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [authError, setAuthError] = useState('');

  // Raid Gen Hook
  const {
    plan,
    loading: genLoading,
    generateRaid,
    exportPDF,
    setPlan
  } = useRaidGen(user, pro, gensCount, () => setShowUpgradeModal(true));

  // Handle successful login/signup to close modal
  const handleAuthSubmit = async ({ email, password, displayName }) => {
    setAuthError('');
    try {
      if (isSignup) {
        await signup(email, password, displayName);
      } else {
        await login(email, password);
      }
      setShowAuthModal(false);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  // Handle Upgrade (Using existing logic simplified)
  const handleUpgrade = async () => {
    if (!user) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const functionUrl = `https://us-central1-raidmemegen.cloudfunctions.net/createStripeCheckoutSession`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { origin: window.location.origin } }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();

      if (result.result?.sessionUrl) {
        window.location.href = result.result.sessionUrl;
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Upgrade initialization failed. Please try again.');
    }
  };

  // Check URL params for shared links
  // We can let RaidGenerator handle internal state, or pass it in. 
  // To keep React simple, we'll just let the Plan display if one is generated.
  // Ideally, generating from URL would happen inside the hook, but for now we'll stick to manual generation to avoid side-effect complexity.

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-raid-neon selection:text-black flex flex-col">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

      <div className="relative z-10 flex-grow flex flex-col">
        <Navbar
          user={user}
          isPro={pro}
          onLoginClick={() => { setIsSignup(false); setShowAuthModal(true); }}
          onLogoutClick={logout}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 w-full flex-grow">
          {/* SEO Content Hidden or Styled */}
          <div className="max-w-4xl mx-auto mb-12 text-center bg-gray-900/50 p-8 rounded-2xl border border-gray-800 backdrop-blur-sm shadow-xl">
            <h1 className="text-3xl md:text-4xl font-gamer font-bold text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-blue-500 mb-6">
              Raid Generator: Custom Plans for Arc Raiders, Destiny 2, WoW & Helldivers 2
            </h1>
            <p className="text-gray-300 mb-4 leading-relaxed text-lg">
              Dive into the ultimate <strong className="text-white">raid generator</strong> designed for gamers tackling tough content. Whether you're building a <strong className="text-raid-neon">Destiny 2 raid generator</strong> strategy for Vault of Glass or a <strong className="text-raid-neon">WoW raid strategy generator</strong> for mythic bosses, this tool creates squad-specific plans with phases, estimated times, and timeline charts. Add a twist with "Meme Chaos" vibe for funny raid plans that roast your wipes, or go "Serious Strat" for focused <strong className="text-raid-neon">Helldivers 2 squad plans</strong>.
            </p>
            <p className="text-gray-300 leading-relaxed text-lg">
              Tailored for MMOs like Final Fantasy XIV savage raids, Path of Exile 2 encounters, and Monster Hunter Wilds hunts—select your game, raid, squad size (3-6 players), and generate <strong className="text-white">meme raid strategies</strong> instantly. Free tier: 3 gens/day. Pro: Unlimited for $5/mo. Export as PDF, share links, or save to your account. Less wipes, more laughs—start generating!
            </p>
          </div>

          <div className="space-y-12">
            <RaidGenerator
              user={user}
              isPro={pro}
              gensCount={gensCount}
              loading={genLoading}
              onGenerate={(params) => generateRaid({ ...params, incrementGens })}
              onShowAuth={() => setShowAuthModal(true)}
            />

            {plan && (
              <RaidPlan
                plan={plan}
                onExportPDF={() => exportPDF(plan)}
                onShare={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}
              />
            )}
          </div>
        </main>

        <Footer />
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isSignup={isSignup}
        onToggleMode={() => { setIsSignup(!isSignup); setAuthError(''); }}
        onSubmit={handleAuthSubmit}
        error={authError}
        authLoading={authLoading}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';
import LZString from 'lz-string';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import AuthModal from '../auth/AuthModal';
import RaidGenerator from '../raid/RaidGenerator';
import RaidPlan from '../raid/RaidPlan';
import UpgradeModal from '../raid/UpgradeModal';
import { useAuth } from '../../hooks/useAuth';
import { useRaidGen } from '../../hooks/useRaidGen';
import SavedRaidsModal from '../raid/SavedRaidsModal';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

function Home() {
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
    const [showSavedModal, setShowSavedModal] = useState(false);
    const [authError, setAuthError] = useState('');

    // Saved Raids State
    const [savedRaids, setSavedRaids] = useState([]);

    // Raid Gen Hook
    const {
        plan,
        loading: genLoading,
        generateRaid,
        exportPDF,
        setPlan
    } = useRaidGen(user, pro, gensCount, () => setShowUpgradeModal(true));

    // --- SAVED RAIDS LOGIC ---
    const fetchSavedRaids = async () => {
        if (!user) return;
        try {
            const q = query(
                collection(db, 'users', user.uid, 'raids'),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const raids = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedRaids(raids);
            setShowSavedModal(true);
        } catch (error) {
            console.error("Error fetching raids:", error);
            alert("Failed to load saved raids.");
        }
    };

    const saveRaid = async () => {
        if (!user) {
            setIsSignup(false);
            setShowAuthModal(true);
            return;
        }
        if (!plan) return;

        try {
            // Basic title from plan details
            const title = `${plan.game} - ${plan.raid} Protocol`;

            await addDoc(collection(db, 'users', user.uid, 'raids'), {
                ...plan,
                title,
                createdAt: serverTimestamp()
            });
            alert('Raid saved to archive!');
        } catch (error) {
            console.error("Error saving raid:", error);
            alert("Failed to save raid.");
        }
    };

    const deleteRaid = async (raidId) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'raids', raidId));
            setSavedRaids(prev => prev.filter(r => r.id !== raidId));
        } catch (error) {
            console.error("Error deleting raid:", error);
        }
    };

    const loadRaid = (raid) => {
        setPlan(raid);
        setShowSavedModal(false);
    };

    // --- SHARE LOGIC ---
    const handleShare = async () => {
        if (!plan) return;

        try {
            const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(plan));
            const shareUrl = `${window.location.origin}/share?data=${compressed}`;

            await navigator.clipboard.writeText(shareUrl);
            alert('Public share link copied to clipboard!');
        } catch (error) {
            console.error("Error generating share link:", error);
            alert("Failed to generate share link. Please try again.");
        }
    };

    // --- AUTH ---
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

    // Handle Upgrade
    const handleUpgrade = async () => {
        if (!user) return;
        try {
            // Assuming 'auth' is available from firebase import or useAuth hook if needed
            // But useAuth exposes 'user', so we can get token. 
            // Note: useAuth implementation wasn't fully visible but App.jsx used auth.currentUser.
            // I need to import 'auth' from firebase.js if I use it directly, 
            // OR rely on 'user' object if it has getIdToken.
            // Checking App.jsx: it used `auth.currentUser.getIdToken()`. 
            // I need to make sure `auth` is imported. App.jsx didn't import auth explicitly in code I saw?
            // Ah, let's check App.jsx imports again.
            // It imported { db } from './firebase'. 
            // Logic: const idToken = await auth.currentUser.getIdToken(); 
            // 'auth' was NOT defined in the App.jsx imports I saw in view_file. 
            // Wait, line 122: `const idToken = await auth.currentUser.getIdToken();`
            // But `auth` is not imported. This might have been a bug or I missed an import.
            // Checking imports: `import { db } from './firebase';`.
            // Maybe it uses `user.accessToken` or `user.getIdToken()`?
            // If `user` is from `onAuthStateChanged`, it has `getIdToken()`.

            // I'll update it to use `user.getIdToken()` if user is present.
            const idToken = await user.getIdToken();
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

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-raid-neon selection:text-black flex flex-col">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

            <div className="relative z-10 flex-grow flex flex-col">
                <Navbar
                    user={user}
                    isPro={pro}
                    onLoginClick={() => { setIsSignup(false); setShowAuthModal(true); }}
                    onLogoutClick={logout}
                    onSavedClick={fetchSavedRaids}
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
                                onSave={saveRaid}
                                onShare={handleShare}
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

            <SavedRaidsModal
                isOpen={showSavedModal}
                onClose={() => setShowSavedModal(false)}
                savedRaids={savedRaids}
                onLoad={loadRaid}
                onDelete={deleteRaid}
            />

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                onUpgrade={handleUpgrade}
            />
        </div>
    );
}

export default Home;

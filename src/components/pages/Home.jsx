
import { useState, useEffect } from 'react';
import LZString from 'lz-string';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import AuthModal from '../auth/AuthModal';
import RaidGenerator from '../raid/RaidGenerator';
import RaidPlan from '../raid/RaidPlan';
import UpgradeModal from '../raid/UpgradeModal';
import ShareModal from '../raid/ShareModal';
import OverlayCreator from '../raid/OverlayCreator';
import SubmitGalleryModal from '../raid/SubmitGalleryModal';
import { useAuth } from '../../hooks/useAuth';
import { useRaidGen } from '../../hooks/useRaidGen';
import { useGallery } from '../../hooks/useGallery';
import SavedRaidsModal from '../raid/SavedRaidsModal';
import { supabase } from '../../supabaseClient';

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
    const [showShareModal, setShowShareModal] = useState(false);
    const [showOverlayCreator, setShowOverlayCreator] = useState(false);
    const [showSubmitGalleryModal, setShowSubmitGalleryModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
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

    // Gallery Hook
    const { submitToGallery } = useGallery(user);

    // --- SAVED RAIDS LOGIC ---
    const fetchSavedRaids = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('saved_raids')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setSavedRaids(data);
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

            const { error } = await supabase.from('saved_raids').insert([{
                user_id: user.id,
                game: plan.game,
                raid: plan.raid,
                squad_size: plan.squadSize,
                vibe: plan.vibe,
                phases: plan.phases,
                title: title,
                created_at: new Date().toISOString()
            }]);

            if (error) throw error;

            alert('Raid saved to archive!');
        } catch (error) {
            console.error("Error saving raid:", error);
            alert("Failed to save raid.");
        }
    };

    const deleteRaid = async (raidId) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;
        try {
            const { error } = await supabase
                .from('saved_raids')
                .delete()
                .eq('id', raidId)
                .eq('user_id', user.id);

            if (error) throw error;

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
    const handleShare = () => {
        if (!plan) return;

        try {
            const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(plan));
            const url = `${window.location.origin}/share?data=${compressed}`;
            setShareUrl(url);
            setShowShareModal(true);
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
            // Get Supabase session token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error('No auth token found');

            // Use Vercel API route
            const functionUrl = `/api/create-checkout`;

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: { origin: window.location.origin } }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Network response was not ok');
            }

            const result = await response.json();

            if (result.sessionUrl) {
                window.location.href = result.sessionUrl;
            }
        } catch (error) {
            console.error('Upgrade failed:', error);
            alert('Upgrade initialization failed. Please ensure backend is configured. Details in console.');
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
                                onCreateOverlay={() => setShowOverlayCreator(true)}
                                onSubmitToGallery={() => {
                                    if (!user) {
                                        setShowAuthModal(true);
                                        return;
                                    }
                                    setShowSubmitGalleryModal(true);
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

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                plan={plan}
                shareUrl={shareUrl}
            />

            <OverlayCreator
                isOpen={showOverlayCreator}
                onClose={() => setShowOverlayCreator(false)}
                plan={plan}
            />

            <SubmitGalleryModal
                isOpen={showSubmitGalleryModal}
                onClose={() => setShowSubmitGalleryModal(false)}
                plan={plan}
                onSubmit={submitToGallery}
            />
        </div>
    );
}

export default Home;


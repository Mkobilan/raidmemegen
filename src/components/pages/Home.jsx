
import { useState, useEffect, useRef } from 'react';
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
import TrialBillingModal from '../raid/TrialBillingModal';
import { useAuth } from '../../hooks/useAuth';
import { useRaidGen } from '../../hooks/useRaidGen';
import { useGallery } from '../../hooks/useGallery';
import SavedRaidsModal from '../raid/SavedRaidsModal';
import RaidExportTemplate from '../raid/RaidExportTemplate';
import { supabase } from '../../supabaseClient';

function Home() {
    // Auth Hook
    const {
        user,
        pro,
        gensCount,
        isTrialActive,
        trialDaysLeft,
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
    const [showTrialBillingModal, setShowTrialBillingModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [authError, setAuthError] = useState('');
    const exportRef = useRef(null);

    // Saved Raids State
    const [savedRaids, setSavedRaids] = useState([]);

    // Raid Gen Hook
    const {
        plan,
        loading: genLoading,
        generateRaid,
        exportPDF,
        exportImage,
        setPlan
    } = useRaidGen(user, pro, isTrialActive, () => setShowUpgradeModal(true));

    // Gallery Hook
    const { submitToGallery } = useGallery(user);

    // --- AUTO-SHOW BILLING MODAL ---
    useEffect(() => {
        // If auth is loaded, user is logged in, NOT pro (hasn't provided credit card for trial/sub),
        // and hasn't seen the trial modal this session
        if (!authLoading && user && !pro && !sessionStorage.getItem('hasSeenTrialModal')) {
            const timer = setTimeout(() => {
                setShowTrialBillingModal(true);
                sessionStorage.setItem('hasSeenTrialModal', 'true');
            }, 1500); // Small delay for better UX
            return () => clearTimeout(timer);
        }
    }, [user, pro, authLoading]);

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
    const handleStartWarRoom = async () => {
        if (!user) {
            setIsSignup(false);
            setShowAuthModal(true);
            return;
        }
        if (!plan) return;

        try {
            const { data, error } = await supabase
                .from('rooms')
                .insert([{
                    host_id: user.id,
                    game: plan.game,
                    active_plan: plan
                }])
                .select()
                .single();

            if (error) throw error;
            // Navigate to room
            window.location.href = `/room/${data.id}`;
        } catch (error) {
            console.error("Error creating war room:", error);
            alert("Failed to initialize War Room.");
        }
    };

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
    const handleAuthSubmit = async ({ email, password, username }) => {
        setAuthError('');
        try {
            if (isSignup) {
                await signup(email, password, username);
                alert("Account created! Please confirm your email to proceed.");
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

            {/* Hidden Export Template */}
            <RaidExportTemplate ref={exportRef} plan={plan} />

            <div className="relative z-10 flex-grow flex flex-col">
                <Navbar
                    user={user}
                    isPro={pro}
                    onLoginClick={() => { setIsSignup(false); setShowAuthModal(true); }}
                    onLogoutClick={logout}
                    onSavedClick={fetchSavedRaids}
                />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 w-full flex-grow">
                    {/* Main Generator Section */}
                    <div className="space-y-12">
                        <RaidGenerator
                            user={user}
                            isPro={pro}
                            isTrialActive={isTrialActive}
                            trialDaysLeft={trialDaysLeft}
                            gensCount={gensCount}
                            loading={genLoading}
                            onGenerate={(params) => generateRaid({ ...params, incrementGens })}
                            onShowAuth={() => setShowAuthModal(true)}
                        />

                        {plan && (
                            <RaidPlan
                                plan={plan}
                                onExportPDF={() => exportPDF(plan, exportRef)}
                                onExportImage={() => exportImage(exportRef, `${plan.raid}-mission.png`)}
                                onSave={saveRaid}
                                onShare={handleShare}
                                onStartWarRoom={handleStartWarRoom}
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

            <TrialBillingModal
                isOpen={showTrialBillingModal}
                onClose={() => setShowTrialBillingModal(false)}
                onUpgrade={handleUpgrade}
            />
        </div>
    );
}

export default Home;


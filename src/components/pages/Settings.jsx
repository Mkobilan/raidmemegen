import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User, Lock, Bell, Shield, Trash2, Zap,
    AtSign, Globe, Palette, Save, AlertTriangle,
    CreditCard, ExternalLink, Hash
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import AuthModal from '../auth/AuthModal';
import SavedRaidsModal from '../raid/SavedRaidsModal';

const Settings = () => {
    const { user, pro, logout, login, signup, authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Modal States
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isSignup, setIsSignup] = useState(false);
    const [showSavedModal, setShowSavedModal] = useState(false);
    const [savedRaids, setSavedRaids] = useState([]);
    const [authError, setAuthError] = useState('');

    const [profile, setProfile] = useState({
        username: '',
        is_public: true,
        discord_webhook_url: '',
        default_meme_style: 'Matrix'
    });

    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            if (data) {
                setProfile({
                    username: data.username || '',
                    is_public: data.is_public ?? true,
                    discord_webhook_url: data.discord_webhook_url || '',
                    default_meme_style: data.default_meme_style || 'Matrix'
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    username: profile.username,
                    is_public: profile.is_public,
                    discord_webhook_url: profile.discord_webhook_url,
                    default_meme_style: profile.default_meme_style,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwords.newPassword
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPasswords({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

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

    const handleManageSubscription = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/manage-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.details || 'Failed to open subscription portal');
            }

            if (result.url) window.location.href = result.url;
        } catch (error) {
            console.error('Portal Error:', error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('WARNING: This will permanently delete your account and all saved raids. This action cannot be undone. Are you sure?')) {
            return;
        }

        setLoading(true);
        try {
            // In a real app, you'd call a serverless function to handle full deletion (Auth + DB)
            // For now, we delete the profile and sign out.
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

            if (profileError) throw profileError;

            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        }
    };

    const Section = ({ title, icon: Icon, children }) => (
        <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-raid-neon/10 rounded-lg">
                    <Icon className="h-5 w-5 text-raid-neon" />
                </div>
                <h2 className="text-xl font-gamer font-bold text-white uppercase tracking-wider">{title}</h2>
            </div>
            {children}
        </section>
    );

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

                <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 w-full flex-grow pb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <header className="mb-10 text-center">
                            <h1 className="text-4xl font-gamer font-bold text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-blue-500 mb-2">
                                SETTINGS
                            </h1>
                            <p className="text-gray-400">Manage your account, preferences, and security</p>
                        </header>

                        {message.text && (
                            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/50' : 'bg-red-500/10 text-red-400 border border-red-500/50'
                                }`}>
                                <div className="flex-1">{message.text}</div>
                            </div>
                        )}

                        <Section title="Account Profile" icon={User}>
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                                    <div className="relative">
                                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={profile.username}
                                            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-raid-neon transition-colors"
                                            placeholder="Username"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                                    <div>
                                        <div className="font-medium text-white flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-raid-neon" />
                                            Public Profile
                                        </div>
                                        <p className="text-xs text-gray-500">Allow others to see your saved raids and profile stats</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setProfile({ ...profile, is_public: !profile.is_public })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile.is_public ? 'bg-raid-neon' : 'bg-gray-700'
                                            }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile.is_public ? 'translate-x-6' : 'translate-x-1'
                                            }`} />
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-raid-neon text-black font-gamer font-bold py-2 rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {loading ? 'Saving...' : 'Save Profile'}
                                </button>
                            </form>
                        </Section>

                        <Section title="Preferences" icon={Palette}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Default Meme Style</label>
                                    <select
                                        value={profile.default_meme_style}
                                        onChange={(e) => setProfile({ ...profile, default_meme_style: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-raid-neon transition-colors"
                                    >
                                        <option value="Matrix">Matrix (Neon Green)</option>
                                        <option value="Classic">Classic (White/Black)</option>
                                        <option value="Retro">Retro (80s Neon)</option>
                                        <option value="Modern">Modern (Dark/Minimal)</option>
                                    </select>
                                </div>
                            </div>
                        </Section>

                        <Section title="Integrations" icon={Bell}>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Discord Webhook</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={profile.discord_webhook_url}
                                        onChange={(e) => setProfile({ ...profile, discord_webhook_url: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-raid-neon transition-colors"
                                        placeholder="https://discord.com/api/webhooks/..."
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Automatically post your generated raids to this Discord channel</p>
                            </div>
                        </Section>

                        <Section title="Security" icon={Shield}>
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <input
                                            type="password"
                                            value={passwords.newPassword}
                                            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-raid-neon transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <input
                                            type="password"
                                            value={passwords.confirmPassword}
                                            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-raid-neon transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gray-700 text-white font-gamer font-bold py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </Section>

                        <Section title="Subscription" icon={Zap}>
                            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${pro ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
                                        <Zap className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white uppercase font-gamer">
                                            Plan: {pro ? 'PRO ACCESS' : 'FREE PLAN'}
                                        </div>
                                        <p className="text-sm text-gray-400">
                                            {pro ? 'Thank you for supporting Raid Gen!' : 'Upgrade for unlimited raids and special features'}
                                        </p>
                                    </div>
                                </div>
                                {pro ? (
                                    <button
                                        onClick={handleManageSubscription}
                                        disabled={loading}
                                        className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <CreditCard className="h-4 w-4" /> Manage
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => window.location.href = '/#pricing'}
                                        className="bg-yellow-500 text-black font-gamer font-bold px-4 py-2 rounded-lg hover:bg-white transition-colors"
                                    >
                                        Upgrade
                                    </button>
                                )}
                            </div>
                        </Section>

                        <Section title="Danger Zone" icon={Trash2}>
                            <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
                                <div className="flex items-start gap-3 mb-4">
                                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-red-500">Delete Account</h3>
                                        <p className="text-sm text-gray-400">
                                            Once you delete your account, there is no going back. All your saved raids and profile data will be removed.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={loading}
                                    className="w-full bg-red-900/40 text-red-400 border border-red-900/50 hover:bg-red-600 hover:text-white font-gamer font-bold py-2 rounded-lg transition-all"
                                >
                                    Delete Account Permanently
                                </button>
                            </div>
                        </Section>
                    </motion.div>
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
                onLoad={(raid) => {
                    // Navigate to home with simple logic or just close
                    window.location.href = '/';
                }}
                onDelete={deleteRaid}
            />
        </div>
    );
};

export default Settings;

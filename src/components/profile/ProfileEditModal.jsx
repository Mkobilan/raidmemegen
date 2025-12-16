import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Upload, Check, AlertCircle, Gamepad2, Plus, Trash2 } from 'lucide-react';
import {
    FaYoutube,
    FaTwitch,
    FaTwitter,
    FaFacebook,
    FaDiscord,
    FaTiktok
} from 'react-icons/fa';
import { SiKick, SiRumble } from 'react-icons/si';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import raidsData from '../../data/raids.json';
import { runTestUpload } from '../../test-upload'; // Diagnostic Import

const UNIQUE_GAMES = [...new Set(raidsData.map(r => r.game))];

const SOCIAL_PLATFORMS = [
    { id: 'youtube', name: 'YouTube', icon: FaYoutube, color: 'text-red-500', prefix: 'youtube.com/' },
    { id: 'twitch', name: 'Twitch', icon: FaTwitch, color: 'text-purple-500', prefix: 'twitch.tv/' },
    { id: 'twitter', name: 'X / Twitter', icon: FaTwitter, color: 'text-blue-400', prefix: 'x.com/' },
    { id: 'facebook', name: 'Facebook', icon: FaFacebook, color: 'text-blue-600', prefix: 'facebook.com/' },
    { id: 'discord', name: 'Discord', icon: FaDiscord, color: 'text-indigo-400', placeholder: 'Username (not invite)' },
    { id: 'kick', name: 'Kick', icon: SiKick, color: 'text-green-500', prefix: 'kick.com/' },
    { id: 'tiktok', name: 'TikTok', icon: FaTiktok, color: 'text-pink-500', prefix: 'tiktok.com/@' },
    { id: 'rumble', name: 'Rumble', icon: SiRumble, color: 'text-green-400', prefix: 'rumble.com/c/' }
];

const ProfileEditModal = ({ isOpen, onClose, onSave, currentProfile }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { profile: hookProfile, getMyProfile, updateProfile, uploadAvatar, checkUsernameAvailable } = useProfile(user);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        bio: '',
        gamesPlaying: [],
        gamerTags: {},
        socialLinks: {}
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, available, taken, invalid
    const [activeTab, setActiveTab] = useState('general'); // general, games, social

    // Effective profile data source
    const effectiveProfile = currentProfile || hookProfile;

    const fileInputRef = useRef(null);

    // Initial load
    useEffect(() => {
        if (isOpen) {
            if (effectiveProfile) {
                // Populate from existing prop/hook data immediately
                populateForm(effectiveProfile);
            } else {
                // Fallback fetch if nothing exists yet
                loadCurrentProfile();
            }
        }
    }, [isOpen, effectiveProfile]);

    const populateForm = (data) => {
        setFormData({
            username: data.username || '',
            bio: data.bio || '',
            gamesPlaying: data.gamesPlaying || [],
            gamerTags: data.gamerTags || {},
            socialLinks: data.socialLinks || {}
        });
    };

    const loadCurrentProfile = async () => {
        setLoading(true);
        try {
            const current = await getMyProfile();
            if (current) {
                populateForm(current);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    // Username validation debouncer
    useEffect(() => {
        const checkUsername = async () => {
            if (!formData.username) {
                setUsernameStatus('idle');
                return;
            }

            // Don't check if it matches current profile username
            if (effectiveProfile && formData.username === effectiveProfile.username) {
                setUsernameStatus('available');
                return;
            }

            if (formData.username.length < 3) {
                setUsernameStatus('invalid');
                return;
            }

            setUsernameStatus('checking');
            const isAvailable = await checkUsernameAvailable(formData.username);
            setUsernameStatus(isAvailable ? 'available' : 'taken');
        };

        const timeoutId = setTimeout(checkUsername, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.username, effectiveProfile]);

    // Handlers
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setError('Image size must be less than 5MB');
            return;
        }

        setUploading(true);
        try {
            const downloadUrl = await uploadAvatar(file);
            await updateProfile({ ...formData, avatarUrl: downloadUrl });
            // Profile context will update automatically or we can force refresh
        } catch (err) {
            console.error(err);
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleGameToggle = (game) => {
        const currentGames = [...formData.gamesPlaying];
        if (currentGames.includes(game)) {
            // Remove game and its tag
            const newGames = currentGames.filter(g => g !== game);
            const newTags = { ...formData.gamerTags };
            delete newTags[game];

            setFormData(prev => ({
                ...prev,
                gamesPlaying: newGames,
                gamerTags: newTags
            }));
        } else {
            // Add game
            setFormData(prev => ({
                ...prev,
                gamesPlaying: [...currentGames, game]
            }));
        }
    };

    const handleSave = async () => {
        if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
            setError('Please choose a valid available username');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await updateProfile(formData);
            onSave();

            // Redirect to the new profile URL if username changed or created
            if (formData.username) {
                navigate(`/profile/${formData.username}`);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to save profile. ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
                        <h2 className="text-xl font-bold text-white font-gamer">Edit Profile</h2>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-800">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'general'
                                ? 'border-raid-neon text-raid-neon bg-raid-neon/5'
                                : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            General Info
                        </button>
                        <button
                            onClick={() => setActiveTab('games')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'games'
                                ? 'border-raid-neon text-raid-neon bg-raid-neon/5'
                                : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            Games & Tags
                        </button>
                        <button
                            onClick={() => setActiveTab('social')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'social'
                                ? 'border-raid-neon text-raid-neon bg-raid-neon/5'
                                : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            Social Links
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                {/* Avatar Upload */}
                                <div className="flex flex-col items-center">
                                    <div
                                        onClick={handleAvatarClick}
                                        className="relative w-28 h-28 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 hover:border-raid-neon cursor-pointer overflow-hidden group transition-all"
                                    >
                                        {effectiveProfile?.avatarUrl ? (
                                            <img
                                                src={effectiveProfile.avatarUrl}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                                <Upload className="w-8 h-8 mb-1" />
                                                <span className="text-xs">Upload</span>
                                            </div>
                                        )}

                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Upload className="w-8 h-8 text-white" />
                                        </div>

                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <span className="mt-2 text-xs text-gray-500">Click to upload (Max 5MB)</span>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/jpeg,image/png,image/gif"
                                        className="hidden"
                                    />
                                </div>

                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Username (Unique URL)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                            className={`w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 transition-all ${usernameStatus === 'taken' ? 'border-red-500 focus:ring-red-500/50' :
                                                usernameStatus === 'available' ? 'border-green-500 focus:ring-green-500/50' :
                                                    'border-gray-700 focus:ring-raid-neon/50'
                                                }`}
                                            placeholder="gamer_tag_123"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>}
                                            {usernameStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                                            {usernameStatus === 'taken' && <X className="w-4 h-4 text-red-500" />}
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs">
                                        {usernameStatus === 'taken' && <span className="text-red-400">Username is already taken.</span>}
                                        {usernameStatus === 'available' && <span className="text-green-400">Username available!</span>}
                                        {usernameStatus === 'invalid' && <span className="text-gray-500">Must be at least 3 characters. Letters, numbers, underscores only.</span>}
                                        {usernameStatus === 'idle' && <span className="text-gray-500">Your public profile URL: raidgen.com/profile/{formData.username || 'username'}</span>}
                                    </p>
                                </div>

                                {/* Bio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-raid-neon/50 h-24 resize-none"
                                        placeholder="Tell other gamers about yourself..."
                                        maxLength={280}
                                    ></textarea>
                                    <div className="text-right text-xs text-gray-500 mt-1">
                                        {formData.bio.length}/280
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'games' && (
                            <div className="space-y-6">
                                <p className="text-sm text-gray-400 mb-4">Select the games you play and add your in-game username so others can find you.</p>

                                <div className="grid grid-cols-1 gap-4">
                                    {UNIQUE_GAMES.map(game => (
                                        <div
                                            key={game}
                                            className={`border rounded-xl p-4 transition-all ${formData.gamesPlaying.includes(game)
                                                ? 'bg-gray-800/80 border-raid-neon/50 shadow-lg shadow-raid-neon/5'
                                                : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${formData.gamesPlaying.includes(game) ? 'bg-raid-neon text-black' : 'bg-gray-700 text-gray-400'}`}>
                                                        <Gamepad2 className="w-5 h-5" />
                                                    </div>
                                                    <span className={`font-bold ${formData.gamesPlaying.includes(game) ? 'text-white' : 'text-gray-400'}`}>
                                                        {game}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleGameToggle(game)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${formData.gamesPlaying.includes(game)
                                                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                        : 'bg-raid-neon/10 text-raid-neon hover:bg-raid-neon/20'
                                                        }`}
                                                >
                                                    {formData.gamesPlaying.includes(game) ? 'Remove' : 'Add Game'}
                                                </button>
                                            </div>

                                            {formData.gamesPlaying.includes(game) && (
                                                <div className="mt-3 pl-12 animate-in fade-in slide-in-from-top-2">
                                                    <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">In-Game Username / ID</label>
                                                    <input
                                                        type="text"
                                                        value={formData.gamerTags[game] || ''}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            gamerTags: { ...prev.gamerTags, [game]: e.target.value }
                                                        }))}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-raid-neon transition-colors"
                                                        placeholder={`Your ${game} username...`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'social' && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400 mb-4">Add links to your social profiles and streaming channels.</p>

                                {SOCIAL_PLATFORMS.map(platform => {
                                    const Icon = platform.icon;
                                    return (
                                        <div key={platform.id} className="relative group">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                <Icon className={`w-5 h-5 ${formData.socialLinks[platform.id] ? platform.color : ''}`} />
                                            </div>

                                            <div className="flex">
                                                {platform.prefix && (
                                                    <div className="flex items-center pl-10 pr-2 bg-gray-800 border-y border-l border-gray-700 rounded-l-lg text-gray-500 text-sm select-none">
                                                        {platform.prefix}
                                                    </div>
                                                )}

                                                <input
                                                    type="text"
                                                    value={formData.socialLinks[platform.id] || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        socialLinks: { ...prev.socialLinks, [platform.id]: e.target.value }
                                                    }))}
                                                    className={`flex-1 bg-gray-900 border border-gray-700 text-white px-3 py-2.5 focus:outline-none focus:border-raid-neon transition-colors ${!platform.prefix ? 'pl-10 rounded-lg' : 'rounded-r-lg border-l-0'
                                                        }`}
                                                    placeholder={platform.placeholder || 'username'}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={runTestUpload}
                            className="px-4 py-2.5 rounded-lg bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 transition-colors text-sm font-bold mr-auto"
                        >
                            Run Diagnostic
                        </button>
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || (activeTab === 'general' && usernameStatus !== 'available')}
                            className="px-6 py-2.5 rounded-lg bg-raid-neon text-black font-bold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                'Save Profile'
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ProfileEditModal;

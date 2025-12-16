import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    User,
    Gamepad2,
    Trophy,
    ThumbsUp,
    Calendar,
    Copy,
    Check,
    ExternalLink,
    Edit3,
    Shield,
    Zap,
    Clock,
    Users
} from 'lucide-react';
import {
    FaYoutube,
    FaTwitch,
    FaTwitter,
    FaFacebook,
    FaDiscord,
    FaTiktok
} from 'react-icons/fa';
import { SiKick, SiRumble } from 'react-icons/si';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import ProfileEditModal from '../profile/ProfileEditModal';

// Social link icons mapping
const SOCIAL_ICONS = {
    youtube: { icon: FaYoutube, color: 'text-red-500', hoverColor: 'hover:text-red-400', url: 'https://youtube.com/' },
    twitch: { icon: FaTwitch, color: 'text-purple-500', hoverColor: 'hover:text-purple-400', url: 'https://twitch.tv/' },
    twitter: { icon: FaTwitter, color: 'text-blue-400', hoverColor: 'hover:text-blue-300', url: 'https://x.com/' },
    facebook: { icon: FaFacebook, color: 'text-blue-600', hoverColor: 'hover:text-blue-500', url: 'https://facebook.com/' },
    discord: { icon: FaDiscord, color: 'text-indigo-400', hoverColor: 'hover:text-indigo-300', url: null }, // Discord is just username
    kick: { icon: SiKick, color: 'text-green-500', hoverColor: 'hover:text-green-400', url: 'https://kick.com/' },
    tiktok: { icon: FaTiktok, color: 'text-pink-500', hoverColor: 'hover:text-pink-400', url: 'https://tiktok.com/@' },
    rumble: { icon: SiRumble, color: 'text-green-400', hoverColor: 'hover:text-green-300', url: 'https://rumble.com/' }
};

// Badge component for achievements
const AchievementBadge = ({ type, count }) => {
    const badges = {
        raids: {
            bronze: { min: 1, label: 'Raid Rookie', color: 'from-amber-700 to-amber-900' },
            silver: { min: 10, label: 'Raid Veteran', color: 'from-gray-400 to-gray-600' },
            gold: { min: 50, label: 'Raid Legend', color: 'from-yellow-400 to-yellow-600' }
        }
    };

    const getBadge = () => {
        if (count >= 50) return badges.raids.gold;
        if (count >= 10) return badges.raids.silver;
        if (count >= 1) return badges.raids.bronze;
        return null;
    };

    const badge = getBadge();
    if (!badge) return null;

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${badge.color} text-white text-xs font-bold shadow-lg`}>
            <Trophy className="w-3 h-3" />
            {badge.label}
        </div>
    );
};

// Stat card component
const StatCard = ({ icon: Icon, label, value, color = 'text-raid-neon' }) => (
    <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
        <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
    </div>
);

// Gamer tag component with copy functionality
const GamerTag = ({ game, tag }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(tag);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 group hover:border-raid-neon/50 transition-colors">
            <div>
                <div className="text-xs text-gray-500 uppercase">{game}</div>
                <div className="text-white font-mono text-sm">{tag}</div>
            </div>
            <button
                onClick={handleCopy}
                className="p-1.5 text-gray-500 hover:text-raid-neon transition-colors"
                title="Copy to clipboard"
            >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
    );
};

// Raid card for the feed
const RaidFeedCard = ({ raid, onView }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 hover:border-raid-neon/30 transition-all cursor-pointer group"
        onClick={onView}
    >
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-raid-neon/20 border border-raid-neon/50 rounded text-xs text-raid-neon">
                        {raid.game}
                    </span>
                    <span className="text-xs text-gray-500">{raid.vibe}</span>
                </div>
                <h4 className="text-white font-medium group-hover:text-raid-neon transition-colors">{raid.raid}</h4>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {raid.squadSize} players
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {raid.phases?.length || 0} phases
                    </span>
                    {raid.upvotes > 0 && (
                        <span className="flex items-center gap-1 text-green-500">
                            <ThumbsUp className="w-3 h-3" />
                            {raid.upvotes}
                        </span>
                    )}
                </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-raid-neon transition-colors" />
        </div>
    </motion.div>
);

const ProfilePage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { profile, loading, error, getProfileByUsername, getUserRaids } = useProfile(user);

    const [raids, setRaids] = useState([]);
    const [raidsLoading, setRaidsLoading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [initializing, setInitializing] = useState(false);

    // Check if viewing own profile
    const isOwnProfile = user && profile && user.uid === profile.id;

    useEffect(() => {
        if (username) {
            loadProfile();
        }
    }, [username]);

    useEffect(() => {
        if (profile?.id) {
            loadRaids();
        }
    }, [profile?.id]);

    const loadProfile = async () => {
        await getProfileByUsername(username);
    };

    const loadRaids = async () => {
        if (!profile?.id) return;
        setRaidsLoading(true);
        const userRaids = await getUserRaids(profile.id, 20);
        setRaids(userRaids);
        setRaidsLoading(false);
    };

    const handleViewRaid = (raid) => {
        // Navigate to share page with raid data
        import('lz-string').then(LZString => {
            const planData = {
                game: raid.game,
                raid: raid.raid,
                squadSize: raid.squadSize,
                vibe: raid.vibe,
                phases: raid.phases,
                title: raid.title
            };
            const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(planData));
            navigate(`/share?data=${compressed}`);
        });
    };

    const handleProfileUpdate = () => {
        loadProfile();
        setShowEditModal(false);
    };

    // Format join date
    const formatJoinDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Render social links
    const renderSocialLinks = () => {
        if (!profile?.socialLinks) return null;

        const links = Object.entries(profile.socialLinks).filter(([_, value]) => value);
        if (links.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-3">
                {links.map(([platform, handle]) => {
                    const social = SOCIAL_ICONS[platform];
                    if (!social) return null;

                    const Icon = social.icon;
                    const url = social.url ? `${social.url}${handle}` : null;

                    if (url) {
                        return (
                            <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2 bg-gray-800 border border-gray-700 rounded-lg ${social.color} ${social.hoverColor} transition-colors`}
                                title={`${platform}: ${handle}`}
                            >
                                <Icon className="w-5 h-5" />
                            </a>
                        );
                    }

                    // For Discord (no URL, just display username)
                    return (
                        <div
                            key={platform}
                            className={`flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg ${social.color}`}
                            title={`Discord: ${handle}`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm text-gray-300">{handle}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-raid-neon border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !profile) {
        // If logged in, assume it's their profile or they want to create one
        // We check if the URL username matches a normalized version of their display name, OR if we just want to offer creation
        const isLikelyOwnProfile = user && (
            username === user.username ||
            username === (user.displayName || '').replace(/\s+/g, '_').toLowerCase() ||
            username === 'user' // Fallback from Navbar
        );

        if (user && isLikelyOwnProfile) {
            return (
                <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col">
                    <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
                    <div className="relative z-10 flex-grow flex flex-col">
                        <Navbar
                            user={user}
                            onLogoutClick={logout}
                            onLoginClick={() => navigate('/')}
                            onSavedClick={() => navigate('/')}
                        />
                        <main className="flex-grow flex items-center justify-center p-4">
                            <div className="text-center max-w-md bg-gray-900/80 border border-gray-700 rounded-2xl p-8 backdrop-blur-sm">
                                <div className="w-20 h-20 bg-raid-neon/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <User className="w-10 h-10 text-raid-neon" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 font-gamer">Setup Your Profile</h2>
                                <p className="text-gray-400 mb-8">
                                    Claim your unique username, add your games, and show off your raid stats to the community!
                                </p>
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="w-full px-6 py-3 bg-raid-neon text-black font-bold rounded-lg hover:bg-raid-neon/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit3 className="w-5 h-5" />
                                    Create Profile
                                </button>
                            </div>
                        </main>
                        <Footer />
                    </div>

                    {/* Edit Profile Modal for Setup */}
                    {showEditModal && (
                        <ProfileEditModal
                            isOpen={showEditModal}
                            onClose={() => setShowEditModal(false)}
                            onSave={handleProfileUpdate}
                        />
                    )}
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col">
                <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
                <div className="relative z-10 flex-grow flex flex-col">
                    <Navbar
                        user={user}
                        onLogoutClick={logout}
                        onLoginClick={() => navigate('/')}
                        onSavedClick={() => navigate('/')}
                    />
                    <main className="flex-grow flex items-center justify-center">
                        <div className="text-center">
                            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-400 mb-2">Profile Not Found</h2>
                            <p className="text-gray-500 mb-6">The user "{username}" doesn't exist or hasn't set up their profile yet.</p>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 bg-raid-neon text-black font-bold rounded-lg hover:bg-raid-neon/90 transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                    </main>
                    <Footer />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-raid-neon selection:text-black flex flex-col">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

            <div className="relative z-10 flex-grow flex flex-col">
                <Navbar
                    user={user}
                    onLogoutClick={logout}
                    onLoginClick={() => navigate('/')}
                    onSavedClick={() => navigate('/')}
                />

                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 md:p-8 mb-8"
                    >
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-raid-neon to-blue-500 p-1">
                                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                                        {profile.avatarUrl ? (
                                            <img
                                                src={profile.avatarUrl}
                                                alt={profile.displayName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-4xl md:text-5xl font-bold text-raid-neon">
                                                {(profile.displayName || profile.username || 'A')[0].toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {profile.isPro && (
                                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1.5 border-2 border-gray-900">
                                        <Zap className="w-4 h-4 text-black" />
                                    </div>
                                )}
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                    <h1 className="text-2xl md:text-3xl font-bold text-white font-gamer">
                                        {profile.displayName || profile.username}
                                    </h1>
                                    {profile.isPro && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded border border-yellow-500/50">
                                            <Zap className="w-3 h-3" /> PRO
                                        </span>
                                    )}
                                    {isOwnProfile && (
                                        <button
                                            onClick={() => setShowEditModal(true)}
                                            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-raid-neon transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            Edit Profile
                                        </button>
                                    )}
                                </div>

                                <p className="text-gray-400 mb-3">@{profile.username}</p>

                                {profile.bio && (
                                    <p className="text-gray-300 mb-4 max-w-xl">{profile.bio}</p>
                                )}

                                {/* Badges */}
                                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                                    <AchievementBadge type="raids" count={profile.raidStats?.totalGenerated || 0} />
                                </div>

                                {/* Social Links */}
                                <div className="flex justify-center md:justify-start">
                                    {renderSocialLinks()}
                                </div>

                                {/* Join Date */}
                                <div className="flex items-center justify-center md:justify-start gap-1 mt-4 text-sm text-gray-500">
                                    <Calendar className="w-4 h-4" />
                                    Joined {formatJoinDate(profile.createdAt)}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-3 gap-4 mb-8"
                    >
                        <StatCard
                            icon={Gamepad2}
                            label="Raids Generated"
                            value={profile.raidStats?.totalGenerated || 0}
                        />
                        <StatCard
                            icon={Shield}
                            label="Shared Plans"
                            value={profile.raidStats?.totalSubmitted || 0}
                            color="text-blue-500"
                        />
                        <StatCard
                            icon={ThumbsUp}
                            label="Total Upvotes"
                            value={profile.raidStats?.totalUpvotes || 0}
                            color="text-green-500"
                        />
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Games & Gamer Tags */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Games Playing */}
                            {profile.gamesPlaying && profile.gamesPlaying.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gray-900/80 border border-gray-700 rounded-xl p-5"
                                >
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Gamepad2 className="w-5 h-5 text-raid-neon" />
                                        Games Playing
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.gamesPlaying.map((game) => (
                                            <span
                                                key={game}
                                                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
                                            >
                                                {game}
                                            </span>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Gamer Tags */}
                            {profile.gamerTags && Object.keys(profile.gamerTags).length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-gray-900/80 border border-gray-700 rounded-xl p-5"
                                >
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <User className="w-5 h-5 text-raid-neon" />
                                        Gamer Tags
                                    </h3>
                                    <div className="space-y-2">
                                        {Object.entries(profile.gamerTags).map(([game, tag]) => (
                                            <GamerTag key={game} game={game} tag={tag} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Right Column: Raid Feed */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:col-span-2"
                        >
                            <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-5">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-raid-neon" />
                                    Raid Plans
                                </h3>

                                {raidsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-raid-neon border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : raids.length > 0 ? (
                                    <div className="space-y-3">
                                        {raids.map((raid) => (
                                            <RaidFeedCard
                                                key={raid.id}
                                                raid={raid}
                                                onView={() => handleViewRaid(raid)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500">No raid plans shared yet</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </main>

                <Footer />
            </div>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <ProfileEditModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleProfileUpdate}
                    currentProfile={profile}
                />
            )}
        </div>
    );
};

export default ProfilePage;

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Trophy, Gamepad2, Users, Clock, ChevronDown, Eye, Trash2, Star, Filter, RefreshCw } from 'lucide-react';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import { useAuth } from '../../hooks/useAuth';
import { useGallery } from '../../hooks/useGallery';
import raidsData from '../../data/raids.json';

const GAMES = ['all', ...new Set(raidsData.map(r => r.game))];

const GalleryCard = ({ submission, onVote, userVote, isOwner, onDelete, onView }) => {
    const voteUp = () => onVote(submission.id, 'up');
    const voteDown = () => onVote(submission.id, 'down');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:border-raid-neon/50 transition-all group"
        >
            {/* Header with game badge */}
            <div className="relative h-32 bg-gradient-to-br from-gray-900 to-gray-800 p-4">
                <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-raid-neon/20 border border-raid-neon/50 rounded text-xs text-raid-neon font-medium">
                        {submission.game}
                    </span>
                </div>
                <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-gray-900/80 rounded text-xs text-gray-400">
                        {submission.vibe}
                    </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-white font-bold text-lg truncate group-hover:text-raid-neon transition-colors">
                        {submission.raid}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                        <Users className="w-3 h-3" />
                        <span>{submission.squadSize} players</span>
                        <span className="mx-1">•</span>
                        <Clock className="w-3 h-3" />
                        <span>{submission.phases?.length || 0} phases</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* User info */}
                <div className="flex items-center justify-between mb-3">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            if (submission.username) {
                                window.location.href = `/profile/${submission.username}`;
                            }
                        }}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-raid-neon to-green-600 flex items-center justify-center text-black font-bold text-sm">
                            {(submission.username || 'A')[0].toUpperCase()}
                        </div>
                        <div>
                            <span className="text-white text-sm font-medium hover:text-raid-neon transition-colors">@{submission.username || 'anonymous'}</span>
                        </div>
                    </div>
                    {isOwner && (
                        <button
                            onClick={() => onDelete(submission.id)}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete submission"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Description */}
                {submission.description && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {submission.description}
                    </p>
                )}

                {/* Voting and actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={voteUp}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${userVote === 'up'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : 'bg-gray-700/50 text-gray-400 hover:bg-green-500/10 hover:text-green-400'
                                }`}
                        >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm font-medium">{submission.upvotes || 0}</span>
                        </button>
                        <button
                            onClick={voteDown}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${userVote === 'down'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                : 'bg-gray-700/50 text-gray-400 hover:bg-red-500/10 hover:text-red-400'
                                }`}
                        >
                            <ThumbsDown className="w-4 h-4" />
                            <span className="text-sm font-medium">{submission.downvotes || 0}</span>
                        </button>
                    </div>

                    <button
                        onClick={() => onView(submission)}
                        className="px-3 py-1.5 bg-raid-neon/10 text-raid-neon rounded-lg hover:bg-raid-neon/20 transition-colors text-sm font-medium"
                    >
                        View Plan
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const FeaturedCard = ({ submission, onView }) => {
    if (!submission) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-2 border-yellow-500/50 rounded-2xl p-6 mb-8"
        >
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-xl font-bold text-yellow-500 font-gamer">MEME RAID OF THE WEEK</h2>
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-yellow-500/20 rounded text-xs text-yellow-400 font-medium">
                            {submission.game}
                        </span>
                        <span className="text-gray-400 text-sm">by @{submission.username}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{submission.raid}</h3>
                    <p className="text-gray-400 mb-4">{submission.description || 'An epic raid plan worth checking out!'}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4 text-green-500" />
                            {submission.upvotes || 0} upvotes
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {submission.squadSize} players
                        </span>
                    </div>
                </div>

                <div className="flex items-center">
                    <button
                        onClick={() => onView(submission)}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg"
                    >
                        View Winning Plan
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const Gallery = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const {
        submissions,
        featuredSubmission,
        loading,
        hasMore,
        userVotes,
        gameFilter,
        vote,
        deleteSubmission,
        loadMore,
        changeGameFilter,
        refresh
    } = useGallery(user);

    const [showFilters, setShowFilters] = useState(false);

    const handleVote = async (submissionId, voteType) => {
        if (!user) {
            alert('Please log in to vote!');
            return;
        }
        try {
            await vote(submissionId, voteType);
        } catch (error) {
            console.error('Vote error:', error);
            alert('Failed to vote. Please try again.');
        }
    };

    const handleDelete = async (submissionId) => {
        if (!confirm('Are you sure you want to delete this submission?')) return;
        try {
            await deleteSubmission(submissionId);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete. ' + error.message);
        }
    };

    const handleView = (submission) => {
        // Navigate to share page with the plan data
        const planData = {
            game: submission.game,
            raid: submission.raid,
            squadSize: submission.squadSize,
            vibe: submission.vibe,
            phases: submission.phases,
            title: submission.title
        };

        // Use LZ-String to compress and encode
        import('lz-string').then(LZString => {
            const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(planData));
            navigate(`/share?data=${compressed}`);
        });
    };

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

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-grow">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-gamer font-bold text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-blue-500 mb-4">
                            COMMUNITY GALLERY
                        </h1>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Explore raid plans shared by the community. Vote for your favorites and get inspired!
                        </p>
                    </div>

                    {/* Featured */}
                    <FeaturedCard submission={featuredSubmission} onView={handleView} />

                    {/* Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:border-gray-600 transition-colors"
                            >
                                <Filter className="w-4 h-4" />
                                Filter: {gameFilter === 'all' ? 'All Games' : gameFilter}
                                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>

                            <button
                                onClick={refresh}
                                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:border-gray-600 hover:text-raid-neon transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="text-sm text-gray-500">
                            {submissions.length} raid plans
                        </div>
                    </div>

                    {/* Filter dropdown */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 overflow-hidden"
                            >
                                <div className="flex flex-wrap gap-2 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    {GAMES.map((game) => (
                                        <button
                                            key={game}
                                            onClick={() => {
                                                changeGameFilter(game);
                                                setShowFilters(false);
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${gameFilter === game
                                                ? 'bg-raid-neon text-black font-medium'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            {game === 'all' ? 'All Games' : game}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Gallery Grid */}
                    {loading && submissions.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-raid-neon border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="text-center py-20">
                            <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-400 mb-2">No raids found</h3>
                            <p className="text-gray-500 mb-6">Be the first to share your epic raid plan!</p>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 bg-raid-neon text-black font-bold rounded-lg hover:bg-raid-neon/90 transition-colors"
                            >
                                Create a Raid Plan
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {submissions.map((submission) => (
                                    <GalleryCard
                                        key={submission.id}
                                        submission={submission}
                                        onVote={handleVote}
                                        userVote={userVotes[submission.id]}
                                        isOwner={user?.uid === submission.userId}
                                        onDelete={handleDelete}
                                        onView={handleView}
                                    />
                                ))}
                            </div>

                            {/* Load More */}
                            {hasMore && (
                                <div className="text-center mt-8">
                                    <button
                                        onClick={loadMore}
                                        disabled={loading}
                                        className="px-6 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg hover:border-raid-neon hover:text-raid-neon transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>

                <Footer />
            </div>
        </div>
    );
};

export default Gallery;

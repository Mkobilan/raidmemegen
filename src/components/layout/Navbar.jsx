import { Menu, X, User, LogOut, Zap, Image } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ user, isPro, onLoginClick, onLogoutClick, onSavedClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            className="flex-shrink-0 cursor-pointer"
                            onClick={() => navigate('/')}
                        >
                            <h1 className="text-2xl font-gamer font-bold text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-blue-500">
                                RAID GEN
                            </h1>
                        </motion.div>

                        {/* Gallery Link */}
                        <button
                            onClick={() => navigate('/gallery')}
                            className={`ml-6 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${location.pathname === '/gallery' ? 'bg-raid-neon/20 text-raid-neon border border-raid-neon/50' : 'text-gray-400 hover:text-raid-neon hover:bg-gray-800'}`}
                        >
                            <Image className="w-4 h-4" />
                            Gallery
                        </button>
                    </div>

                    <div className="hidden md:flex items-center ml-4">
                        {user && (
                            <div className="text-gray-300 flex items-center bg-gray-800 px-3 py-1 rounded-full border border-gray-700 mr-4">
                                <User className="h-4 w-4 mr-2 text-raid-neon" />
                                <span className="font-medium text-sm truncate max-w-[150px]">
                                    {user.displayName || user.email.split('@')[0]}
                                </span>
                                {isPro && (
                                    <span className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded font-bold border border-yellow-500/50 flex items-center">
                                        <Zap className="h-3 w-3 mr-1" /> PRO
                                    </span>
                                )}
                            </div>
                        )}
                        {/* Desktop: If not logged in, show login button. If logged in, actions are in hamburger */}
                        {!user && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onLoginClick}
                                className="bg-raid-neon/10 text-raid-neon border border-raid-neon/50 hover:bg-raid-neon hover:text-black px-4 py-2 rounded-md text-sm font-bold transition-all shadow-lg hover:shadow-raid-neon/50 uppercase tracking-widest font-gamer"
                            >
                                Login / Sign Up
                            </motion.button>
                        )}
                    </div>

                    <div className="flex items-center">
                        {/* Always show hamburger if logged in, or if mobile */}
                        {(user || typeof window !== 'undefined' && window.innerWidth < 768) && (
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none ml-2"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-800 border-b border-gray-700 overflow-hidden absolute top-16 right-0 w-full md:w-64 md:right-4 md:rounded-b-lg md:border-x md:shadow-xl z-50"
                    >
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {user ? (
                                <>
                                    <div className="md:hidden text-gray-300 block px-3 py-2 rounded-md text-base font-medium border-b border-gray-700 mb-2">
                                        Logged in as: <span className="text-raid-neon">{user.displayName || user.email.split('@')[0]}</span>
                                    </div>

                                    <button
                                        onClick={() => { navigate('/gallery'); setIsOpen(false); }}
                                        className="text-gray-300 hover:text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left flex items-center transition-colors"
                                    >
                                        <Image className="h-4 w-4 mr-2 text-raid-neon" /> Community Gallery
                                    </button>

                                    <button
                                        onClick={() => { onSavedClick(); setIsOpen(false); }}
                                        className="text-gray-300 hover:text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left flex items-center transition-colors"
                                    >
                                        <Zap className="h-4 w-4 mr-2 text-raid-neon" /> Saved Raids
                                    </button>

                                    <button
                                        onClick={() => {
                                            // Fallback to username if displayName not set, or a default
                                            const profileUsername = user.username || user.displayName?.replace(/\s+/g, '_').toLowerCase() || 'user';
                                            navigate(`/profile/${profileUsername}`);
                                            setIsOpen(false);
                                        }}
                                        className="text-gray-300 hover:text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium w-full text-left flex items-center transition-colors"
                                    >
                                        <User className="h-4 w-4 mr-2 text-raid-neon" /> My Profile
                                    </button>

                                    <button
                                        onClick={() => { onLogoutClick(); setIsOpen(false); }}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 block px-3 py-2 rounded-md text-base font-medium w-full text-left flex items-center transition-colors"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" /> Logout
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => { onLoginClick(); setIsOpen(false); }}
                                    className="text-raid-neon hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                                >
                                    Login / Sign Up
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav >
    );
};

export default Navbar;

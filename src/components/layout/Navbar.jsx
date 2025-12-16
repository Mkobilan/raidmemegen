import { Menu, X, User, LogOut, Zap } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ user, isPro, onLoginClick, onLogoutClick }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <motion.div
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            className="flex-shrink-0 cursor-pointer"
                        >
                            <h1 className="text-2xl font-gamer font-bold text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-blue-500">
                                RAID GEN
                            </h1>
                        </motion.div>
                    </div>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {user ? (
                                <div className="flex items-center space-x-4">
                                    <div className="text-gray-300 flex items-center bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
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
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={onLogoutClick}
                                        className="text-gray-400 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors hover:bg-red-500/10 hover:text-red-400"
                                    >
                                        <LogOut className="h-4 w-4 mr-1" /> Logout
                                    </motion.button>
                                </div>
                            ) : (
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
                    </div>

                    <div className="-mr-2 flex md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-gray-800 border-b border-gray-700 overflow-hidden"
                    >
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {user ? (
                                <>
                                    <div className="text-gray-300 block px-3 py-2 rounded-md text-base font-medium">
                                        Logged in as: {user.displayName || user.email}
                                    </div>
                                    <button
                                        onClick={() => { onLogoutClick(); setIsOpen(false); }}
                                        className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                                    >
                                        Logout
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
        </nav>
    );
};

export default Navbar;

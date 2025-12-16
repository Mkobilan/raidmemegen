import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useState } from 'react';

const AuthModal = ({
    isOpen,
    onClose,
    isSignup,
    onToggleMode,
    onSubmit,
    error,
    authLoading
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ email, password, displayName });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative bg-gray-900 border border-raid-neon/30 rounded-xl shadow-2xl max-w-md w-full p-8 overflow-hidden"
                >
                    {/* Decorative Glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-raid-neon to-transparent" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-raid-neon/5 rounded-full blur-3xl" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <h2 className="text-3xl font-gamer font-bold text-center mb-2 text-white">
                        {isSignup ? 'INITIATE' : 'ACCESS'}
                    </h2>
                    <p className="text-center text-gray-400 mb-8">
                        {isSignup ? 'Join the squad roster.' : 'Welcome back, operator.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignup && (
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Callsign (Display Name)"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-raid-neon focus:ring-1 focus:ring-raid-neon transition-colors"
                                    required
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-raid-neon focus:ring-1 focus:ring-raid-neon transition-colors"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-raid-neon focus:ring-1 focus:ring-raid-neon transition-colors"
                                required
                            />
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-wipe-red text-sm text-center font-medium bg-wipe-red/10 p-2 rounded"
                            >
                                {error}
                            </motion.p>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={authLoading}
                            type="submit"
                            className="w-full bg-raid-neon text-gray-900 font-bold py-3 rounded-lg shadow-lg shadow-raid-neon/20 hover:shadow-raid-neon/40 transition-all font-gamer uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {authLoading ? 'PROCESSING...' : (isSignup ? 'SIGN UP' : 'LOGIN')}
                        </motion.button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={onToggleMode}
                            className="text-gray-400 hover:text-raid-neon text-sm font-medium transition-colors"
                        >
                            {isSignup ? 'Already have an account? Login' : "Need an account? Sign Up"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthModal;

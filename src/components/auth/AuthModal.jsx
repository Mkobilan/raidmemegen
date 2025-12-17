import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProfile } from '../../hooks/useProfile';

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
    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState(null); // null, true, false
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { checkUsernameAvailable } = useProfile();

    useEffect(() => {
        // Reset state when mode changes or modal opens
        if (isOpen) {
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setUsername('');
            setIsChecking(false);
            setIsAvailable(null);
        }
    }, [isOpen, isSignup]);

    useEffect(() => {
        if (!isSignup || !username || username.length < 3) {
            setIsAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsChecking(true);
            const available = await checkUsernameAvailable(username);
            setIsAvailable(available);
            setIsChecking(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [username, isSignup]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSignup && password !== confirmPassword) {
            // You need to handle error display logic here. 
            // Since error prop is passed from parent, we might need a local error state or pass it up. 
            // Looking at existing code, `error` is a prop. 
            // We'll use a simple alert for mismatch for now or better, use the onSubmit to trigger an error state in parent if possible, but parent handles API errors.
            // Actually, let's use a browser alert or see if we can set the error via parent callback if supported.
            // The parent `handleAuthSubmit` sets `setAuthError(error.message)`.
            // We can simulate an error dispatch or just alert.
            alert("Passwords do not match!");
            return;
        }
        onSubmit({ email, password, username });
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
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => {
                                        // Allow only alphanumeric and underscores
                                        const clean = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                                        setUsername(clean);
                                    }}
                                    className={`w-full bg-gray-800 border text-white pl-10 pr-10 py-3 rounded-lg focus:outline-none transition-colors ${username.length > 0
                                        ? isAvailable
                                            ? 'border-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500'
                                            : isAvailable === false
                                                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                                                : 'border-gray-700 focus:border-raid-neon focus:ring-1 focus:ring-raid-neon'
                                        : 'border-gray-700 focus:border-raid-neon focus:ring-1 focus:ring-raid-neon'
                                        }`}
                                    required
                                    minLength={3}
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    {isChecking ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-white rounded-full"></div>
                                    ) : username.length >= 3 && isAvailable === true ? (
                                        <div className="text-green-500 font-bold text-xs">OK</div>
                                    ) : username.length >= 3 && isAvailable === false ? (
                                        <div className="text-red-500 font-bold text-xs">TAKEN</div>
                                    ) : null}
                                </div>
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
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-12 py-3 rounded-lg focus:outline-none focus:border-raid-neon focus:ring-1 focus:ring-raid-neon transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {isSignup && (
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full bg-gray-800 border text-white pl-10 pr-12 py-3 rounded-lg focus:outline-none transition-colors ${confirmPassword && confirmPassword !== password
                                            ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                                            : 'border-gray-700 focus:border-raid-neon focus:ring-1 focus:ring-raid-neon'
                                        }`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        )}

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-wipe-red text-sm text-center font-medium bg-wipe-red/10 p-2 rounded"
                            >
                                {error}
                            </motion.p>
                        )}

                        {isSignup && username.length >= 3 && isAvailable === false && (
                            <p className="text-red-500 text-xs text-center">Username is already taken.</p>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={authLoading || (isSignup && (!username || !isAvailable))}
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

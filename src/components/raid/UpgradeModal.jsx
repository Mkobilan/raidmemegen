import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Crown } from 'lucide-react';

const UpgradeModal = ({ isOpen, onClose, onUpgrade }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative bg-gray-900 border-2 border-yellow-500/50 rounded-xl shadow-2xl max-w-lg w-full p-8 overflow-hidden"
                >
                    {/* Decorative glow */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-4">
                            <Crown className="w-8 h-8 text-yellow-500" />
                        </div>
                        <h2 className="text-2xl font-gamer font-bold text-white mb-2">
                            LEVEL UP YOUR CHAOS
                        </h2>
                        <p className="text-gray-400">
                            Your <span className="text-yellow-500 font-bold">14-Day Free Trial</span> has expired. Unlock <span className="text-raid-neon font-bold">Unlimited Access</span> to all features and support the raids!
                        </p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="bg-gray-800/50 p-4 rounded-lg flex items-center">
                            <Zap className="text-raid-neon mr-3 w-5 h-5 flex-shrink-0" />
                            <span className="text-gray-200">Unlimited Raid Plans</span>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg flex items-center">
                            <Crown className="text-yellow-500 mr-3 w-5 h-5 flex-shrink-0" />
                            <span className="text-gray-200">Pro Badge on Profile</span>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg flex items-center">
                            <span className="text-2xl mr-3">🚀</span>
                            <span className="text-gray-200">Support Future Updates</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={onUpgrade}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg shadow-lg shadow-yellow-500/20 transition-all font-gamer uppercase tracking-wide"
                        >
                            Upgrade Now ($5/mo)
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm font-medium transition-colors"
                        >
                            Maybe later
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default UpgradeModal;

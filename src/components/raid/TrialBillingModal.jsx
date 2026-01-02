import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Crown, Rocket, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

const TrialBillingModal = ({ isOpen, onClose, onUpgrade }) => {
    if (!isOpen) return null;

    const benefits = [
        { icon: <Zap className="w-5 h-5 text-raid-neon" />, text: "Unlimited Raid Plan Generations" },
        { icon: <Crown className="w-5 h-5 text-yellow-500" />, text: "Exclusive Pro Badge on Profile" },
        { icon: <Rocket className="w-5 h-5 text-blue-400" />, text: "Premium Export Templates (PDF/4K Image)" },
        { icon: <Sparkles className="w-5 h-5 text-purple-400" />, text: "Early Access to New Game Integrations" },
        { icon: <ShieldCheck className="w-5 h-5 text-green-400" />, text: "Support Independent Development" }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-gray-900 border border-raid-neon/30 rounded-3xl shadow-[0_0_50px_rgba(0,255,163,0.15)] max-w-2xl w-full p-8 md:p-12 overflow-hidden"
                >
                    {/* Animated background element */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-raid-neon/10 rounded-full blur-[100px] animate-pulse" />

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-10"
                    >
                        <X size={24} />
                    </button>

                    <div className="relative z-10">
                        <div className="flex justify-center mb-6">
                            <div className="bg-raid-neon/10 p-4 rounded-2xl border border-raid-neon/20">
                                <Rocket className="w-12 h-12 text-raid-neon" />
                            </div>
                        </div>

                        <div className="text-center mb-10">
                            <h2 className="text-3xl md:text-5xl font-gamer font-bold text-white mb-4 tracking-tight">
                                UNLOCK THE <span className="text-raid-neon">PRO</span> EXPERIENCE
                            </h2>
                            <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
                                Start your <span className="text-white font-bold">14-day free trial</span> today.
                                After that, it's just <span className="text-raid-neon font-bold">$5/month</span> to keep the chaos going.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            {benefits.map((benefit, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * idx }}
                                    className="flex items-center gap-3 bg-gray-800/40 p-4 rounded-xl border border-gray-700/50"
                                >
                                    {benefit.icon}
                                    <span className="text-gray-200 font-medium">{benefit.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(0,255,163,0.3)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onUpgrade}
                                className="w-full bg-raid-neon text-black font-gamer font-bold py-5 rounded-2xl shadow-lg transition-all text-xl uppercase tracking-widest"
                            >
                                START 14-DAY FREE TRIAL
                            </motion.button>
                            <p className="text-gray-500 text-sm text-center">
                                Cancel anytime within the first 14 days and you won't be charged.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TrialBillingModal;

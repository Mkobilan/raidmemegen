import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Users, Gamepad2, Send, CheckCircle } from 'lucide-react';

const SubmitGalleryModal = ({ isOpen, onClose, plan, onSubmit }) => {
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen || !plan) return null;

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onSubmit(plan, description);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setDescription('');
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to submit: ' + error.message);
        }
        setSubmitting(false);
    };

    if (success) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="bg-gray-900 border border-raid-neon rounded-2xl p-8 text-center"
                    >
                        <CheckCircle className="w-16 h-16 text-raid-neon mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
                        <p className="text-gray-400">Your raid plan is now in the community gallery!</p>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <Globe className="w-5 h-5 text-blue-400 mr-3" />
                            <h2 className="text-xl font-bold text-white font-gamer">SHARE TO GALLERY</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Plan Preview */}
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center gap-3 mb-3">
                                <Gamepad2 className="w-5 h-5 text-raid-neon" />
                                <span className="text-raid-neon font-medium">{plan.game}</span>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">{plan.raid}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {plan.squadSize} players
                                </span>
                                <span>{plan.phases?.length || 0} phases</span>
                                <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">{plan.vibe}</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">
                                Add a description (optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Tell the community about your raid strategy..."
                                maxLength={280}
                                rows={3}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 resize-none focus:border-blue-500 outline-none"
                            />
                            <div className="text-right text-xs text-gray-500 mt-1">
                                {description.length}/280
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
                            <p>🌐 Your raid plan will be visible to the entire community. Others can vote and view your strategy!</p>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Submit to Gallery
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SubmitGalleryModal;

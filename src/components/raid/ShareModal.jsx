import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Twitter, MessageCircle } from 'lucide-react';

const ShareModal = ({ isOpen, onClose, plan, shareUrl }) => {
    const [copied, setCopied] = useState(false);

    // Reset states when modal closes
    useEffect(() => {
        if (!isOpen) {
            setCopied(false);
        }
    }, [isOpen]);

    if (!isOpen || !plan) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    // Social share URLs - Keep Twitter text SHORT for non-verified users
    const shareToTwitter = () => {
        const text = `🎮 Check out my ${plan.game} raid plan!`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(url, '_blank', 'width=550,height=420');
    };

    const shareToReddit = () => {
        const title = `My ${plan.game} Raid Plan - ${plan.raid}`;
        const url = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`;
        window.open(url, '_blank');
    };

    const shareToDiscord = async () => {
        // Discord doesn't have a direct share URL, so we copy a formatted message
        const discordMessage = `🎮 **${plan.game} Raid Plan: ${plan.raid}**\n\n🔗 ${shareUrl}\n\n_Generated with Raid Meme Generator_`;
        try {
            await navigator.clipboard.writeText(discordMessage);
            alert('Discord-formatted message copied! Paste it in your Discord channel.');
        } catch (error) {
            console.error('Failed to copy Discord message:', error);
        }
    };

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
                    <div className="bg-gradient-to-r from-raid-neon/20 to-green-600/20 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <Share2 className="w-5 h-5 text-raid-neon mr-3" />
                            <h2 className="text-xl font-bold text-white font-gamer">SHARE RAID PLAN</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Plan Preview */}
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                            <div className="text-sm text-gray-400 mb-1">Sharing:</div>
                            <div className="text-white font-semibold">{plan.game} - {plan.raid}</div>
                            <div className="text-gray-500 text-sm">Squad Size: {plan.squadSize} • {plan.phases?.length || 0} Phases</div>
                        </div>

                        {/* Share Link */}
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Share Link</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm font-mono truncate"
                                />
                                <button
                                    onClick={handleCopy}
                                    className={`px-4 py-3 rounded-lg border transition-all flex items-center ${copied
                                            ? 'bg-raid-neon/20 border-raid-neon text-raid-neon'
                                            : 'bg-gray-800 border-gray-700 text-white hover:border-raid-neon'
                                        }`}
                                >
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Social Share Buttons */}
                        <div>
                            <label className="text-sm text-gray-400 mb-3 block">Share to Social</label>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={shareToTwitter}
                                    className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-800 hover:bg-[#1DA1F2]/20 border border-gray-700 hover:border-[#1DA1F2] rounded-lg transition-all group"
                                >
                                    <Twitter className="w-6 h-6 text-gray-400 group-hover:text-[#1DA1F2]" />
                                    <span className="text-xs text-gray-400 group-hover:text-white">Twitter/X</span>
                                </button>
                                <button
                                    onClick={shareToReddit}
                                    className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-800 hover:bg-[#FF4500]/20 border border-gray-700 hover:border-[#FF4500] rounded-lg transition-all group"
                                >
                                    <MessageCircle className="w-6 h-6 text-gray-400 group-hover:text-[#FF4500]" />
                                    <span className="text-xs text-gray-400 group-hover:text-white">Reddit</span>
                                </button>
                                <button
                                    onClick={shareToDiscord}
                                    className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-800 hover:bg-[#5865F2]/20 border border-gray-700 hover:border-[#5865F2] rounded-lg transition-all group"
                                >
                                    <svg className="w-6 h-6 text-gray-400 group-hover:text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                    </svg>
                                    <span className="text-xs text-gray-400 group-hover:text-white">Discord</span>
                                </button>
                            </div>
                        </div>

                        {/* Pro tip */}
                        <div className="text-center text-gray-500 text-sm">
                            💡 Tip: Discord button copies a formatted message for easy pasting!
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ShareModal;

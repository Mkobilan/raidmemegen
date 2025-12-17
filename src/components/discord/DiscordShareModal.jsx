import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Save, Send, Check, AlertTriangle } from 'lucide-react';
import { formatRaidToEmbed, sendToDiscord } from '../../services/discordService';

const DiscordShareModal = ({ isOpen, onClose, raidData }) => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [saveUrl, setSaveUrl] = useState(true);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState('idle'); // 'idle', 'success', 'error'

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('discord_webhook_url');
            if (saved) setWebhookUrl(saved);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!webhookUrl) return;
        setSending(true);
        setStatus('idle');

        try {
            if (saveUrl) {
                localStorage.setItem('discord_webhook_url', webhookUrl);
            }

            const payload = formatRaidToEmbed(raidData);
            await sendToDiscord(webhookUrl, payload);
            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
            }, 2000);
        } catch (error) {
            setStatus('error');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden p-6"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <MessageSquare className="text-[#5865F2]" />
                            Share to Discord
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">
                            Paste your channel's <strong>Webhook URL</strong> below.
                            <br />
                            <span className="text-xs opacity-60">(Channel Settings → Integrations → Webhooks)</span>
                        </p>

                        <input
                            type="password"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-[#5865F2] focus:outline-none transition-colors"
                        />

                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={saveUrl}
                                onChange={(e) => setSaveUrl(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-[#5865F2]"
                            />
                            Save URL for next time
                        </label>

                        {status === 'error' && (
                            <div className="p-3 bg-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Failed to send. Check URL.
                            </div>
                        )}

                        <button
                            onClick={handleSend}
                            disabled={!webhookUrl || sending || status === 'success'}
                            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                                ${status === 'success'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-lg shdaow-[#5865f2]/20'
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            {sending ? (
                                <span className="animate-pulse">Sending...</span>
                            ) : status === 'success' ? (
                                <>
                                    <Check size={20} />
                                    Sent!
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Post to Channel
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DiscordShareModal;

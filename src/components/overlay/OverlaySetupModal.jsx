import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, X, LayoutTemplate, Square, Check, Copy } from 'lucide-react';

const OverlaySetupModal = ({ isOpen, onClose, raidData }) => {
    const [selectedLayout, setSelectedLayout] = useState('carousel'); // 'carousel' | 'frame'
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const generateUrl = () => {
        // Safely structure data
        const dataToEncode = {
            game: raidData.game,
            raid: raidData.raid,
            phases: raidData.phases || [],
            vibe: raidData.vibe
        };
        const jsonString = JSON.stringify(dataToEncode);
        const encodedData = btoa(jsonString);

        const baseUrl = window.location.origin;
        return `${baseUrl}/overlay?data=${encodedData}&layout=${selectedLayout}`;
    };

    const handleLaunch = () => {
        const url = generateUrl();
        window.open(url, '_blank', 'width=1280,height=720,menubar=no,toolbar=no');
    };

    const handleCopy = () => {
        const url = generateUrl();
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                    className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-black/20">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <Monitor className="text-raid-neon" />
                            Streamer Overlay Setup
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8">
                        {/* Layout Selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div
                                onClick={() => setSelectedLayout('carousel')}
                                className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 group relative
                                    ${selectedLayout === 'carousel'
                                        ? 'border-raid-neon bg-raid-neon/5'
                                        : 'border-gray-700 hover:border-gray-600 bg-gray-800'}
                                `}
                            >
                                <div className="h-24 mb-4 bg-gray-900 rounded-lg flex items-center justify-center border border-gray-800 relative overflow-hidden">
                                    {/* Mock Carousel UI */}
                                    <div className="w-16 h-20 bg-gray-700 rounded translate-y-2 opacity-50 -ml-4" />
                                    <div className="w-20 h-24 bg-raid-neon/20 border border-raid-neon rounded z-10 shadow-lg mx-2" />
                                    <div className="w-16 h-20 bg-gray-700 rounded translate-y-2 opacity-50 -mr-4" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-white">Carousel Mode</h3>
                                    {selectedLayout === 'carousel' && <Check className="text-raid-neon" size={16} />}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Cycles cards in the center. Best for intermissions or "Just Chatting".</p>
                            </div>

                            <div
                                onClick={() => setSelectedLayout('frame')}
                                className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 group relative
                                    ${selectedLayout === 'frame'
                                        ? 'border-blue-500 bg-blue-500/5'
                                        : 'border-gray-700 hover:border-gray-600 bg-gray-800'}
                                `}
                            >
                                <div className="h-24 mb-4 bg-gray-900 rounded-lg relative overflow-hidden border border-gray-800">
                                    {/* Mock Frame UI */}
                                    <div className="absolute top-0 left-0 right-0 h-4 bg-gray-800 border-b border-blue-500/30" />
                                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-blue-900/20 border-t border-blue-500/30 flex items-center px-2">
                                        <div className="w-1/2 h-2 bg-blue-500/20 rounded" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-white">Frame Mode</h3>
                                    {selectedLayout === 'frame' && <Check className="text-blue-500" size={16} />}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Edge bars overlay. Keeps center clear for gameplay.</p>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-black/40 rounded-lg p-4 mb-6 border border-gray-800">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">How to use in OBS / Streamlabs</h4>
                            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside font-mono">
                                <li>Create a <span className="text-raid-neon">Browser Source</span></li>
                                <li>Paste the URL (generated below)</li>
                                <li>Set Width: <span className="text-white">1280</span> / Height: <span className="text-white">720</span></li>
                                <li>Enable "Shutdown source when not visible" if needed</li>
                            </ol>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleCopy}
                                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-gray-700"
                            >
                                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                {copied ? 'Copied!' : 'Copy URL'}
                            </button>
                            <button
                                onClick={handleLaunch}
                                className="flex-[2] py-3 bg-raid-neon hover:bg-raid-neon/90 text-black rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,51,102,0.4)]"
                            >
                                <Monitor size={18} />
                                Launch Overlay
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default OverlaySetupModal;

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Palette, Type, Volume2, Trophy, Skull, Play, Image as ImageIcon, Gamepad2 } from 'lucide-react';

const OVERLAY_TYPES = [
    { id: 'raid-start', name: 'Raid Starting', icon: Play, defaultText: 'RAID STARTING', color: '#00ff88' },
    { id: 'wipe', name: 'Wipe Alert', icon: Skull, defaultText: 'SQUAD WIPED', color: '#ff4444' },
    { id: 'victory', name: 'Victory', icon: Trophy, defaultText: 'RAID COMPLETE', color: '#ffd700' },
    { id: 'phase', name: 'Phase Marker', icon: Type, defaultText: 'PHASE 1', color: '#00bfff' },
    { id: 'custom', name: 'Custom Text', icon: Palette, defaultText: 'YOUR TEXT', color: '#ff00ff' },
];

const GAME_THEMES = [
    { id: 'destiny2', name: 'Destiny 2', primaryColor: '#f5a623', secondaryColor: '#1a1a2e', fontStyle: 'bold' },
    { id: 'wow', name: 'World of Warcraft', primaryColor: '#ff8000', secondaryColor: '#1a0a0a', fontStyle: 'gothic' },
    { id: 'ffxiv', name: 'Final Fantasy XIV', primaryColor: '#c9a227', secondaryColor: '#0a0a1a', fontStyle: 'elegant' },
    { id: 'helldivers', name: 'Helldivers 2', primaryColor: '#ffd700', secondaryColor: '#1a1a0a', fontStyle: 'military' },
    { id: 'custom', name: 'Custom', primaryColor: '#00ff88', secondaryColor: '#0a1a0f', fontStyle: 'bold' },
];

const OverlayCreator = ({ isOpen, onClose, plan }) => {
    const canvasRef = useRef(null);
    const [overlayType, setOverlayType] = useState('raid-start');
    const [customText, setCustomText] = useState('');
    const [gameTheme, setGameTheme] = useState('destiny2');
    const [customColor, setCustomColor] = useState('#00ff88');
    const [fontSize, setFontSize] = useState(64);
    const [showBorder, setShowBorder] = useState(true);
    const [showGlow, setShowGlow] = useState(true);

    const selectedOverlay = OVERLAY_TYPES.find(o => o.id === overlayType);
    const selectedTheme = GAME_THEMES.find(t => t.id === gameTheme);

    // Draw overlay on canvas
    const drawOverlay = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear with transparency
        ctx.clearRect(0, 0, width, height);

        // Get colors - Game theme affects border/accent color
        const themeColor = gameTheme === 'custom' ? customColor : selectedTheme?.primaryColor || '#00ff88';
        const themeBgColor = gameTheme === 'custom' ? '#0a1a0f' : selectedTheme?.secondaryColor || '#1a1a2e';

        // Text color is based on overlay type, OR theme color if using custom text
        const textColor = overlayType === 'custom' ? themeColor : selectedOverlay?.color || themeColor;

        // Border/accent uses theme color
        const accentColor = themeColor;

        // Helper to convert hex to rgba
        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // Background (semi-transparent for OBS) - uses theme secondary color
        const bgGradient = ctx.createLinearGradient(0, 0, width, height);
        bgGradient.addColorStop(0, hexToRgba(themeBgColor, 0.95));
        bgGradient.addColorStop(1, hexToRgba(themeBgColor, 0.85));

        // Rounded rectangle background
        const radius = 20;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(width - radius, 0);
        ctx.quadraticCurveTo(width, 0, width, radius);
        ctx.lineTo(width, height - radius);
        ctx.quadraticCurveTo(width, height, width - radius, height);
        ctx.lineTo(radius, height);
        ctx.quadraticCurveTo(0, height, 0, height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();

        ctx.fillStyle = bgGradient;
        ctx.fill();

        // Border - uses theme accent color
        if (showBorder) {
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Glow effect
        if (showGlow) {
            ctx.shadowColor = textColor;
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Text
        const displayText = overlayType === 'custom' ? (customText || 'YOUR TEXT') : selectedOverlay?.defaultText;

        ctx.font = `bold ${fontSize}px 'Orbitron', 'Arial Black', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text stroke for better visibility
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 6;
        ctx.strokeText(displayText, width / 2, height / 2);

        // Text fill
        ctx.fillStyle = textColor;
        ctx.fillText(displayText, width / 2, height / 2);

        // Reset shadow
        ctx.shadowBlur = 0;

        // Game/Raid subtitle
        if (plan?.game && plan?.raid) {
            ctx.font = 'bold 24px Arial, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(`${plan.game} • ${plan.raid}`, width / 2, height / 2 + fontSize / 2 + 30);
        }

        // Decorative lines - uses theme accent color
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;

        // Top line
        ctx.beginPath();
        ctx.moveTo(50, 30);
        ctx.lineTo(width - 50, 30);
        ctx.stroke();

        // Bottom line
        ctx.beginPath();
        ctx.moveTo(50, height - 30);
        ctx.lineTo(width - 50, height - 30);
        ctx.stroke();

        ctx.globalAlpha = 1;

    }, [overlayType, customText, gameTheme, customColor, fontSize, showBorder, showGlow, plan, selectedOverlay, selectedTheme]);

    // Redraw when settings change
    useEffect(() => {
        if (isOpen) {
            drawOverlay();
        }
    }, [isOpen, drawOverlay]);

    // Download as PNG
    const downloadOverlay = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const link = document.createElement('a');
        const overlayName = selectedOverlay?.name.toLowerCase().replace(/\s+/g, '-') || 'overlay';
        link.download = `raid-overlay-${overlayName}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    if (!isOpen) return null;

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
                    className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-600/20 border-b border-gray-700 px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center">
                            <ImageIcon className="w-5 h-5 text-purple-400 mr-3" />
                            <h2 className="text-xl font-bold text-white font-gamer">OVERLAY CREATOR</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                        {/* Controls Panel */}
                        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-700 p-4 space-y-4 overflow-y-auto">
                            {/* Overlay Type */}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Overlay Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {OVERLAY_TYPES.map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setOverlayType(type.id)}
                                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-sm ${overlayType === type.id
                                                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                                : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            <type.icon className="w-4 h-4" />
                                            <span className="truncate">{type.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Text (if custom type) */}
                            {overlayType === 'custom' && (
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Custom Text</label>
                                    <input
                                        type="text"
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value.toUpperCase())}
                                        placeholder="YOUR TEXT"
                                        maxLength={30}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                            )}

                            {/* Game Theme */}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block flex items-center">
                                    <Gamepad2 className="w-4 h-4 mr-2" /> Game Theme
                                </label>
                                <select
                                    value={gameTheme}
                                    onChange={(e) => setGameTheme(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                                >
                                    {GAME_THEMES.map((theme) => (
                                        <option key={theme.id} value={theme.id}>{theme.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Custom Color (if custom theme or custom overlay) */}
                            {(gameTheme === 'custom' || overlayType === 'custom') && (
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block flex items-center">
                                        <Palette className="w-4 h-4 mr-2" /> Custom Color
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={customColor}
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            className="w-12 h-10 rounded border border-gray-700 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={customColor}
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Font Size */}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block flex items-center">
                                    <Type className="w-4 h-4 mr-2" /> Font Size: {fontSize}px
                                </label>
                                <input
                                    type="range"
                                    min="32"
                                    max="96"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="w-full accent-purple-500"
                                />
                            </div>

                            {/* Style Options */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showBorder}
                                        onChange={(e) => setShowBorder(e.target.checked)}
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 accent-purple-500"
                                    />
                                    <span className="text-sm text-gray-300">Show Border</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showGlow}
                                        onChange={(e) => setShowGlow(e.target.checked)}
                                        className="w-4 h-4 rounded bg-gray-800 border-gray-700 accent-purple-500"
                                    />
                                    <span className="text-sm text-gray-300">Show Glow Effect</span>
                                </label>
                            </div>
                        </div>

                        {/* Preview Panel */}
                        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-gray-950 overflow-auto">
                            <div className="mb-4 text-sm text-gray-500">Preview (OBS-compatible with transparency)</div>
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={200}
                                className="max-w-full h-auto shadow-2xl rounded-xl"
                                style={{ background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #2a2a2a 0% 50%) 50% / 20px 20px' }}
                            />
                            <div className="mt-6">
                                <button
                                    onClick={downloadOverlay}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg shadow-lg transition-all"
                                >
                                    <Download className="w-5 h-5" />
                                    Download PNG (Transparent)
                                </button>
                            </div>
                            <p className="mt-4 text-xs text-gray-500 text-center max-w-md">
                                💡 Add this overlay to OBS as an Image Source. The background will be transparent,
                                showing only the text and effects over your gameplay.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OverlayCreator;

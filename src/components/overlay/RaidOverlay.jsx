import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sword, Heart, Zap, Skull, AlertTriangle, Monitor } from 'lucide-react';

/* 
  OBS Overlay Component
  - Expects `?data=<base64_json>` in URL
  - Displays raid phases in a carousel or high-vis list
  - Green Screen / Transparent Toggle
*/

const RaidOverlay = () => {
    const location = useLocation();
    const [raidData, setRaidData] = useState(null);
    const [layout, setLayout] = useState('carousel');
    const [activePhaseIndex, setActivePhaseIndex] = useState(0);
    const [isGreenScreen, setIsGreenScreen] = useState(false);
    const [isControlsVisible, setIsControlsVisible] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const encodedData = params.get('data');
        const layoutParam = params.get('layout'); // 'carousel' or 'frame'

        if (layoutParam) setLayout(layoutParam);

        if (encodedData) {
            try {
                // Decode Base64 -> string -> JSON
                const jsonString = atob(encodedData);
                const parsedData = JSON.parse(jsonString);
                setRaidData(parsedData);
            } catch (err) {
                console.error("Failed to parse overlay data:", err);
            }
        }

        // Auto-hide controls after 3 seconds
        const timer = setTimeout(() => setIsControlsVisible(false), 3000);
        return () => clearTimeout(timer);
    }, [location]);

    useEffect(() => {
        if (!raidData) return;
        // Auto-cycle phases every 10 seconds? Or just let it stay static list?
        // Let's do a slow cycle for dynamic feel, but usually Streamers want static info or control.
        // For now, let's just cycle.
        const cycleTimer = setInterval(() => {
            setActivePhaseIndex(prev => (prev + 1) % raidData.phases.length);
        }, 8000);

        return () => clearInterval(cycleTimer);
    }, [raidData]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'g') setIsGreenScreen(prev => !prev);
            if (e.key === 'h') setIsControlsVisible(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    if (!raidData || !raidData.phases || raidData.phases.length === 0) return <div className="text-white text-4xl font-bold p-10 shadow-black drop-shadow-lg">WAITING FOR DATA...</div>;

    const currentPhase = raidData.phases[activePhaseIndex];
    if (!currentPhase) return <div className="text-white text-xl">Loading phase...</div>;

    // === FRAME LAYOUT RENDER ===
    if (layout === 'frame') {
        return (
            <div
                className={`w-screen h-screen overflow-hidden flex flex-col justify-between transition-colors duration-300 relative
                    ${isGreenScreen ? 'bg-green-500' : 'bg-transparent'}
                `}
                onMouseMove={() => setIsControlsVisible(true)}
            >
                {/* IDLE/CONTROLS HINT */}
                <AnimatePresence>
                    {isControlsVisible && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-20 right-4 bg-black/80 text-white p-4 rounded-xl backdrop-blur-md border border-white/20 z-50 pointer-events-none"
                        >
                            <h3 className="font-bold text-lg mb-2">Overlay Controls</h3>
                            <p className="text-sm">G: Green Screen | H: Hide GUI</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* TOP BAR */}
                <div className="w-full bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
                            {raidData.game}
                            <span className="text-raid-neon ml-2 text-xl font-mono opacity-80">// {raidData.raid}</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-white/60 font-mono text-sm uppercase tracking-widest hidden md:block">
                            raidmemegen.vercel.app
                        </span>
                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${raidData.vibe === 'Serious Strat' ? 'bg-blue-500/20 text-blue-400' : 'bg-raid-neon/20 text-raid-neon'}`}>
                            {raidData.vibe}
                        </div>
                    </div>
                </div>

                {/* BOTTOM BAR */}
                <div className="w-full bg-black/90 backdrop-blur-md border-t-4 border-raid-neon p-6 pb-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activePhaseIndex}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                        >
                            {/* Phase Info */}
                            <div className="flex-1">
                                <h2 className="text-3xl font-black text-white uppercase italic tracking-wider mb-1">
                                    {currentPhase.name}
                                </h2>
                                <p className={`text-lg italic font-medium
                                    ${currentPhase.isSerious ? 'text-blue-300' : 'text-gray-300'}
                                `}>
                                    {currentPhase.isSerious ? `Tip: ${currentPhase.quip}` : `"${currentPhase.quip}"`}
                                </p>
                            </div>

                            {/* Roles Ticker */}
                            <div className="flex flex-wrap gap-3 justify-end max-w-2xl">
                                {(currentPhase.roles || []).map((role, idx) => (
                                    <div key={idx} className="bg-white/10 px-3 py-1 rounded text-sm text-white font-mono border border-white/5">
                                        {role}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // === CAROUSEL LAYOUT RENDER (Enhanced) ===
    return (
        <div
            className={`w-screen h-screen overflow-hidden flex items-end pb-12 transition-colors duration-300
                ${isGreenScreen ? 'bg-green-500' : 'bg-transparent'}
            `}
            onMouseMove={() => setIsControlsVisible(true)}
        >
            {/* Control Hint (Fades out) */}
            <AnimatePresence>
                {isControlsVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-xl backdrop-blur-md border border-white/20 z-50 pointer-events-none"
                    >
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <Monitor size={20} className="text-raid-neon" />
                            Overlay Controls
                        </h3>
                        <p className="text-sm opacity-80">Press <span className="font-mono bg-white/20 px-1 rounded">G</span> for Green Screen</p>
                        <p className="text-sm opacity-80">Press <span className="font-mono bg-white/20 px-1 rounded">H</span> to Hide this manually</p>
                        <p className="text-xs text-gray-400 mt-2">Auto-hides in 3s</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area - Designing for "Bottom Third" style or "Side Bar" */}
            <div className="w-full max-w-4xl mx-auto p-6 relative">
                {/* Current Phase Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activePhaseIndex}
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "backOut" }}
                        className="bg-black/80 backdrop-blur-md border-l-4 border-raid-neon rounded-r-xl p-6 shadow-2xl relative overflow-hidden"
                    >
                        {/* Background Splashed Text for depth */}
                        <div className="absolute -right-10 -top-10 text-9xl font-black text-white/5 select-none pointer-events-none uppercase">
                            {raidData.game.split(' ')[0]}
                        </div>

                        {/* Top Bar: Game & Raid Info */}
                        <div className="flex items-center gap-3 mb-2 opacity-80 justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-raid-neon font-mono text-sm tracking-[0.2em] uppercase">
                                    {raidData.game} // {raidData.raid}
                                </span>
                                <div className="h-4 w-px bg-white/20" />
                                <span className="text-white/60 font-mono text-sm">
                                    Phase {activePhaseIndex + 1} / {raidData.phases.length}
                                </span>
                            </div>
                            <span className="text-white/30 text-xs font-mono tracking-widest uppercase">
                                raidmemegen.vercel.app
                            </span>
                        </div>

                        {/* Phase Name */}
                        <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4 drop-shadow-[0_2px_10px_rgba(255,51,102,0.5)]">
                            {currentPhase.name}
                        </h1>

                        {/* The Meat: Serious Tip or Meme */}
                        <div className={`p-4 rounded-lg mb-4 ${currentPhase.isSerious ? 'bg-blue-900/40 border border-blue-500/30' : 'bg-raid-neon/10 border border-raid-neon/20'}`}>
                            {currentPhase.isSerious ? (
                                <div className="flex gap-4">
                                    <Sword className="text-blue-400 shrink-0 mt-1" size={28} />
                                    <div>
                                        <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">TACTICAL INTEL</p>
                                        <p className="text-white text-lg md:text-xl font-medium leading-snug shadow-black drop-shadow-md">
                                            {currentPhase.quip}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <span className="text-3xl">🤡</span>
                                    <div>
                                        <p className="text-raid-neon text-xs font-bold tracking-widest uppercase mb-1">MEME ALERT</p>
                                        <p className="text-white text-lg md:text-xl italic leading-snug shadow-black drop-shadow-md">
                                            "{currentPhase.quip}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Roles List - Horizontal Scroller if needed, or just grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 pt-4 border-t border-white/10">
                            {(currentPhase.roles || []).map((role, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-white/90">
                                    <div className="w-1.5 h-1.5 rounded-full bg-raid-neon shadow-[0_0_8px_#ff3366]" />
                                    <span className="font-mono text-sm font-semibold truncate">{role}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 mt-4">
                    {raidData.phases.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-2 rounded-full transition-all duration-300 shadow-lg
                                ${idx === activePhaseIndex ? 'w-8 bg-raid-neon' : 'w-2 bg-white/30'}
                            `}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RaidOverlay;

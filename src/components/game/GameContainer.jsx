import React, { useEffect, useRef, useState } from 'react';
import StartGame from '../../game/main';

const GameContainer = ({ plan, onClose }) => {
    const gameContainerRef = useRef(null);
    const gameRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    const [isGameLoading, setIsGameLoading] = useState(true);

    useEffect(() => {
        if (gameRef.current) return;

        if (gameContainerRef.current && plan) {
            gameRef.current = StartGame(gameContainerRef.current.id, plan, onClose);
            setIsGameLoading(false);
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, [plan]);

    // Handle Escape Key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-4xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 relative">
                    <h2 className="text-2xl font-bold text-accent-400 font-display">
                        Mini-Sim: {plan?.game}
                    </h2>

                    {/* Header Controls */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-red-600 rounded-full transition-colors"
                            title="Close (ESC)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Game Container */}
                <div className="relative">
                    {isGameLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900 rounded-lg">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-raid-neon border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-raid-neon font-gamer animate-pulse">BOOTING SIMULATION...</p>
                            </div>
                        </div>
                    )}
                    <div
                        id={`phaser-game-${plan?.id || 'default'}`}
                        ref={gameContainerRef}
                        className="overflow-hidden border-4 rounded-lg shadow-2xl border-slate-700"
                        style={{ width: '800px', height: '600px', margin: '0 auto' }}
                    >
                        {/* Phaser injects canvas here */}
                    </div>
                </div>

                {/* Controls Hint */}
                <div className="mt-4 text-center text-slate-400">
                    <p>Controls: <span className="font-bold text-white">WASD</span> or <span className="font-bold text-white">Arrow Keys</span> to Move</p>
                    <p className="text-sm">Avoid Red Hazards. Collect Green Objectives.</p>
                </div>
            </div>
        </div>
    );
};

export default GameContainer;

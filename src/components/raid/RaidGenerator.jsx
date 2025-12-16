import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import raidsData from '../../data/raids.json';
import { Gamepad2, Users, Wand2, Zap } from 'lucide-react';

const RaidGenerator = ({
    user,
    onGenerate,
    loading,
    gensCount,
    isPro,
    onShowAuth
}) => {
    const [game, setGame] = useState('');
    const [raid, setRaid] = useState('');
    const [squadSize, setSquadSize] = useState(6);
    const [vibe, setVibe] = useState('Meme Chaos');

    const availableRaids = game ? raidsData.find(g => g.game === game)?.phases ? [] : raidsData.filter(r => r.game === game).map(r => r.raid) : []; // Fix logic: json structure is flat list of raids, each has 'game' field.
    // Wait, raids.json: [ { game: "Destiny 2", raid: "Last Wish", ... }, ... ]
    // So filtering by game is correct.

    const uniqueGames = [...new Set(raidsData.map(r => r.game))];
    const raidsForGame = game ? raidsData.filter(r => r.game === game) : [];

    const handleGenerate = () => {
        if (!user) {
            onShowAuth();
            return;
        }
        onGenerate({ game, raid, squadSize, vibe });
    };

    return (
        <Card className="max-w-4xl mx-auto" title="Mission Parameters">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Game Selection */}
                <div className="space-y-2">
                    <label className="text-gray-400 font-medium flex items-center">
                        <Gamepad2 className="w-4 h-4 mr-2 text-raid-neon" /> Target Game
                    </label>
                    <select
                        value={game}
                        onChange={(e) => { setGame(e.target.value); setRaid(''); }}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-raid-neon focus:ring-1 focus:ring-raid-neon outline-none transition-all"
                    >
                        <option value="">Select Game</option>
                        {uniqueGames.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>

                {/* Raid Selection */}
                <div className="space-y-2">
                    <label className="text-gray-400 font-medium flex items-center">
                        <div className="w-4 h-4 mr-2 rounded-full border border-raid-neon flex items-center justify-center text-[10px] text-raid-neon">R</div>
                        Operation (Raid)
                    </label>
                    <select
                        value={raid}
                        onChange={(e) => setRaid(e.target.value)}
                        disabled={!game}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-raid-neon focus:ring-1 focus:ring-raid-neon outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">{game ? 'Select Raid' : 'Select Game First'}</option>
                        {raidsForGame.map(r => (
                            <option key={r.raid} value={r.raid}>{r.raid}</option>
                        ))}
                    </select>
                </div>

                {/* Squad Size */}
                <div className="space-y-2">
                    <label className="text-gray-400 font-medium flex items-center">
                        <Users className="w-4 h-4 mr-2 text-raid-neon" /> Squad Size
                    </label>
                    <input
                        type="number"
                        min="3"
                        max="12"
                        value={squadSize}
                        onChange={(e) => setSquadSize(parseInt(e.target.value) || 6)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-raid-neon focus:ring-1 focus:ring-raid-neon outline-none transition-all"
                    />
                </div>

                {/* Vibe */}
                <div className="space-y-2">
                    <label className="text-gray-400 font-medium flex items-center">
                        <Zap className="w-4 h-4 mr-2 text-raid-neon" /> Protocol Vibe
                    </label>
                    <select
                        value={vibe}
                        onChange={(e) => setVibe(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-raid-neon focus:ring-1 focus:ring-raid-neon outline-none transition-all"
                    >
                        <option value="Meme Chaos">Meme Chaos (Default)</option>
                        <option value="Serious Strat">Serious Strat</option>
                    </select>
                </div>

            </div>

            <div className="mt-8">
                <button
                    onClick={handleGenerate}
                    disabled={loading || !raid}
                    className="w-full bg-gradient-to-r from-raid-neon to-green-600 text-black font-bold py-4 rounded-lg shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] transform hover:scale-[1.01] transition-all font-gamer text-xl tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center relative overflow-hidden group"
                >
                    <span className="relative z-10 flex items-center">
                        {loading ? <Wand2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                        {loading ? 'GENERATING...' : 'INITIATE RAID PLAN'}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 transform skew-y-12" />
                </button>

                {!isPro && user && (
                    <div className="mt-3 flex justify-center">
                        <span className={`text-sm font-medium px-3 py-1 rounded-full border ${gensCount >= 3 ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-gray-600 text-gray-400'}`}>
                            Daily Gens: {gensCount} / 3
                        </span>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default RaidGenerator;

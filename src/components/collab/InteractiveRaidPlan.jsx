
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, User as UserIcon, Shield, Sword, Heart, Save, Lock, Unlock } from 'lucide-react';
import Card from '../ui/Card';
import { supabase } from '../../supabaseClient';
import { useRealtimeRoom } from '../../hooks/useRealtimeRoom';
import { useAuth } from '../../hooks/useAuth';
import raidsData from '../../data/raids.json';
import localMemes from '../../data/memes.json';

const InteractiveRaidPlan = () => {
    const { roomState: plan, updatePlan, participants, currentUser } = useRealtimeRoom();
    const [rerolling, setRerolling] = useState(null); // Index of phase being rerolled
    const [saving, setSaving] = useState(false);

    if (!plan) return (
        <div className="flex items-center justify-center h-64 text-gray-400 font-gamer animate-pulse">
            WAITING FOR HOST TO INITIATE PROTOCOL...
        </div>
    );

    const handleSave = async () => {
        if (!currentUser) {
            alert("Login required to save missions!");
            return;
        }
        setSaving(true);
        try {
            // 1. Save to Gallery
            const submission = {
                user_id: currentUser.id,
                game: plan.game,
                raid: plan.raid,
                squad_size: plan.squadSize,
                vibe: plan.vibe,
                phases: plan.phases,
                title: plan.title,
                description: 'Generated in War Room'
            };

            const { error: saveError } = await supabase
                .from('gallery_posts')
                .insert([submission]);

            if (saveError) throw saveError;

            // 2. Update User Stats
            const { data: profile } = await supabase
                .from('profiles')
                .select('raid_stats')
                .eq('id', currentUser.id)
                .single();

            if (profile) {
                const currentStats = profile.raid_stats || { totalGenerated: 0, totalSubmitted: 0, totalUpvotes: 0 };
                const newStats = {
                    ...currentStats,
                    totalSubmitted: (currentStats.totalSubmitted || 0) + 1
                };
                await supabase
                    .from('profiles')
                    .update({ raid_stats: newStats })
                    .eq('id', currentUser.id);
            }

            alert("Mission Saved to Profile!");
        } catch (err) {
            console.error('Save error:', err);
            alert("Failed to save mission. Check console.");
        } finally {
            setSaving(false);
        }
    };

    // Helper to generate a single phase (Simplified version of useRaidGen logic)
    const generatePhase = (phaseIndex, currentPhaseName) => {
        const raidData = raidsData.find(r => r.raid === plan.raid);
        if (!raidData) return null;

        const phaseData = raidData.phases.find(p => p.name === currentPhaseName);
        if (!phaseData) return null;

        const seed = Math.random();
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        const role = pick(phaseData.roles);
        const action = pick(phaseData.actions);
        const target = pick(phaseData.targets);
        const hazard = pick(phaseData.hazards);
        const quip = pick(phaseData.quips);

        const text = phaseData.baseTemplate
            .replace('[role]', role)
            .replace('[action]', action)
            .replace('[target]', target)
            .replace('[hazard]', hazard)
            .replace('[quip]', quip);

        // Meme Logic: ALWAYS Keep existing (Per user request)
        const meme = plan.phases[phaseIndex].meme;

        return {
            ...plan.phases[phaseIndex], // Keep existing data like name
            text,
            quip,
            meme,
            lastRerollBy: currentUser?.user_metadata?.username
        };
    };

    const handleReroll = async (index, phaseName) => {
        setRerolling(index);

        // Simulate delay for effect
        await new Promise(r => setTimeout(r, 800));

        const newPhase = generatePhase(index, phaseName);
        if (!newPhase) {
            setRerolling(null);
            return;
        }

        const newPhases = [...plan.phases];
        newPhases[index] = newPhase;

        const newPlan = { ...plan, phases: newPhases };
        const { error } = await updatePlan(newPlan);

        if (error) {
            alert("Failed to sync reroll with team. You might not have permission or are offline.");
            // Optional: Revert local state here if strict consistency needed
        }
        setRerolling(null);
    };

    // Role Slot Assignments (Simple click to assign logic for now, or drag later if complex)
    // Let's do a simple "Claim Spot" interaction relative to the phase
    // Actually, "Role Assignment" usually means assigning people to specific jobs.
    // Let's add a "Squad Roles" section to each phase.

    const toggleRole = async (phaseIndex, roleSlot) => {
        // Simple toggle: If empty, I take it. If I have it, I leave it.
        // If someone else has it, maybe steal it? "Chaos mode" says yes.

        const newPhases = [...plan.phases];
        const phase = newPhases[phaseIndex];

        // Initialize assignments if missing
        if (!phase.assignments) phase.assignments = {};

        const currentAssignee = phase.assignments[roleSlot];

        if (currentAssignee === currentUser?.id) {
            // I am leaving
            delete phase.assignments[roleSlot];
        } else {
            // I am taking (stealing)
            phase.assignments[roleSlot] = currentUser?.id;
        }

        await updatePlan({ ...plan, phases: newPhases });
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="text-center relative">
                <h2 className="text-3xl font-gamer text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-white">
                    {plan.title}
                </h2>
                <div className="flex items-center justify-center gap-4 mt-2">
                    <p className="text-gray-400 text-sm font-mono">
                        OPERATION: {plan.game.toUpperCase()} // {plan.raid.toUpperCase()} // MODE: {plan.vibe.toUpperCase()}
                    </p>

                    {/* Visual Lock Toggle (Removed) */}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-600 rounded hover:bg-raid-neon hover:text-black hover:border-raid-neon transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {saving ? 'Saving...' : 'Save Mission'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {plan.phases.map((phase, idx) => (
                    <motion.div
                        key={`${idx}-${phase.text.substring(0, 10)}`} // Force re-render on text change for visual pop
                        initial={{ opacity: 0.8, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden relative group"
                    >
                        {/* Reroll Overlay */}
                        {rerolling === idx && (
                            <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center backdrop-blur-sm">
                                <RefreshCw className="w-12 h-12 text-raid-neon animate-spin" />
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row h-full">
                            {/* Visual & Meme */}
                            <div className="md:w-1/3 h-48 md:h-auto relative">
                                <img
                                    src={phase.meme}
                                    alt="Phase Visual"
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-gray-900/50 md:to-gray-900" />

                                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                                    <span className="bg-black/60 text-raid-neon px-2 py-1 rounded text-xs font-mono border border-raid-neon/30">
                                        PHASE {idx + 1}
                                    </span>
                                    <button
                                        onClick={() => handleReroll(idx, phase.name)}
                                        className="bg-gray-800/80 hover:bg-raid-neon hover:text-black text-white p-2 rounded-full transition-colors border border-gray-600 backdrop-blur-sm"
                                        title="Reroll this phase"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Intel & Assignments */}
                            <div className="p-6 md:w-2/3 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">{phase.name}</h3>
                                    <p className="text-gray-300 text-lg leading-relaxed mb-4 font-light">
                                        {phase.text}
                                    </p>
                                    <p className="text-sm text-gray-500 italic border-l-2 border-raid-neon/50 pl-3">
                                        "{phase.quip}"
                                    </p>
                                </div>

                                {/* Dynamic Assignments Section */}
                                <div className="mt-6 pt-4 border-t border-gray-800">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                                        <Shield className="w-3 h-3 mr-2" /> VOLUNTEERS REQUIRED
                                    </h4>

                                    <div className="flex flex-wrap gap-2">
                                        {['Runner', 'Defender', 'Boss Bait', 'Meme Lord'].map((role) => {
                                            const assignedUserId = phase.assignments?.[role];
                                            // Find participant info for this ID
                                            // Note: participants is Key->PresenceObj. But we need to look up by user_id actually?
                                            // Presence keys are usually user_ids based on how we set tracking.

                                            // Actually, Supabase Presence state is { 'user_id': [ { username: '...', ... } ] }
                                            // So assignedUserId checks if that key exists.

                                            // Let's find the username from the presence state
                                            const assignedUser = assignedUserId ?
                                                Object.values(participants).flat().find(p => p.username /* assuming we need to match ID, but we stored ID */)
                                                : null;

                                            // Wait, our `toggleRole` stores `currentUser.id`.
                                            // `participants` state is slightly complex structure.
                                            // Let's just trust we can find it or fallback.

                                            // Simplified display:
                                            const isTaken = !!assignedUserId;
                                            const isMe = assignedUserId === currentUser?.id;

                                            return (
                                                <button
                                                    key={role}
                                                    onClick={() => toggleRole(idx, role)}
                                                    className={`
                                                        px-3 py-2 rounded text-xs font-bold transition-all border flex items-center gap-2
                                                        ${isMe
                                                            ? 'bg-raid-neon text-black border-raid-neon'
                                                            : isTaken
                                                                ? 'bg-gray-700 text-gray-300 border-gray-600 cursor-not-allowed opacity-70'
                                                                : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'
                                                        }
                                                    `}
                                                >
                                                    {isTaken ? (
                                                        <UserIcon size={12} />
                                                    ) : (
                                                        <span className="w-3 h-3 rounded-full border border-gray-500" />
                                                    )}
                                                    {role}
                                                    {isTaken && !isMe && <span className="opacity-50 text-[10px] ml-1">(Taken)</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default InteractiveRaidPlan;

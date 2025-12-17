
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, User as UserIcon, Shield, Sword, Heart, Save, Lock, Unlock, Check, X, ChevronDown } from 'lucide-react';
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
    const [activeDropdown, setActiveDropdown] = useState(null); // { phaseIdx, role }

    // Flatten participants for easy access
    const allUsers = Object.values(participants).flat();
    // Unique users by user_id for the dropdown
    const onlineUsers = [...new Map(allUsers.filter(u => u.user_id).map(item => [item.user_id, item])).values()];

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
            // 1. Save to Saved Raids (Private Profile)
            const submission = {
                user_id: currentUser.id,
                game: plan.game,
                raid: plan.raid,
                squad_size: plan.squadSize,
                vibe: plan.vibe,
                phases: plan.phases,
                title: plan.title,
                created_at: new Date().toISOString()
            };

            const { error: saveError } = await supabase
                .from('saved_raids')
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
        const roles = plan.phases[phaseIndex].roles || phaseData.roles; // Ensure roles persist or strict reload

        return {
            ...plan.phases[phaseIndex], // Keep existing data like name
            text,
            quip,
            meme,
            roles,
            votes: {}, // Reset votes on reroll
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

    const handleVote = async (phaseIndex, vote) => {
        if (!currentUser) return;
        const newPhases = [...plan.phases];
        const phase = newPhases[phaseIndex];

        if (!phase.votes) phase.votes = {};
        phase.votes[currentUser.id] = vote; // 'keep' or 'reroll'

        await updatePlan({ ...plan, phases: newPhases });
    };

    const handleAssign = async (phaseIndex, roleName, userId) => {
        const newPhases = [...plan.phases];
        const phase = newPhases[phaseIndex];

        if (!phase.assignments) phase.assignments = {};
        if (!phase.assignments[roleName]) phase.assignments[roleName] = [];

        // Check if already assigned
        if (!phase.assignments[roleName].includes(userId)) {
            phase.assignments[roleName].push(userId);
            await updatePlan({ ...plan, phases: newPhases });
        }
        setActiveDropdown(null);
    };

    const handleUnassign = async (phaseIndex, roleName, userId) => {
        const newPhases = [...plan.phases];
        const phase = newPhases[phaseIndex];

        if (phase.assignments && phase.assignments[roleName]) {
            phase.assignments[roleName] = phase.assignments[roleName].filter(id => id !== userId);
            await updatePlan({ ...plan, phases: newPhases });
        }
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
                        className="bg-gray-900/80 border border-gray-800 rounded-xl relative group"
                    >
                        {/* Reroll Overlay */}
                        {rerolling === idx && (
                            <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center backdrop-blur-sm">
                                <RefreshCw className="w-12 h-12 text-raid-neon animate-spin" />
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row h-full">
                            {/* Visual & Meme */}
                            <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden rounded-t-xl md:rounded-l-xl md:rounded-tr-none">
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

                                    {/* Voting Controls */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleVote(idx, 'keep')}
                                            className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${phase.votes?.[currentUser?.id] === 'keep'
                                                ? 'bg-green-500 text-black border-green-400'
                                                : 'bg-black/50 text-gray-400 border-gray-600 hover:text-green-400'
                                                }`}
                                        >
                                            Keep ({Object.values(phase.votes || {}).filter(v => v === 'keep').length})
                                        </button>
                                        <button
                                            onClick={() => handleVote(idx, 'reroll')}
                                            className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${phase.votes?.[currentUser?.id] === 'reroll'
                                                ? 'bg-red-500 text-black border-red-400'
                                                : 'bg-black/50 text-gray-400 border-gray-600 hover:text-red-400'
                                                }`}
                                        >
                                            Reroll ({Object.values(phase.votes || {}).filter(v => v === 'reroll').length})
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleReroll(idx, phase.name)}
                                        className="bg-gray-800/80 hover:bg-raid-neon hover:text-black text-white p-2 rounded-full transition-colors border border-gray-600 backdrop-blur-sm shadow-lg ml-2"
                                        title="Reroll Data Only"
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
                                        <Shield className="w-3 h-3 mr-2" /> MISSION ROLES
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {(() => {
                                            // Fallback Logic: match phase name to static data if roles missing
                                            let displayRoles = phase.roles;
                                            if (!displayRoles) {
                                                const rData = raidsData.find(r => r.raid === plan.raid);
                                                const pData = rData?.phases.find(p => p.name === phase.name);
                                                displayRoles = pData?.roles || ['Runner', 'Defender', 'Boss Bait', 'Meme Lord'];
                                            }

                                            return displayRoles.map((role) => {
                                                const assignedUserIds = phase.assignments?.[role] || [];
                                                const isDropdownOpen = activeDropdown?.phaseIdx === idx && activeDropdown?.role === role;

                                                return (
                                                    <div key={role} className="bg-gray-950/50 p-2 rounded border border-gray-800 relative">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-sm font-bold text-gray-300">{role}</span>
                                                            <button
                                                                onClick={() => setActiveDropdown(isDropdownOpen ? null : { phaseIdx: idx, role })}
                                                                className="text-xs text-raid-neon hover:text-white flex items-center"
                                                            >
                                                                {assignedUserIds.length > 0 ? 'Edit' : 'Assign'}
                                                            </button>
                                                        </div>

                                                        {/* Assigned Users Chips */}
                                                        <div className="flex flex-wrap gap-2 mb-1">
                                                            {assignedUserIds.length === 0 && (
                                                                <span className="text-xs text-gray-600 italic">Unassigned</span>
                                                            )}
                                                            {assignedUserIds.map(uid => {
                                                                const u = allUsers.find(p => p.user_id === uid) || { username: 'Unknown', avatar: null };
                                                                // Use uid as key since it's unique in this list
                                                                return (
                                                                    <div key={uid} className="flex items-center bg-gray-800 rounded-full pl-1 pr-2 py-0.5 border border-gray-700">
                                                                        <div className="w-4 h-4 rounded-full bg-gray-700 overflow-hidden mr-1">
                                                                            {u.avatar ? <img src={u.avatar} alt={u.username} /> : <div className="text-[8px] flex items-center justify-center h-full text-white">{u.username[0]}</div>}
                                                                        </div>
                                                                        <span className="text-[10px] text-gray-300">{u.username.substring(0, 10)}</span>
                                                                        <button
                                                                            onClick={() => handleUnassign(idx, role, uid)}
                                                                            className="ml-1 text-gray-500 hover:text-red-400"
                                                                        >
                                                                            <X size={10} />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Dropdown */}
                                                        {isDropdownOpen && (
                                                            <div className="absolute top-full left-0 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden mt-1">
                                                                {onlineUsers.map(u => {
                                                                    const isAssigned = assignedUserIds.includes(u.user_id);
                                                                    return (
                                                                        <button
                                                                            key={u.user_id}
                                                                            onClick={() => {
                                                                                if (!isAssigned) handleAssign(idx, role, u.user_id);
                                                                                else handleUnassign(idx, role, u.user_id);
                                                                            }}
                                                                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-800 ${isAssigned ? 'text-raid-neon bg-raid-neon/5' : 'text-gray-400'}`}
                                                                        >
                                                                            <span>{u.username}</span>
                                                                            {isAssigned && <Check size={12} />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        })()}
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

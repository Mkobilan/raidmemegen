import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, User as UserIcon, Shield, Sword, Heart, Save, Lock, Unlock, Check, X, ChevronDown, Download, Image as ImageIcon, FileText, Gamepad2, Monitor, MessageSquare } from 'lucide-react';
import Card from '../ui/Card';
import { supabase } from '../../supabaseClient';
import { useRealtimeRoom } from '../../hooks/useRealtimeRoom';
import { useAuth } from '../../hooks/useAuth';
import { useRaidGen } from '../../hooks/useRaidGen';
import RaidExportTemplate from '../raid/RaidExportTemplate';
import raidsData from '../../data/raids.json';
import localMemes from '../../data/memes.json';
import OverlaySetupModal from '../overlay/OverlaySetupModal';
import DiscordShareModal from '../discord/DiscordShareModal';

const InteractiveRaidPlan = () => {
    const { roomState: plan, updatePlan, participants, currentUser } = useRealtimeRoom();
    const { exportPDF, exportImage } = useRaidGen(currentUser, true, 0, () => { }); // Dummy props for export access
    const [rerolling, setRerolling] = useState(null); // Index of phase being rerolled
    const [saving, setSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null); // { phaseIdx, role }
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showOverlayModal, setShowOverlayModal] = useState(false);
    const [showDiscordModal, setShowDiscordModal] = useState(false);
    const exportRef = useRef(null);

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

    // Create a lookup map for users
    const userMap = allUsers.reduce((acc, u) => {
        if (u.user_id) acc[u.user_id] = u;
        return acc;
    }, {});

    const handleOpenOverlay = () => {
        setShowOverlayModal(true);
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Hidden Export Template */}
            <RaidExportTemplate ref={exportRef} plan={plan} userMap={userMap} />

            <div className="text-center relative">
                <h2 className="text-3xl font-gamer text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-white">
                    {plan.title}
                </h2>
                <div className="flex items-center justify-center gap-4 mt-2">
                    <p className="text-gray-400 text-sm font-mono">
                        OPERATION: {plan.game.toUpperCase()} // {plan.raid.toUpperCase()} // MODE: {plan.vibe.toUpperCase()}
                    </p>

                    <button
                        onClick={handleOpenOverlay}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-600 rounded hover:bg-raid-neon hover:text-black hover:border-raid-neon transition-colors text-xs font-bold uppercase tracking-wider group"
                        title="Open Streamer Overlay"
                    >
                        <Monitor className="w-3 h-3 group-hover:animate-pulse" />
                        Popout
                    </button>

                    <button
                        onClick={() => setShowDiscordModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded-md text-white transition-all hover:scale-105 shadow-lg shadow-[#5865F2]/20 text-sm font-bold uppercase tracking-wider group"
                        title="Share to Discord"
                    >
                        <svg width="20" height="20" viewBox="0 -28.5 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" className="fill-current">
                            <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,66.7833272 -2.93192017,115.167012 1.38605819,162.969337 C23.4933973,179.8108 45.3094099,189.989295 66.7093319,196.53922 C71.947543,189.378906 76.6664809,181.769493 80.7018805,173.74204 C73.0531522,170.817346 65.7329241,167.311756 58.7441011,163.268713 C60.5901308,161.90564 62.3686364,160.485147 64.0768393,158.99587 C106.635859,178.705822 149.626573,178.705822 191.713917,158.99587 C193.42212,160.485147 195.200626,161.90564 197.067307,163.268713 C190.057833,167.311756 182.737605,170.817346 175.088877,173.74204 C179.145679,181.769493 183.843965,189.378906 189.082176,196.53922 C210.482098,189.989295 232.298111,179.8108 254.40545,162.969337 C260.027699,111.41164 248.831835,66.7833272 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"></path>
                        </svg>
                        Share
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-600 rounded hover:bg-raid-neon hover:text-black hover:border-raid-neon transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {saving ? 'Saving...' : 'Save Mission'}
                    </button>

                    {/* Export Menu */}
                    <div className="relative">
                        <button
                            onClick={() => !isExporting && setShowExportMenu(!showExportMenu)}
                            disabled={isExporting}
                            className={`bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 flex items-center gap-2 transition-colors ${showExportMenu ? 'bg-gray-700' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isExporting ? <Gamepad2 className="w-3 h-3 animate-spin text-raid-neon" /> : <Download className="w-3 h-3" />}
                            {isExporting ? 'Exporting...' : 'Export'}
                            {!isExporting && <ChevronDown size={12} />}
                        </button>

                        <AnimatePresence>
                            {showExportMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50"
                                >
                                    <button
                                        onClick={async () => {
                                            if (isExporting) return;
                                            setIsExporting(true);
                                            setShowExportMenu(false); // Close menu immediately or keep open? Better close and show loading on main button
                                            try {
                                                await exportPDF(plan, exportRef);
                                            } catch (e) {
                                                console.error(e);
                                            } finally {
                                                setIsExporting(false);
                                            }
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                                    >
                                        <FileText size={16} className="text-red-400" />
                                        Export as PDF
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (isExporting) return;
                                            setIsExporting(true);
                                            setShowExportMenu(false);
                                            try {
                                                await exportImage(exportRef, `${plan.raid}-mission-card.png`);
                                            } catch (e) {
                                                console.error(e);
                                            } finally {
                                                setIsExporting(false);
                                            }
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                                    >
                                        <Gamepad2 size={16} className="text-raid-neon" />
                                        Export as Image
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
                                    <p className={`text-sm italic border-l-2 pl-3 ${phase.isSerious ? 'text-blue-400 border-blue-500 not-italic font-mono' : 'text-gray-500 border-raid-neon/50'}`}>
                                        {phase.isSerious ? (
                                            <>
                                                <span className="font-bold text-xs uppercase tracking-wider block mb-1">Tactical Intel Direct:</span>
                                                {phase.quip}
                                            </>
                                        ) : (
                                            `"${phase.quip}"`
                                        )}
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
            {/* Overlay Setup Modal */}
            <OverlaySetupModal
                isOpen={showOverlayModal}
                onClose={() => setShowOverlayModal(false)}
                raidData={plan}
            />

            <DiscordShareModal
                isOpen={showDiscordModal}
                onClose={() => setShowDiscordModal(false)}
                raidData={plan}
            />
        </div>
    );
};

export default InteractiveRaidPlan;

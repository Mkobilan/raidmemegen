
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RealtimeProvider } from '../../context/RealtimeContext';
import { useRealtimeRoom } from '../../hooks/useRealtimeRoom';
import ChatBox from './ChatBox';
import CursorOverlay from './CursorOverlay';
import InteractiveRaidPlan from './InteractiveRaidPlan';
import { Users, Copy, LogOut, MessageSquare } from 'lucide-react';

// Import generation tools
import RaidGenerator from '../raid/RaidGenerator';
import { useRaidGen } from '../../hooks/useRaidGen';
import { useAuth } from '../../hooks/useAuth';

const RoomContent = ({ roomId }) => {
    const { isConnected, participants, broadcastCursor, roomState, updatePlan } = useRealtimeRoom();
    const [showChat, setShowChat] = useState(true);
    const navigate = useNavigate();

    // Stats for generation (using user details from Auth hook, passed down or used globally)
    const { user, pro, gensCount, incrementGens } = useAuth();

    // Local raid gen hook just for the generation logic
    const { generateRaid, loading: genLoading } = useRaidGen(user, pro, gensCount, () => alert("Upgrade to Pro!"));

    // Mouse tracking for cursors
    useEffect(() => {
        const handleMouseMove = (e) => {
            broadcastCursor(e.clientX, e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [broadcastCursor]);

    const participantCount = Object.keys(participants).length;

    const copyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert("Mission Link Copied to Clipboard!");
    };

    const handleRoomGeneration = async (params) => {
        // 1. Generate local plan
        const newPlan = await generateRaid(params);
        if (newPlan) {
            // 2. Sync to room
            await updatePlan(newPlan);
            // 3. Increment gens
            await incrementGens();
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-raid-neon font-gamer animate-pulse text-2xl">
                    ESTABLISHING ENCRYPTED UPLINK...
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden relative">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

            <CursorOverlay />

            {/* Top Bar */}
            <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-40 relative shadow-lg">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors">
                        <LogOut size={20} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-mono">SECURE CHANNEL</span>
                        <span className="text-white font-bold tracking-wider">{roomId.slice(0, 8)}...</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Presence Avatars */}
                    <div className="flex -space-x-2 mr-4">
                        {Object.values(participants).flat().map((p, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center text-xs font-bold text-raid-neon overflow-hidden relative" title={p.username}>
                                {p.avatar ? (
                                    <img src={p.avatar} alt={p.username} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{p.username?.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full border border-gray-700">
                        <Users size={14} className="text-raid-neon" />
                        <span className="text-sm font-medium">{participantCount} Online</span>
                    </div>

                    <button
                        onClick={copyLink}
                        className="flex items-center gap-2 bg-raid-neon/10 hover:bg-raid-neon/20 text-raid-neon px-3 py-2 rounded-lg border border-raid-neon/50 text-sm font-bold transition-all"
                    >
                        <Copy size={16} /> <span className="hidden sm:inline">Invite Squad</span>
                    </button>

                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`md:hidden p-2 rounded-lg border ${showChat ? 'bg-raid-neon/20 border-raid-neon' : 'bg-gray-800 border-gray-700'}`}
                    >
                        <MessageSquare size={20} />
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-grow flex overflow-hidden z-10 relative">
                {/* Scrollable Plan Area */}
                <main className="flex-grow overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-raid-neon/50 scrollbar-track-gray-900/50">
                    <div className="max-w-5xl mx-auto">
                        {/* If plan exists, show InteractiveRaidPlan. Else show RaidGenerator */}
                        {roomState && roomState.phases && roomState.phases.length > 0 ? (
                            <InteractiveRaidPlan />
                        ) : (
                            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                                <h2 className="text-2xl font-gamer text-center mb-6 text-raid-neon">INITIALIZE MISSION PROTOCOL</h2>
                                <RaidGenerator
                                    user={user}
                                    isPro={pro}
                                    gensCount={gensCount}
                                    loading={genLoading}
                                    onGenerate={handleRoomGeneration}
                                    onShowAuth={() => alert("Please login via the main menu to generate.")}
                                />
                            </div>
                        )}
                    </div>
                </main>

                {/* Sidebar Chat */}
                <aside
                    className={`
                        fixed md:relative top-16 md:top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-800 transform transition-transform duration-300 z-50
                        ${showChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                    `}
                >
                    <ChatBox />
                </aside>
            </div>
        </div>
    );
};

// Wrapper ensuring Provider is present
const LiveRoom = () => {
    const { roomId } = useParams();
    return (
        <RealtimeProvider roomId={roomId}>
            <RoomContent roomId={roomId} />
        </RealtimeProvider>
    );
};

export default LiveRoom;

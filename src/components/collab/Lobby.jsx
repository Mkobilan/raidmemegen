
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import Card from '../ui/Card';
import { Plus, LogIn, Loader2 } from 'lucide-react';

const Lobby = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [joinId, setJoinId] = useState('');
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);

    const createRoom = async () => {
        if (!user) {
            alert("You must be logged in to create a room.");
            return;
        }
        setCreating(true);
        try {
            // Create a default empty plan or initial state
            const initialPlan = {
                game: 'Destiny 2', // Default
                raid: 'Vault of Glass',
                squadSize: 6,
                vibe: 'Meme Chaos',
                phases: []
            };

            const { data, error } = await supabase
                .from('rooms')
                .insert([{
                    host_id: user.id,
                    game: 'Destiny 2',
                    active_plan: initialPlan
                }])
                .select()
                .single();

            if (error) throw error;
            navigate(`/room/${data.id}`);
        } catch (error) {
            console.error(error);
            alert("Failed to create room.");
        } finally {
            setCreating(false);
        }
    };

    const joinRoom = async (e) => {
        e.preventDefault();
        if (!joinId) return;
        setJoining(true);

        // Handle case where user pastes full URL
        let finalId = joinId.trim();
        // If it contains the full URL with /room/
        if (finalId.includes('/room/')) {
            // Split by /room/ and take the second part
            // Then split by ? to remove any query params if present
            finalId = finalId.split('/room/')[1].split('?')[0];
        }
        // Remove any trailing slashes just in case
        finalId = finalId.replace(/\/$/, '');

        // Now query with the clean ID
        const { data, error } = await supabase
            .from('rooms')
            .select('id')
            .eq('id', finalId)
            .single();

        setJoining(false);
        if (error || !data) {
            console.error(error);
            alert("Room not found! Check the ID.");
            return;
        }
        navigate(`/room/${data.id}`);
    };

    return (
        <div className="max-w-2xl mx-auto mt-20 px-4">
            <h1 className="text-4xl font-gamer text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-blue-500">
                Raid War Room
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Room */}
                <Card title="Start New Ops" className="h-full flex flex-col justify-between">
                    <p className="text-gray-400 mb-6">Host a session, invite your squad, and plan the chaos interactively.</p>
                    <button
                        onClick={createRoom}
                        disabled={creating}
                        className="w-full bg-raid-neon text-black font-bold py-3 rounded-lg flex items-center justify-center hover:bg-green-400 transition-colors"
                    >
                        {creating ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                        Create Room
                    </button>
                </Card>

                {/* Join Room */}
                <Card title="Join Squad" className="h-full flex flex-col justify-between">
                    <p className="text-gray-400 mb-6">Enter a Room ID or code to join an active planning session.</p>
                    <form onSubmit={joinRoom} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Room ID / Code"
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white focus:border-raid-neon outline-none"
                        />
                        <button
                            type="submit"
                            disabled={joining || !joinId}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center hover:bg-blue-500 transition-colors disabled:opacity-50"
                        >
                            {joining ? <Loader2 className="animate-spin mr-2" /> : <LogIn className="mr-2" />}
                            Join Room
                        </button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Lobby;

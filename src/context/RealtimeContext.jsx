
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';

const RealtimeContext = createContext({});

export const RealtimeProvider = ({ roomId, children }) => {
    const { user, userProfile } = useAuth();
    const [participants, setParticipants] = useState({});
    const [cursors, setCursors] = useState({});
    const [roomState, setRoomState] = useState(null); // The generated plan
    const [chatMessages, setChatMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // Refs for mutable state in callbacks avoiding dependency loops
    const channelRef = useRef(null);

    // Helper to get my details consistent across features
    const getMyDetails = useCallback(() => {
        if (!user) return null;
        // Logic: Profile Username -> Metadata Username -> Email -> Anon
        const name = userProfile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Anon';
        const avatar = userProfile?.avatar_url || user.user_metadata?.avatar_url || null;
        const color = user.user_metadata?.color || '#00ff88';

        return {
            userId: user.id,
            username: name,
            avatar: avatar,
            color: color
        };
    }, [user, userProfile]);

    // Initial Load of Room Data
    useEffect(() => {
        if (!roomId) return;

        const fetchRoom = async () => {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', roomId)
                .single();

            if (error) {
                console.error("Error loading room:", error);
            } else if (data) {
                setRoomState(data.active_plan);
            }
        };

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('room_messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
                .limit(50);

            if (data) setChatMessages(data);
        };

        fetchRoom();
        fetchMessages();
    }, [roomId]);

    // Setup Realtime Subscription
    useEffect(() => {
        if (!roomId || !user) return;

        const channel = supabase.channel(`room:${roomId}`, {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channelRef.current = channel;

        channel
            // 1. Handle Presence (Who is here)
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setParticipants(state);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('join', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('leave', key, leftPresences);
                // Remove cursor for leaver
                setCursors(prev => {
                    const newCursors = { ...prev };
                    delete newCursors[key];
                    return newCursors;
                });
            })
            // 2. Handle Broadcast (Cursors)
            .on('broadcast', { event: 'cursor-pos' }, (payload) => {
                setCursors(prev => ({
                    ...prev,
                    [payload.userId]: { ...payload }
                }));
            })
            // 3. Handle Postgres Changes (Chat & Room Plan)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    setChatMessages(prev => [...prev, payload.new]);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
                (payload) => {
                    console.log('Room update received:', payload);
                    if (payload.new && payload.new.active_plan) {
                        setRoomState(payload.new.active_plan);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                }
            });

        return () => {
            supabase.removeChannel(channel);
            setIsConnected(false);
        };
    }, [roomId, user]); // Only re-sub if room or auth user identity changes (rare)

    // Separate effect for tracking presence details (updates without re-subscribing)
    useEffect(() => {
        if (!isConnected || !channelRef.current) return;

        const myDetails = {
            user_id: user.id,
            username: userProfile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Anon',
            avatar: userProfile?.avatar_url || user?.user_metadata?.avatar_url || null,
            online_at: new Date().toISOString(),
        };

        channelRef.current.track(myDetails);

    }, [isConnected, userProfile, user]); // Updates presence when profile loads/changes

    // Actions
    const sendMessage = async (content, type = 'chat') => {
        if (!user || !roomId) return;
        const details = getMyDetails();

        const msg = {
            room_id: roomId,
            user_id: user.id,
            username: details?.username || 'Anon',
            content,
            type,
        };
        // Optimistic update? No, let realtime handle it for consistency
        await supabase.from('room_messages').insert([msg]);
    };

    const updatePlan = async (newPlan) => {
        if (!roomId) return { error: 'No room ID' };
        // Optimistic
        setRoomState(newPlan);
        const { error } = await supabase.from('rooms').update({ active_plan: newPlan }).eq('id', roomId);
        if (error) console.error("Plan update failed:", error);
        return { error };
    };

    // Throttled cursor update
    const lastCursorUpdate = useRef(0);
    const broadcastCursor = useCallback((x, y) => {
        const now = Date.now();
        if (now - lastCursorUpdate.current > 50) { // 20fps cap
            if (channelRef.current) {
                const details = getMyDetails();
                if (details) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'cursor-pos',
                        payload: {
                            x,
                            y,
                            userId: details.userId,
                            username: details.username,
                            color: details.color,
                            avatar: details.avatar // potentially unused by cursor but good to have
                        },
                    });
                }
            }
            lastCursorUpdate.current = now;
        }
    }, [getMyDetails]);

    return (
        <RealtimeContext.Provider value={{
            isConnected,
            participants,
            cursors,
            roomState,
            chatMessages,
            sendMessage,
            updatePlan,
            broadcastCursor,
            currentUser: user
        }}>
            {children}
        </RealtimeContext.Provider>
    );
};

export const useRealtime = () => useContext(RealtimeContext);

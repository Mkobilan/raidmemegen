import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [pro, setPro] = useState(false);
    const [gensCount, setGensCount] = useState(0);

    const getUTCToday = () => new Date().toISOString().split('T')[0];

    useEffect(() => {
        console.log('AuthProvider: invoking useEffect');
        let mounted = true;

        // Check active session
        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log('AuthProvider: getSession result', { session, error });

                if (error) throw error;

                if (mounted) {
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        console.log('AuthProvider: user found, fetching data');
                        await fetchUserData(session.user);
                    } else {
                        console.log('AuthProvider: no user, loading done');
                        setAuthLoading(false);
                    }
                }
            } catch (err) {
                console.error('AuthProvider: getSession exception', err);
                if (mounted) setAuthLoading(false);
            }
        };

        initSession();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('AuthProvider: onAuthStateChange', _event);
            if (!mounted) return;

            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchUserData(session.user);
            } else {
                setPro(false);
                setGensCount(0);
                setAuthLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchUserData = async (currentUser) => {
        console.log('fetchUserData: starting for user', currentUser.id);
        const userId = currentUser.id;
        try {
            console.log('fetchUserData: querying profiles table...');

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch request timed out')), 5000)
            );

            const queryPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                console.error('Error fetching profile:', error);
            }
            console.log('fetchUserData: profile query result', { data, error });

            const today = getUTCToday();

            if (data) {
                // Check reset date
                let todayGens = data.gens_today || 0;
                if (data.last_reset_date !== today) {
                    console.log('fetchUserData: resetting daily gens');
                    todayGens = 0;
                    await supabase
                        .from('profiles')
                        .update({ gens_today: 0, last_reset_date: today })
                        .eq('id', userId);
                }
                setPro(data.is_pro || false);
                setGensCount(todayGens);
            } else {
                console.log('fetchUserData: creating new profile');
                // Initialize profile if missing
                const newProfile = {
                    id: userId,
                    is_pro: false,
                    gens_today: 0,
                    last_reset_date: today,
                    username: currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'user_' + userId.slice(0, 8),
                    display_name: currentUser?.user_metadata?.username || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0],
                    created_at: new Date().toISOString()
                };

                const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
                if (insertError) console.error('fetchUserData: insert error', insertError);
                setPro(false);
                setGensCount(0);
            }
        } catch (error) {
            console.error('Error in fetchUserData:', error);
        } finally {
            console.log('fetchUserData: finished, setting authLoading false');
            setAuthLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    };

    const signup = async (email, password, username) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username || '',
                    full_name: username || '' // Use username as full_name/display_name initially
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        console.log('AuthProvider: logout called');
        try {
            // Attempt Supabase sign out
            const { error } = await supabase.auth.signOut();
            if (error) {
                // Log but don't throw, so we can still clear local state
                console.warn('AuthProvider: logout warning', error.message);
            }
        } catch (err) {
            console.error('AuthProvider: logout exception (ignored)', err);
        } finally {
            // Always clear local state
            console.log('AuthProvider: clearing local session');
            setUser(null);
            setPro(false);
            setGensCount(0);
        }
    };

    const incrementGens = async () => {
        if (!user) return; // Allow pro to track stats too, removed "|| pro" return

        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('gens_today, last_reset_date, raid_stats')
            .eq('id', user.id)
            .single();

        if (fetchError) throw new Error('Could not fetch user data');

        const today = getUTCToday();
        let currentGens = profile.gens_today || 0;

        if (profile.last_reset_date !== today) {
            currentGens = 0;
        }

        // Limit check only for non-pro
        if (!pro && currentGens >= 3) {
            throw new Error('Daily limit reached');
        }

        const currentStats = profile.raid_stats || {
            totalGenerated: 0,
            totalSubmitted: 0,
            totalUpvotes: 0,
            favoriteGame: null
        };

        const newStats = {
            ...currentStats,
            totalGenerated: (currentStats.totalGenerated || 0) + 1
        };

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                gens_today: currentGens + 1,
                last_reset_date: today,
                raid_stats: newStats
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        setGensCount(currentGens + 1);
    };

    const refreshUser = async () => {
        if (!user) return;
        await fetchUserData(user);
    };

    const value = {
        user,
        pro,
        gensCount,
        authLoading,
        login,
        signup,
        logout,
        incrementGens,
        refreshUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

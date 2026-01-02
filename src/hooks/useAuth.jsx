import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [pro, setPro] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [isTrialActive, setIsTrialActive] = useState(true);
    const [trialDaysLeft, setTrialDaysLeft] = useState(14);
    const [gensCount, setGensCount] = useState(0);
    const fetchInProgress = useRef(null);

    const getUTCToday = () => new Date().toISOString().split('T')[0];

    // Helper for profile fetching with retries and timeout
    const fetchWithRetry = async (userId, currentUser, retries = 2) => {
        const timeoutDuration = 10000; // 10s per attempt

        for (let i = 0; i <= retries; i++) {
            try {
                console.log(`fetchUserData: attempt ${i + 1} for ${userId}`);

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT')), timeoutDuration)
                );

                const queryPromise = supabase
                    .from('profiles')
                    .select('id, is_pro, stripe_sub_id, gens_today, last_reset_date, trial_end_date, username, display_name, created_at, raid_stats')
                    .eq('id', userId)
                    .maybeSingle();

                const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

                if (error) {
                    console.warn(`fetchUserData: query error (attempt ${i + 1}):`, error);
                    // If it's a transient error, we retry. If it's a real PG error, we might stop.
                    if (i === retries) throw error;
                    continue;
                }

                return data; // Success
            } catch (err) {
                console.warn(`fetchUserData: attempt ${i + 1} failed:`, err.message);
                if (i === retries) throw err;
                // Wait a bit before retry
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    };

    const fetchUserData = async (currentUser) => {
        if (!currentUser) return;
        const userId = currentUser.id;

        if (fetchInProgress.current === userId) {
            console.log('fetchUserData: already in progress for', userId);
            return;
        }
        fetchInProgress.current = userId;
        setAuthLoading(true);

        try {
            const data = await fetchWithRetry(userId, currentUser);
            const today = getUTCToday();

            if (data) {
                console.log('fetchUserData: profile found', data.id);
                // Daily reset logic
                let todayGens = data.gens_today || 0;
                if (data.last_reset_date !== today) {
                    todayGens = 0;
                    await supabase
                        .from('profiles')
                        .update({ gens_today: 0, last_reset_date: today })
                        .eq('id', userId);
                }

                setPro(!!data.is_pro);
                setGensCount(todayGens);
                setUserProfile(data);

                // Trial calculation
                const now = new Date();
                let trialActive = false;
                let daysLeft = 0;

                if (data.trial_end_date) {
                    const trialEnd = new Date(data.trial_end_date);
                    const diffTime = trialEnd - now;
                    daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    trialActive = diffTime > 0;
                }

                setIsTrialActive(!!data.is_pro && trialActive);
                setTrialDaysLeft(daysLeft);
            } else {
                console.log('fetchUserData: creating new profile');
                const newProfile = {
                    id: userId,
                    is_pro: false,
                    gens_today: 0,
                    last_reset_date: today,
                    username: currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'user_' + userId.slice(0, 8),
                    display_name: currentUser?.user_metadata?.username || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0],
                    trial_end_date: null
                };

                const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
                if (insertError) console.error('fetchUserData: insert error', insertError);

                setPro(false);
                setGensCount(0);
                setIsTrialActive(false);
                setTrialDaysLeft(0);
                setUserProfile(newProfile);
            }
        } catch (error) {
            console.error('fetchUserData: FINAL failure', error);
        } finally {
            fetchInProgress.current = null;
            setAuthLoading(false);
            console.log('fetchUserData: complete');
        }
    };

    useEffect(() => {
        console.log('AuthProvider: initializing');
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            const currentUser = session?.user ?? null;
            console.log('AuthProvider: state change', _event, currentUser?.id);

            setUser(currentUser);

            if (currentUser) {
                // Fetch user data if not already loaded or if user changed
                if (!userProfile || userProfile.id !== currentUser.id) {
                    await fetchUserData(currentUser);
                }
            } else {
                setPro(false);
                setGensCount(0);
                setUserProfile(null);
                setAuthLoading(false);
            }
        });

        // Fail-safe to ensure loading spinner doesn't get stuck forever
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted && !session?.user) {
                setAuthLoading(false);
            }
        };
        checkSession();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signup = async (email, password, metadata = {}) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const value = {
        user,
        userProfile,
        pro,
        authLoading,
        isTrialActive,
        trialDaysLeft,
        gensCount,
        login,
        signup,
        logout,
        refreshProfile: () => user && fetchUserData(user)
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

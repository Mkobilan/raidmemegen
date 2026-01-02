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

    const fetchUserData = async (currentUser) => {
        if (!currentUser) return;
        const userId = currentUser.id;

        if (fetchInProgress.current === userId) return;
        fetchInProgress.current = userId;
        setAuthLoading(true);

        try {
            console.log('fetchUserData: querying profiles for', userId);

            // Single 30s timeout for the Supabase query
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), 30000)
            );

            const queryPromise = supabase
                .from('profiles')
                .select('id, is_pro, stripe_sub_id, gens_today, last_reset_date, trial_end_date, username, display_name, created_at, raid_stats')
                .eq('id', userId)
                .maybeSingle();

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

            if (error) throw error;

            const today = getUTCToday();

            if (data) {
                console.log('fetchUserData: profile found');
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
                console.log('fetchUserData: creating profile');
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
            console.error('fetchUserData error:', error);
        } finally {
            fetchInProgress.current = null;
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        console.log('AuthProvider: init');
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            const currentUser = session?.user ?? null;
            console.log('AuthProvider: onAuthStateChange', _event, currentUser?.id);

            setUser(currentUser);

            if (currentUser) {
                // IMPORTANT: 100ms delay to avoid race condition with auth context
                setTimeout(() => {
                    if (mounted) fetchUserData(currentUser);
                }, 100);
            } else {
                setPro(false);
                setGensCount(0);
                setUserProfile(null);
                setAuthLoading(false);
            }
        });

        // Fail-safe to stop loading if no session is ever found
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted && !session?.user) {
                setAuthLoading(false);
            }
        });

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

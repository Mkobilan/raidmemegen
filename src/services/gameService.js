import { supabase } from '../supabaseClient';

export const saveScore = async (userId, raidName, score) => {
    try {
        // Fetch profile to get current stats
        const { data: profile, error: fetchErr } = await supabase
            .from('profiles')
            .select('game_stats')
            .eq('id', userId)
            .single();

        if (fetchErr) throw fetchErr;

        let stats = profile?.game_stats || {};

        // Check if this is a high score
        const currentHigh = stats[raidName] || 0;

        if (score > currentHigh) {
            stats[raidName] = score;

            // Update profile with new stats
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ game_stats: stats })
                .eq('id', userId);

            if (updateErr) throw updateErr;
            return true; // New High Score
        }

        return false;
    } catch (error) {
        console.error('Error saving score:', error);
        return false;
    }
};

export const getLeaderboard = async (raidName) => {
    try {
        // Fetch all profiles that have game_stats
        const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url, game_stats')
            .not('game_stats', 'is', null)
            .limit(50);

        if (error) throw error;

        // Filter and sort manually in client since game_stats is JSONB
        // and we want to sort by a specific key inside it.
        return data
            .map(p => ({
                username: p.username || 'Anonymous',
                avatar: p.avatar_url,
                score: p.game_stats?.[raidName] || 0
            }))
            .filter(p => p.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
};

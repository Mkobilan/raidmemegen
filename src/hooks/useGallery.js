import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const ITEMS_PER_PAGE = 12;

export const useGallery = (user) => {
    const [submissions, setSubmissions] = useState([]);
    const [featuredSubmission, setFeaturedSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [userVotes, setUserVotes] = useState({}); // { post_id: 'up' | 'down' }
    const [gameFilter, setGameFilter] = useState('all');

    // Fetch user's votes
    const fetchUserVotes = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('votes')
                .select('post_id, vote_type')
                .eq('user_id', user.id);

            if (error) throw error;

            const votes = {};
            data.forEach((v) => {
                votes[v.post_id] = v.vote_type;
            });
            setUserVotes(votes);
        } catch (error) {
            console.error('Error fetching user votes:', error);
        }
    }, [user]);

    // Fetch gallery submissions
    const fetchSubmissions = useCallback(async (reset = false) => {
        setLoading(true);
        try {
            const currentPage = reset ? 0 : page;
            const from = currentPage * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase
                .from('gallery_posts')
                .select(`
                    *,
                    profiles:user_id (username, display_name, avatar_url)
                `)
                .order('created_at', { ascending: false })
                .range(from, to);

            // Client-side game filter (or server side if exact match)
            if (gameFilter !== 'all') {
                query = query.eq('game', gameFilter);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform to expected format
            const newSubmissions = data.map(post => ({
                id: post.id,
                ...post,
                userId: post.user_id,
                username: post.profiles?.username,
                userDisplayName: post.profiles?.display_name,
                userAvatarUrl: post.profiles?.avatar_url
            }));

            setHasMore(data.length === ITEMS_PER_PAGE);

            if (reset) {
                setSubmissions(newSubmissions);
                setPage(1);
            } else {
                setSubmissions(prev => [...prev, ...newSubmissions]);
                setPage(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error fetching gallery:', error);
        }
        setLoading(false);
    }, [gameFilter, page]);

    // Fetch featured submission
    const fetchFeatured = useCallback(async () => {
        try {
            // Get best score from last 20 posts
            const { data, error } = await supabase
                .from('gallery_posts')
                .select(`*, profiles:user_id (username, display_name)`)
                .order('created_at', { ascending: false })
                .limit(20);

            if (data && data.length > 0) {
                const best = data.sort((a, b) => b.score - a.score)[0];
                setFeaturedSubmission({
                    id: best.id,
                    ...best,
                    userId: best.user_id,
                    username: best.profiles?.username,
                    userDisplayName: best.profiles?.display_name
                });
            }
        } catch (error) {
            console.error('Error fetching featured:', error);
        }
    }, []);

    // Submit raid to gallery
    const submitToGallery = async (plan, description = '') => {
        if (!user || !plan) {
            throw new Error('Must be logged in with a valid plan');
        }

        const submission = {
            user_id: user.id,
            game: plan.game,
            raid: plan.raid,
            squad_size: plan.squadSize,
            vibe: plan.vibe,
            description: description,
            phases: plan.phases,
            title: plan.title || `${plan.game} - ${plan.raid}`
        };

        const { data, error } = await supabase
            .from('gallery_posts')
            .insert([submission])
            .select()
            .single();

        if (error) throw error;

        // Update profile stats (totalSubmitted)
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('raid_stats')
                .eq('id', user.id)
                .single();

            if (profile) {
                const currentStats = profile.raid_stats || {
                    totalGenerated: 0,
                    totalSubmitted: 0,
                    totalUpvotes: 0,
                    favoriteGame: null
                };

                const newStats = {
                    ...currentStats,
                    totalSubmitted: (currentStats.totalSubmitted || 0) + 1
                };

                await supabase
                    .from('profiles')
                    .update({ raid_stats: newStats })
                    .eq('id', user.id);
            }
        } catch (statError) {
            console.error('Error updating profile stats:', statError);
            // Don't fail the submission if stats fail
        }

        // Reset and refetch
        fetchSubmissions(true);

        return data.id;
    };

    // Vote on a submission
    const vote = async (submissionId, voteType) => {
        if (!user) {
            throw new Error('Must be logged in to vote');
        }

        const currentVote = userVotes[submissionId];

        try {
            if (currentVote === voteType) {
                // Remove vote
                await supabase.from('votes').delete().match({ user_id: user.id, post_id: submissionId });

                // Manual update of counts
                // In production, use database triggers for consistency
                const { data: post } = await supabase.from('gallery_posts').select('*').eq('id', submissionId).single();
                await supabase
                    .from('gallery_posts')
                    .update({
                        upvotes: voteType === 'up' ? Math.max(0, post.upvotes - 1) : post.upvotes,
                        downvotes: voteType === 'down' ? Math.max(0, post.downvotes - 1) : post.downvotes,
                        score: post.score + (voteType === 'up' ? -1 : 1)
                    })
                    .eq('id', submissionId);

                setUserVotes(prev => {
                    const newVotes = { ...prev };
                    delete newVotes[submissionId];
                    return newVotes;
                });
            } else {
                // Add or change vote
                // 1. Upsert vote
                await supabase.from('votes').upsert({
                    user_id: user.id,
                    post_id: submissionId,
                    vote_type: voteType
                });

                // 2. Update post counts
                const { data: post } = await supabase.from('gallery_posts').select('*').eq('id', submissionId).single();

                let newUp = post.upvotes;
                let newDown = post.downvotes;
                let newScore = post.score;

                if (currentVote) {
                    // Changing vote
                    if (voteType === 'up') {
                        newUp++;
                        newDown--;
                        newScore += 2;
                    } else {
                        newDown++;
                        newUp--;
                        newScore -= 2;
                    }
                } else {
                    // New vote
                    if (voteType === 'up') {
                        newUp++;
                        newScore++;
                    } else {
                        newDown++;
                        newScore--;
                    }
                }

                await supabase.from('gallery_posts').update({
                    upvotes: newUp,
                    downvotes: newDown,
                    score: newScore
                }).eq('id', submissionId);

                setUserVotes(prev => ({ ...prev, [submissionId]: voteType }));
            }

            // Refresh local state roughly
            setSubmissions(prev => prev.map(s => {
                if (s.id !== submissionId) return s;
                // Simple optimistic update, not perfect but okay
                let sUp = s.upvotes;
                let sDown = s.downvotes;

                if (currentVote === voteType) {
                    return {
                        ...s,
                        upvotes: voteType === 'up' ? sUp - 1 : sUp,
                        downvotes: voteType === 'down' ? sDown - 1 : sDown,
                        score: s.score + (voteType === 'up' ? -1 : 1)
                    };
                } else if (currentVote) {
                    // changing
                    if (voteType === 'up') {
                        return { ...s, upvotes: sUp + 1, downvotes: sDown - 1, score: s.score + 2 };
                    } else {
                        return { ...s, upvotes: sUp - 1, downvotes: sDown + 1, score: s.score - 2 };
                    }
                } else {
                    // new
                    return {
                        ...s,
                        upvotes: voteType === 'up' ? sUp + 1 : sUp,
                        downvotes: voteType === 'down' ? sDown + 1 : sDown,
                        score: s.score + (voteType === 'up' ? 1 : -1)
                    };
                }
            }));

        } catch (error) {
            console.error('Error voting:', error);
            throw error;
        }
    };

    // Delete own submission
    const deleteSubmission = async (submissionId) => {
        if (!user) throw new Error('Must be logged in');

        const { error } = await supabase
            .from('gallery_posts')
            .delete()
            .eq('id', submissionId)
            .eq('user_id', user.id); // RLS handles this too

        if (error) throw error;

        setSubmissions(prev => prev.filter(s => s.id !== submissionId));
    };

    // Load more
    const loadMore = () => {
        if (hasMore && !loading) {
            fetchSubmissions(false);
        }
    };

    // Change game filter
    const changeGameFilter = (game) => {
        setGameFilter(game);
        setPage(0);
        setSubmissions([]);
    };

    // Initial fetch
    useEffect(() => {
        fetchSubmissions(true);
        fetchFeatured();
        if (user) fetchUserVotes();
    }, [gameFilter, user]);

    return {
        submissions,
        featuredSubmission,
        loading,
        hasMore,
        userVotes,
        gameFilter,
        submitToGallery,
        vote,
        deleteSubmission,
        loadMore,
        changeGameFilter,
        refresh: () => {
            setPage(0);
            fetchSubmissions(true);
            fetchFeatured();
        }
    };
};

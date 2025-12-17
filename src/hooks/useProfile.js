import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const useProfile = (currentUser = null) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch profile by username (for public viewing)
    const getProfileByUsername = async (username) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username.toLowerCase())
                .single();

            if (error) throw error;

            const publicProfile = {
                id: data.id,
                username: data.username,
                displayName: data.display_name,
                bio: data.bio || '',
                avatarUrl: data.avatar_url || '',
                gamesPlaying: data.games_playing || [],
                gamerTags: data.gamer_tags || {},
                socialLinks: data.social_links || {},
                isPro: data.is_pro || false,
                createdAt: data.created_at,
                // Stats
                raidStats: data.raid_stats || {
                    totalGenerated: 0,
                    totalSubmitted: 0,
                    totalUpvotes: 0,
                    favoriteGame: null
                }
            };

            setProfile(publicProfile);
            return publicProfile;
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Profile not found');
            setProfile(null);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Fetch current user's own profile (for editing)
    const getMyProfile = async () => {
        if (!currentUser) return null;

        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (error) throw error;

            // Map snake_case to camelCase for internal app consistency
            const userData = {
                id: data.id,
                username: data.username,
                displayName: data.display_name,
                bio: data.bio,
                avatarUrl: data.avatar_url,
                gamesPlaying: data.games_playing,
                gamerTags: data.gamer_tags,
                socialLinks: data.social_links,
                isPro: data.is_pro,
                createdAt: data.created_at,
                raidStats: data.raid_stats,
                email: currentUser.email
            };

            setProfile(userData);
            return userData;
        } catch (err) {
            console.error('Error fetching own profile:', err);
            setError('Failed to load profile');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Check if username is available
    const checkUsernameAvailable = async (username) => {
        if (!username || username.length < 3) return false;

        const normalizedUsername = username.toLowerCase().trim();

        if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
            return false;
        }

        try {
            const { count, error } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('username', normalizedUsername)
                .neq('id', currentUser?.id || '00000000-0000-0000-0000-000000000000'); // Exclude self

            if (error) throw error;
            return count === 0;
        } catch (err) {
            console.error('Error checking username:', err);
            return false;
        }
    };

    // Upload avatar to Supabase Storage
    const uploadAvatar = async (file) => {
        if (!currentUser || !file) return null;

        try {
            // 1. Delete old avatar if exists (optional, but good practice)
            // Skipped for simplicity, Supabase upsert handles overwrites often, but unique names preferred.

            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (err) {
            console.error('Error uploading avatar:', err);
            throw new Error(`Failed to upload avatar: ${err.message}`);
        }
    };

    // Update profile
    const updateProfile = async (profileData) => {
        if (!currentUser) throw new Error('Must be logged in to update profile');

        setLoading(true);
        setError(null);

        try {
            const updateData = {
                display_name: profileData.username || profileData.displayName,
                updated_at: new Date().toISOString()
            };

            // Map other fields
            if (profileData.bio !== undefined) updateData.bio = profileData.bio;
            if (profileData.avatarUrl !== undefined) updateData.avatar_url = profileData.avatarUrl;
            if (profileData.gamesPlaying !== undefined) updateData.games_playing = profileData.gamesPlaying;
            if (profileData.gamerTags !== undefined) updateData.gamer_tags = profileData.gamerTags;
            if (profileData.socialLinks !== undefined) updateData.social_links = profileData.socialLinks;

            // Normalize username if provided
            if (profileData.username) {
                const newUsername = profileData.username.toLowerCase().trim();

                // Only check availability if it's different from current
                if (newUsername !== profile?.username) {
                    const isAvailable = await checkUsernameAvailable(newUsername);
                    if (!isAvailable) {
                        throw new Error('Username is not available');
                    }
                    updateData.username = newUsername;
                }
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', currentUser.id);

            if (error) throw error;

            // Refresh profile
            await getMyProfile();

            return true;
        } catch (err) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Failed to update profile');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Fetch user's gallery submissions for the profile raid feed
    const getUserRaids = async (userId, limitCount = 10) => {
        try {
            const { data, error } = await supabase
                .from('gallery_posts')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limitCount);

            if (error) throw error;

            // Transform back to expected format if needed, mainly camelCase
            return data.map(post => ({
                id: post.id,
                ...post,
                userId: post.user_id,
                displayGame: post.game, // Ensure compatibility
                score: post.score || 0
            }));
        } catch (err) {
            console.error('Error fetching user raids:', err);
            return [];
        }
    };

    return {
        profile,
        loading,
        error,
        getProfileByUsername,
        getMyProfile,
        checkUsernameAvailable,
        uploadAvatar,
        updateProfile,
        getUserRaids
    };
};

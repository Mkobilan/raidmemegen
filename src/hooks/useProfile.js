import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import {
    doc,
    getDoc,
    updateDoc,
    query,
    collection,
    where,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export const useProfile = (currentUser = null) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch profile by username (for public viewing)
    const getProfileByUsername = async (username) => {
        setLoading(true);
        setError(null);
        try {
            // Query for user with this username
            const q = query(
                collection(db, 'users'),
                where('username', '==', username.toLowerCase())
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError('Profile not found');
                setProfile(null);
                return null;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = { id: userDoc.id, ...userDoc.data() };

            // Don't expose sensitive fields publicly
            const publicProfile = {
                id: userData.id,
                username: userData.username,
                displayName: userData.displayName,
                bio: userData.bio || '',
                avatarUrl: userData.avatarUrl || '',
                gamesPlaying: userData.gamesPlaying || [],
                gamerTags: userData.gamerTags || {},
                socialLinks: userData.socialLinks || {},
                isPro: userData.isPro || false,
                createdAt: userData.createdAt,
                // Stats
                raidStats: userData.raidStats || {
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
            setError('Failed to load profile');
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
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                setError('Profile not found');
                return null;
            }

            const userData = { id: userDoc.id, ...userDoc.data() };
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

        // Check format (alphanumeric and underscores only)
        if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
            return false;
        }

        try {
            const q = query(
                collection(db, 'users'),
                where('username', '==', normalizedUsername)
            );
            const querySnapshot = await getDocs(q);

            // Available if no results, OR if the only result is the current user
            if (querySnapshot.empty) return true;
            if (currentUser && querySnapshot.docs[0].id === currentUser.uid) return true;

            return false;
        } catch (err) {
            console.error('Error checking username:', err);
            return false;
        }
    };

    // Upload avatar to Firebase Storage
    const uploadAvatar = async (file) => {
        if (!currentUser || !file) return null;

        console.log('Starting uploadAvatar with:', {
            uid: currentUser.uid,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileObject: file
        });

        try {
            // Create a unique reference to avoid 412 Precondition Failed (overwrite conflicts)
            // Using a timestamp ensures we are always creating a NEW file
            const filename = `avatars/${currentUser.uid}_${Date.now()}`;
            const avatarRef = ref(storage, filename);

            // Nuclear Option: Manual REST API Upload
            // The Firebase SDK triggers 412 Precondition Failed errors in this environment.
            // We bypass the SDK entirely and use raw fetch() with the Auth Token.

            const bucketName = "raidmemegen.firebasestorage.app";
            // URL Encode the filename path (avatars/uid_timestamp)
            const encodedName = encodeURIComponent(filename);
            const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodedName}`;

            console.log('Uploading via REST to:', uploadUrl);

            // Get Auth Token
            const token = await currentUser.getIdToken();

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': file.type
                },
                body: file
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`REST Upload Failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();

            // Construct download URL manually or use the one from response metadata
            // Format: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<name>?alt=media&token=<token>
            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media&token=${data.downloadTokens}`;

            return downloadUrl;
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
            const userDocRef = doc(db, 'users', currentUser.uid);

            // Prepare update data
            const updateData = {
                ...profileData,
                displayName: profileData.username || profileData.displayName, // Sync display name with username
                updatedAt: serverTimestamp()
            };

            // Normalize username if provided
            if (updateData.username) {
                updateData.username = updateData.username.toLowerCase().trim();

                // Verify username is still available
                const isAvailable = await checkUsernameAvailable(updateData.username);
                if (!isAvailable) {
                    throw new Error('Username is not available');
                }
            }

            await updateDoc(userDocRef, updateData);

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
            const q = query(
                collection(db, 'gallery'),
                where('userId', '==', userId)
            );
            const querySnapshot = await getDocs(q);

            const raids = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by createdAt descending (newest first)
            raids.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });

            return raids.slice(0, limitCount);
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

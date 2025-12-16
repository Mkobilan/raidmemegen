import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    increment,
    startAfter
} from 'firebase/firestore';

const ITEMS_PER_PAGE = 12;

export const useGallery = (user) => {
    const [submissions, setSubmissions] = useState([]);
    const [featuredSubmission, setFeaturedSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [userVotes, setUserVotes] = useState({}); // { submissionId: 'up' | 'down' }
    const [gameFilter, setGameFilter] = useState('all');

    // Fetch user's votes
    const fetchUserVotes = useCallback(async () => {
        if (!user) return;

        try {
            const votesSnapshot = await getDocs(
                collection(db, 'users', user.uid, 'votes')
            );
            const votes = {};
            votesSnapshot.forEach((doc) => {
                votes[doc.id] = doc.data().type;
            });
            setUserVotes(votes);
        } catch (error) {
            console.error('Error fetching user votes:', error);
        }
    }, [user]);

    // Fetch gallery submissions - simplified to avoid composite index
    const fetchSubmissions = useCallback(async (reset = false) => {
        setLoading(true);
        try {
            let q;
            // Use simple ordering to avoid composite indexes
            // We'll sort by createdAt DESC (newest first) for simplicity
            const baseConstraints = [
                orderBy('createdAt', 'desc'),
                limit(ITEMS_PER_PAGE * 2) // Fetch more to allow for filtering
            ];

            if (!reset && lastDoc) {
                q = query(
                    collection(db, 'gallery'),
                    ...baseConstraints,
                    startAfter(lastDoc)
                );
            } else {
                q = query(collection(db, 'gallery'), ...baseConstraints);
            }

            const snapshot = await getDocs(q);
            let newSubmissions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side game filter
            if (gameFilter !== 'all') {
                newSubmissions = newSubmissions.filter(s => s.game === gameFilter);
            }

            setHasMore(snapshot.docs.length === ITEMS_PER_PAGE * 2);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);

            if (reset) {
                setSubmissions(newSubmissions);
            } else {
                setSubmissions(prev => [...prev, ...newSubmissions]);
            }
        } catch (error) {
            console.error('Error fetching gallery:', error);
        }
        setLoading(false);
    }, [gameFilter, lastDoc]);

    // Fetch featured submission (highest score) - simplified query
    const fetchFeatured = useCallback(async () => {
        try {
            // Simple query - just get most recent submissions and pick highest score
            const q = query(
                collection(db, 'gallery'),
                orderBy('createdAt', 'desc'),
                limit(20)
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                // Find the one with highest score from recent submissions
                const submissions = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Sort by score descending, pick the best
                const bestSubmission = submissions.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
                setFeaturedSubmission(bestSubmission);
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

        // Get user's username
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const username = userData.username || user.displayName || user.email?.split('@')[0] || 'Anonymous';

        const submission = {
            // Plan data
            game: plan.game,
            raid: plan.raid,
            squadSize: plan.squadSize,
            vibe: plan.vibe,
            phases: plan.phases,
            title: plan.title || `${plan.game} - ${plan.raid}`,

            // User data
            userId: user.uid,
            username: username,
            userDisplayName: user.displayName || username,

            // Gallery metadata
            description: description,
            score: 0,
            upvotes: 0,
            downvotes: 0,
            views: 0,

            // Timestamps
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'gallery'), submission);

        // Reset and refetch
        setLastDoc(null);
        await fetchSubmissions(true);

        return docRef.id;
    };

    // Vote on a submission
    const vote = async (submissionId, voteType) => {
        if (!user) {
            throw new Error('Must be logged in to vote');
        }

        const currentVote = userVotes[submissionId];
        const submissionRef = doc(db, 'gallery', submissionId);
        const userVoteRef = doc(db, 'users', user.uid, 'votes', submissionId);

        try {
            if (currentVote === voteType) {
                // Remove vote
                await deleteDoc(userVoteRef);
                await updateDoc(submissionRef, {
                    [voteType === 'up' ? 'upvotes' : 'downvotes']: increment(-1),
                    score: increment(voteType === 'up' ? -1 : 1)
                });

                setUserVotes(prev => {
                    const newVotes = { ...prev };
                    delete newVotes[submissionId];
                    return newVotes;
                });

                // Update local submission
                setSubmissions(prev => prev.map(s =>
                    s.id === submissionId
                        ? {
                            ...s,
                            [voteType === 'up' ? 'upvotes' : 'downvotes']: s[voteType === 'up' ? 'upvotes' : 'downvotes'] - 1,
                            score: s.score + (voteType === 'up' ? -1 : 1)
                        }
                        : s
                ));
            } else {
                // Add or change vote
                const updates = {
                    [voteType === 'up' ? 'upvotes' : 'downvotes']: increment(1),
                    score: increment(voteType === 'up' ? 1 : -1)
                };

                // If changing vote, also decrement the old vote
                if (currentVote) {
                    updates[currentVote === 'up' ? 'upvotes' : 'downvotes'] = increment(-1);
                    updates.score = increment(voteType === 'up' ? 2 : -2); // +1 for new, +1 for removing old (or reverse)
                }

                await updateDoc(submissionRef, updates);
                await addDoc(collection(db, 'users', user.uid, 'votes'), {}).catch(() => { }); // Ensure collection exists

                // Use setDoc instead to overwrite
                const { setDoc } = await import('firebase/firestore');
                await setDoc(userVoteRef, { type: voteType, submissionId, votedAt: serverTimestamp() });

                setUserVotes(prev => ({ ...prev, [submissionId]: voteType }));

                // Update local submission
                setSubmissions(prev => prev.map(s => {
                    if (s.id !== submissionId) return s;

                    let newUpvotes = s.upvotes;
                    let newDownvotes = s.downvotes;

                    if (voteType === 'up') {
                        newUpvotes += 1;
                        if (currentVote === 'down') newDownvotes -= 1;
                    } else {
                        newDownvotes += 1;
                        if (currentVote === 'up') newUpvotes -= 1;
                    }

                    return {
                        ...s,
                        upvotes: newUpvotes,
                        downvotes: newDownvotes,
                        score: newUpvotes - newDownvotes
                    };
                }));
            }
        } catch (error) {
            console.error('Error voting:', error);
            throw error;
        }
    };

    // Delete own submission
    const deleteSubmission = async (submissionId) => {
        if (!user) throw new Error('Must be logged in');

        const submissionDoc = await getDoc(doc(db, 'gallery', submissionId));
        if (!submissionDoc.exists() || submissionDoc.data().userId !== user.uid) {
            throw new Error('Cannot delete submission you do not own');
        }

        await deleteDoc(doc(db, 'gallery', submissionId));
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
        setLastDoc(null);
        setSubmissions([]);
    };

    // Initial fetch
    useEffect(() => {
        fetchSubmissions(true);
        fetchFeatured();
    }, [gameFilter]);

    // Fetch user votes when user changes
    useEffect(() => {
        if (user) {
            fetchUserVotes();
        } else {
            setUserVotes({});
        }
    }, [user, fetchUserVotes]);

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
            setLastDoc(null);
            fetchSubmissions(true);
            fetchFeatured();
        }
    };
};

import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteField, runTransaction } from 'firebase/firestore';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [pro, setPro] = useState(false);
    const [gensCount, setGensCount] = useState(0);

    const getUTCToday = () => new Date().toISOString().split('T')[0];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            setUser(authUser);
            if (authUser) {
                // Fetch User Data
                const userDocRef = doc(db, 'users', authUser.uid);
                try {
                    const userDoc = await getDoc(userDocRef);
                    const today = getUTCToday();

                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const lastReset = data.lastResetDate || '';
                        let todayGens = data.gensToday || 0;

                        if (lastReset !== today) {
                            todayGens = 0;
                            await updateDoc(userDocRef, { gensToday: 0, lastResetDate: today });
                        }

                        // Migration logic
                        const rawPro = data.isPro ?? data.pro ?? false;
                        if (data.pro !== undefined && data.isPro === undefined) {
                            await updateDoc(userDocRef, { isPro: rawPro, pro: deleteField() });
                        }

                        setPro(rawPro);
                        setGensCount(todayGens);
                    } else {
                        // New User Init
                        await setDoc(userDocRef, {
                            isPro: false,
                            gensToday: 0,
                            lastResetDate: today,
                            displayName: authUser.displayName || authUser.email.split('@')[0],
                            createdAt: serverTimestamp()
                        });
                        setPro(false);
                        setGensCount(0);
                    }
                } catch (error) {
                    console.error('Error fetching user doc:', error);
                    setPro(false);
                    setGensCount(0);
                }
            } else {
                setPro(false);
                setGensCount(0);
            }
            setAuthLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signup = async (email, password, displayName) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName && result.user) {
            await updateProfile(result.user, { displayName });
        }
        return result;
    };

    const logout = () => signOut(auth);

    const incrementGens = async () => {
        if (!user || pro) return;

        await runTransaction(db, async (transaction) => {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error('User doc missing');

            const data = userDoc.data();
            const today = getUTCToday();
            let todayGens = data.gensToday || 0;
            const lastReset = data.lastResetDate || '';

            if (lastReset !== today) {
                todayGens = 1;
                transaction.update(userDocRef, { gensToday: todayGens, lastResetDate: today });
            } else if (todayGens < 3) {
                todayGens += 1;
                transaction.update(userDocRef, { gensToday: todayGens });
            } else {
                throw new Error('Daily limit reached');
            }
            setGensCount(todayGens);
        });
    };

    const refreshUser = async () => {
        if (!user) return;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            setPro(data.isPro ?? data.pro ?? false);
            setGensCount(data.gensToday || 0);
        }
    };

    return {
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
};

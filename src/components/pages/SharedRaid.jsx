
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LZString from 'lz-string';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import RaidPlan from '../raid/RaidPlan';
import { useAuth } from '../../hooks/useAuth';

import { supabase } from '../../supabaseClient'; // Import Supabase
import { Sword } from 'lucide-react';

const SharedRaid = () => {
    const [searchParams] = useSearchParams();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user, pro, logout } = useAuth();

    useEffect(() => {
        const loadRaid = () => {
            try {
                const data = searchParams.get('data');
                if (!data) {
                    setError('No raid data found in link.');
                    setLoading(false);
                    return;
                }

                const decompressed = LZString.decompressFromEncodedURIComponent(data);
                if (!decompressed) {
                    setError('Invalid or corrupted link.');
                    setLoading(false);
                    return;
                }

                const parsedPlan = JSON.parse(decompressed);
                setPlan(parsedPlan);
            } catch (err) {
                console.error(err);
                setError('Failed to load raid data.');
            } finally {
                setLoading(false);
            }
        };

        loadRaid();
    }, [searchParams]);

    const handleStartWarRoom = async () => {
        if (!user) {
            alert('Please login to start a War Room!');
            navigate('/'); // Or open auth modal if possible, but redirect is safer for now
            return;
        }
        if (!plan) return;

        try {
            const { data, error } = await supabase
                .from('rooms')
                .insert([{
                    host_id: user.id,
                    game: plan.game,
                    active_plan: plan
                }])
                .select()
                .single();

            if (error) throw error;
            // Navigate to room
            window.location.href = `/room/${data.id}`;
        } catch (error) {
            console.error("Error creating war room:", error);
            alert("Failed to initialize War Room.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white font-gamer text-xl">
                DECODING TRANSMISSION...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-raid-neon selection:text-black flex flex-col">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>

            <div className="relative z-10 flex-grow flex flex-col">
                <Navbar
                    user={user}
                    isPro={pro}
                    onLoginClick={() => navigate('/')}
                    onLogoutClick={logout}
                    onSavedClick={() => navigate('/')}
                />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 w-full flex-grow">
                    <div className="text-center mb-8">
                        <span className="text-gray-400 text-sm uppercase tracking-widest mb-2 block">Incoming Transmission</span>
                        <h1 className="text-3xl font-gamer text-white text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-blue-500">
                            SHARED RAID PROTOCOL
                        </h1>
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                    </div>

                    {!error && plan && (
                        <RaidPlan
                            plan={plan}
                            onExportPDF={() => {
                                alert("Please generate your own raid to use the PDF export feature!");
                            }}
                            onShare={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert("Link copied!");
                            }}
                            onSave={() => {
                                alert("Head to the home page to generate and save your own raids!");
                                navigate('/');
                            }}
                            onStartWarRoom={handleStartWarRoom}
                        />
                    )}

                    {!error && !plan && (
                        <div className="text-center text-gray-400">
                            No plan data available.
                        </div>
                    )}
                </main>

                <Footer />
            </div>
        </div>
    );
};

export default SharedRaid;

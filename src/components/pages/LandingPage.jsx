
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Zap,
    Users,
    Laugh,
    Layout,
    FileDown,
    Gamepad2,
    ArrowRight,
    ShieldCheck,
    Trophy,
    Rocket
} from 'lucide-react';
import BentoCard from '../landing/BentoCard';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import { useAuth } from '../../hooks/useAuth';
import warroomPreview from '../../assets/warroom_preview.png';

const LandingPage = () => {
    const { user, pro, logout } = useAuth();

    const features = [
        {
            title: "AI-Powered Raid Logic",
            description: "Sophisticated algorithms generate context-aware raid plans for Destiny 2, WoW, and more. No more generic strategies.",
            icon: Zap,
        },
        {
            title: "Live Collab War Room",
            description: "Real-time synchronization for your entire squad. Coordinate movements and assignments in a shared digital space.",
            icon: Users,
        },
        {
            title: "Meme Chaos Mode",
            description: "Turn wipes into wins with generated roasts, funny assignments, and pure meme energy for your casual runs.",
            icon: Laugh,
        },
        {
            title: "Streamer Overlays",
            description: "Integrate your raid plan directly into OBS. Keep your audience informed with professional-grade dynamic overlays.",
            icon: Layout,
        },
        {
            title: "Export & Share",
            description: "Generate high-fidelity PDFs or images of your mission plans. Share via custom links instantly.",
            icon: FileDown,
        },
        {
            title: "Cross-Game Support",
            description: "From Helldivers 2 to FFXIV, we support the titles you play most with specific encounter data.",
            icon: Gamepad2,
        }
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-raid-neon selection:text-black flex flex-col overflow-x-hidden">
            {/* Background Noise & Glow */}
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-raid-neon/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 flex-grow">
                <Navbar
                    user={user}
                    isPro={pro}
                    onLoginClick={() => window.location.href = '/war-room'}
                    onLogoutClick={logout}
                    onSavedClick={() => window.location.href = '/war-room'}
                />

                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-4 md:pt-48 md:pb-32 overflow-hidden">
                    <div className="max-w-7xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <h1 className="text-5xl md:text-8xl font-gamer font-extrabold tracking-tight mb-6">
                                STOP THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-wipe-red to-orange-500">WIPES</span>.<br />
                                START THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-raid-neon to-blue-400">LAUGHS</span>.
                            </h1>
                            <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl mb-10 leading-relaxed">
                                The ultimate <strong className="text-white">raid strategy generator</strong> and <strong className="text-white">squad tactics tool</strong> for Destiny 2, WoW, and beyond. Build professional plans or embrace pure meme chaos.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link to="/war-room" className="group relative px-8 py-4 bg-raid-neon text-black font-gamer font-bold rounded-full overflow-hidden transition-all hover:pr-12">
                                    <span className="relative z-10">BUILD YOUR RAID PLAN</span>
                                    <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all h-5 w-5" />
                                </Link>
                                <Link to="/gallery" className="px-8 py-4 border border-gray-800 hover:border-raid-neon/50 text-white font-gamer font-bold rounded-full transition-colors backdrop-blur-sm">
                                    BROWSE GALLERY
                                </Link>
                            </div>
                        </motion.div>

                        {/* Hero Visual Mockup */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="mt-20 relative max-w-5xl mx-auto rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden group"
                        >
                            <div className="h-8 bg-gray-800 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                                <span className="text-[10px] text-gray-500 font-gamer ml-2 uppercase tracking-widest">Live War Room Terminal</span>
                            </div>
                            <div className="aspect-video relative overflow-hidden bg-gray-900 flex items-center justify-center">
                                <img
                                    src={warroomPreview}
                                    alt="Raid War Room Mockup"
                                    className="w-full h-full object-contain transition-opacity duration-500"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none"></div>

                                {/* Decorative HUD Scanline */}
                                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-20 opacity-20"></div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* System Capabilities Section (Formerly Stats) */}
                <section className="py-12 border-y border-gray-900 bg-gray-900/10 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                { label: "Architecture", value: "AI POWERED", icon: Zap },
                                { label: "Collaboration", value: "LIVE SYNC", icon: Users },
                                { label: "Compatibility", value: "MULTI-GAME", icon: Gamepad2 },
                                { label: "Broadcast", value: "PRO OVERLAYS", icon: Layout },
                            ].map((stat, i) => (
                                <div key={i} className="text-center group">
                                    <div className="inline-flex mb-2 text-raid-neon group-hover:scale-110 transition-transform">
                                        <stat.icon className="h-5 w-5" />
                                    </div>
                                    <div className="text-xl md:text-2xl font-gamer font-bold text-white tracking-widest group-hover:text-raid-neon transition-colors">{stat.value}</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Bento Grid */}
                <section className="py-24 px-4 bg-gray-950 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto mb-16 text-center">
                        <h2 className="text-3xl md:text-5xl font-gamer font-bold mb-4">ENGINEERED FOR VICTORY</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">Everything you need to lead your fireteam. Nothing you don't. Professional power meets meme-ready chaos.</p>
                    </div>

                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <BentoCard
                                key={i}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                                delay={i * 0.1}
                            />
                        ))}
                    </div>
                </section>

                {/* Pricing/Premium Teaser */}
                <section className="py-24 px-4 relative">
                    <div className="max-w-5xl mx-auto rounded-[3rem] p-12 md:p-20 bg-gradient-to-br from-gray-900 to-black border border-gray-800 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-raid-neon/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <Rocket className="h-16 w-16 text-raid-neon mx-auto mb-8 animate-bounce" />
                            <h2 className="text-4xl md:text-6xl font-gamer font-bold mb-6">READY TO LEVEL UP?</h2>
                            <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto">
                                Join the pro tier for just $5/month. Get unlimited generations, premium export templates, and early access to new game integrations.
                            </p>
                            <Link to="/war-room" className="px-12 py-5 bg-white text-black font-gamer font-bold rounded-full hover:scale-105 transition-transform inline-block shadow-2xl shadow-raid-neon/20">
                                GET STARTED FOR FREE
                            </Link>
                        </div>
                    </div>
                </section>

                {/* SEO HUB SECTION */}
                <section className="py-20 px-4 bg-gray-900/20">
                    <div className="max-w-4xl mx-auto text-center border-t border-gray-800 pt-16">
                        <h3 className="text-2xl font-gamer text-gray-400 mb-8 tracking-widest uppercase">The Ultimate Raid Preparation Hub</h3>
                        <p className="text-gray-500 leading-relaxed text-sm md:text-base italic">
                            Our <strong className="text-gray-300">raid strategy generator</strong> is the definitive <strong className="text-gray-300">MMO raid tool</strong> for serious squad leaders and meme-loving fireteams alike. Whether you need a <strong className="text-gray-300">Destiny 2 raid planner</strong> for your next Salvation's Edge run, a <strong className="text-gray-300">WoW boss strategy</strong> for mythic progression, or a <strong className="text-gray-300">Helldivers 2 mission planning</strong> tool to spread managed democracy, we've got you covered. This is more than just a <strong className="text-gray-300">raid guide generator</strong>; it's a comprehensive <strong className="text-gray-300">team strategy tool</strong> designed to eliminate wipes and maximize chaos. From <strong className="text-gray-300">FFXIV raid comp</strong> optimization to <strong className="text-gray-300">guild raid planning</strong>, Raid Meme Gen is the only <strong className="text-gray-300">boss planner</strong> you'll ever need.
                        </p>
                    </div>
                </section>
            </div>

            <Footer />
        </div>
    );
};

export default LandingPage;

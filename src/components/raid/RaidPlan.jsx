import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Clock, Terminal, ZoomIn, Palette } from 'lucide-react';
import Card from '../ui/Card';
import PhaseDetailsModal from './PhaseDetailsModal';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const RaidPlan = ({ plan, onExportPDF, onShare, onSave, onCreateOverlay }) => {
    const [selectedPhase, setSelectedPhase] = useState(null);

    if (!plan) return null;

    const chartData = {
        labels: plan.phases.map(p => p.name),
        datasets: [{
            label: 'Est. Time (mins)',
            data: plan.phases.map(p => p.time),
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            tension: 0.4,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#00ff88',
            pointRadius: 4,
        }],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#00ff88',
                bodyColor: '#fff',
                borderColor: '#334155',
                borderWidth: 1
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const item = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto mt-12" data-raid-plan>
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-gamer font-bold text-white flex items-center">
                    <Terminal className="text-raid-neon mr-3" />
                    GENERATED PROTOCOL
                </h2>
                <div className="flex space-x-4">
                    <button
                        onClick={onShare}
                        className="flex items-center bg-raid-neon/10 hover:bg-raid-neon/20 text-raid-neon px-4 py-2 rounded border border-raid-neon/50 transition-all shadow-[0_0_10px_rgba(0,255,136,0.1)] hover:shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                    >
                        <Share2 className="w-4 h-4 mr-2" /> Share
                    </button>

                    <button
                        onClick={onSave}
                        className="bg-raid-neon/10 hover:bg-raid-neon/20 text-raid-neon px-4 py-2 rounded border border-raid-neon/50 flex items-center transition-all shadow-[0_0_10px_rgba(0,255,136,0.1)] hover:shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                    >
                        <ZoomIn className="w-4 h-4 mr-2" /> Save Plan
                    </button>

                    <button onClick={onExportPDF} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 flex items-center transition-colors">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </button>

                    {onCreateOverlay && (
                        <button
                            onClick={onCreateOverlay}
                            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-4 py-2 rounded border border-purple-500/50 flex items-center transition-all shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        >
                            <Palette className="w-4 h-4 mr-2" /> Overlays
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline Chart */}
            <Card title="Mission Timeline">
                <div className="h-64">
                    <Line data={chartData} options={chartOptions} />
                </div>
            </Card>

            {/* Phases Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {plan.phases.map((phase, idx) => (
                    <motion.div key={idx} variants={item} className="h-full">
                        <div
                            onClick={() => setSelectedPhase(phase)}
                            className="bg-gray-900 border border-gray-800 hover:border-raid-neon/50 rounded-xl overflow-hidden h-full flex flex-col hover:shadow-[0_0_15px_rgba(0,255,136,0.15)] transition-all duration-300 group cursor-pointer relative"
                        >
                            {/* Expand Hint */}
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded-full text-raid-neon">
                                <ZoomIn size={16} />
                            </div>

                            {/* Meme Header */}
                            <div className="relative h-48 overflow-hidden bg-black">
                                {phase.meme ? (
                                    <img
                                        src={phase.meme}
                                        alt="Phase Meme"
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-gamer bg-gray-950">
                                        NO SIGNAL
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/90 to-transparent">
                                    <div className="text-xs font-mono text-raid-neon uppercase tracking-wider">
                                        Phase {idx + 1} // {phase.time} MINS
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-grow flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-raid-neon transition-colors">
                                        {phase.name}
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
                                        {phase.text}
                                    </p>
                                </div>

                                <div className="border-t border-gray-800 pt-3 mt-2">
                                    <p className="text-xs text-gray-500 font-mono italic truncate">
                                        "{phase.quip}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <PhaseDetailsModal
                isOpen={!!selectedPhase}
                onClose={() => setSelectedPhase(null)}
                phase={selectedPhase}
            />
        </div>
    );
};

export default RaidPlan;

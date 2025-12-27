import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Quote } from 'lucide-react';
import { giphyService } from '../../services/giphyService';

const PhaseDetailsModal = ({ isOpen, onClose, phase }) => {
    if (!isOpen || !phase) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-gray-900 border border-raid-neon/30 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:text-raid-neon hover:bg-black/80 transition-all border border-transparent hover:border-raid-neon/50"
                    >
                        <X size={24} />
                    </button>

                    {/* Meme Image - Full width/height friendly */}
                    <div className="relative h-64 sm:h-80 bg-black flex items-center justify-center overflow-hidden shrink-0">
                        {phase.meme ? (
                            <img
                                src={phase.meme}
                                alt={phase.name}
                                className="w-full h-full object-contain cursor-pointer"
                                onClick={() => {
                                    if (phase.analytics && phase.analytics.onclick) {
                                        giphyService.trackEvent(phase.analytics.onclick.url);
                                    }
                                }}
                            />
                        ) : (
                            <div className="text-gray-600 font-gamer">NO SIGNAL</div>
                        )}
                        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-gray-900 to-transparent">
                            <h2 className="text-3xl font-gamer font-bold text-white drop-shadow-lg truncate">
                                {phase.name}
                            </h2>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 overflow-y-auto">
                        <div className="flex items-center space-x-4 mb-6 text-sm">
                            <div className="flex items-center text-raid-neon bg-raid-neon/10 px-3 py-1 rounded-full border border-raid-neon/20">
                                <Clock className="w-4 h-4 mr-2" />
                                <span className="font-bold">{phase.time} Minutes</span>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 mb-6">
                            <p className="text-lg text-gray-200 leading-relaxed font-medium">
                                {phase.text}
                            </p>
                        </div>

                        <div className="flex items-start text-gray-500 italic">
                            <Quote className="w-6 h-6 mr-3 text-gray-600 shrink-0" />
                            <p>"{phase.quip}"</p>
                        </div>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PhaseDetailsModal;

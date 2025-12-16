import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Play, Calendar } from 'lucide-react';

const SavedRaidsModal = ({ isOpen, onClose, savedRaids, onLoad, onDelete }) => {
    if (!isOpen) return null;

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
                    className="relative bg-gray-900 border border-raid-neon/30 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]"
                >
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-2xl font-gamer font-bold text-white">
                            MISSION ARCHIVE
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-4 space-y-3 flex-grow custom-scrollbar">
                        {savedRaids.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>No archived protocols found.</p>
                                <p className="text-sm mt-2">Generate a plan and hit Save to store it here.</p>
                            </div>
                        ) : (
                            savedRaids.map((raid) => (
                                <motion.div
                                    key={raid.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-gray-800/50 border border-gray-700 hover:border-raid-neon/50 rounded-lg p-4 flex items-center justify-between group transition-all"
                                >
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-white group-hover:text-raid-neon transition-colors">
                                            {raid.title}
                                        </h3>
                                        <div className="flex items-center text-xs text-gray-400 mt-1 space-x-3">
                                            <span className="flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {raid.createdAt?.toDate ? raid.createdAt.toDate().toLocaleDateString() : 'Unknown Date'}
                                            </span>
                                            <span className="bg-gray-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                                {raid.game} // {raid.raid}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={() => { onLoad(raid); onClose(); }}
                                            className="p-2 bg-raid-neon/10 text-raid-neon rounded hover:bg-raid-neon hover:text-black transition-colors"
                                            title="Load Plan"
                                        >
                                            <Play size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(raid.id)}
                                            className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                            title="Delete Archive"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SavedRaidsModal;

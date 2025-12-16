import { motion } from 'framer-motion';

const Card = ({ children, className = '', hoverEffect = true, title }) => {
    return (
        <motion.div
            whileHover={hoverEffect ? { scale: 1.02, boxShadow: "0 0 15px rgba(0, 255, 136, 0.3)" } : {}}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-gray-800/80 backdrop-blur-sm border border-green-500/30 rounded-lg p-6 shadow-lg ${className}`}
        >
            {title && (
                <h3 className="text-xl font-bold text-raid-neon mb-4 font-gamer tracking-wide uppercase border-b border-gray-700 pb-2">
                    {title}
                </h3>
            )}
            {children}
        </motion.div>
    );
};

export default Card;

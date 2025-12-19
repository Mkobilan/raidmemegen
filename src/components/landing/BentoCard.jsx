
import { motion } from 'framer-motion';

const BentoCard = ({ title, description, icon: Icon, className = "", delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className={`relative group overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/40 p-8 backdrop-blur-md hover:border-raid-neon/30 transition-colors ${className}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-raid-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800 group-hover:bg-raid-neon/10 transition-colors">
                    <Icon className="h-6 w-6 text-raid-neon" />
                </div>
                <h3 className="mb-2 font-gamer text-xl font-bold text-white group-hover:text-raid-neon transition-colors">
                    {title}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    {description}
                </p>
            </div>
        </motion.div>
    );
};

export default BentoCard;

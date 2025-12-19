import { Github, Twitter, Gamepad2 } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-gray-900 border-t border-gray-800 mt-12 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <Gamepad2 className="h-6 w-6 text-raid-neon" />
                        <span className="text-white font-gamer font-bold text-lg tracking-wider">RAID GEN</span>
                    </div>

                    <div className="text-gray-400 text-sm text-center md:text-right">
                        <p>&copy; {new Date().getFullYear()} Raid Meme Generator.</p>
                        <p className="mt-1">Built for gamers who wipe together.</p>
                    </div>

                </div>
            </div>
        </footer>
    );
};

export default Footer;

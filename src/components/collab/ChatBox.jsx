
import { useState, useRef, useEffect } from 'react';
import { useRealtimeRoom } from '../../hooks/useRealtimeRoom';
import { Send, User } from 'lucide-react';

const ChatBox = () => {
    const { chatMessages, sendMessage, currentUser } = useRealtimeRoom();
    const [msg, setMsg] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!msg.trim()) return;
        sendMessage(msg);
        setMsg('');
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
            <div className="p-4 border-b border-gray-800">
                <h3 className="text-raid-neon font-gamer text-lg">SQUAD COMMS</h3>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent" ref={scrollRef}>
                {chatMessages.map((m) => {
                    const isMe = m.user_id === currentUser?.id;
                    return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`text-xs text-gray-500 mb-1 flex items-center ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <User className="w-3 h-3 mx-1" />
                                {m.username}
                            </div>
                            <div className={`px-3 py-2 rounded-lg max-w-[85%] break-words ${isMe ? 'bg-raid-neon/20 text-raid-neon border border-raid-neon/30' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>
                                {m.content}
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-800 flex gap-2">
                <input
                    type="text"
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Type intel..."
                    className="flex-grow bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-raid-neon outline-none"
                    maxLength={200}
                />
                <button
                    type="submit"
                    className="bg-raid-neon text-black p-2 rounded hover:bg-green-400 transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatBox;

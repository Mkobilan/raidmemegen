
import { useRealtimeRoom } from '../../hooks/useRealtimeRoom';
import { MousePointer2 } from 'lucide-react';

const CursorOverlay = () => {
    const { cursors, currentUser } = useRealtimeRoom();

    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {Object.entries(cursors).map(([userId, cursor]) => {
                // Don't show my own cursor
                if (userId === currentUser?.id) return null;

                return (
                    <div
                        key={userId}
                        className="absolute transition-transform duration-100 ease-linear flex flex-col items-start"
                        style={{
                            left: 0,
                            top: 0,
                            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
                        }}
                    >
                        <MousePointer2
                            className="w-5 h-5"
                            style={{
                                color: cursor.color || '#00ff88',
                                fill: cursor.color || '#00ff88'
                            }}
                        />
                        <div
                            className="ml-4 -mt-2 px-2 py-0.5 rounded text-xs font-bold text-black whitespace-nowrap"
                            style={{ backgroundColor: cursor.color || '#00ff88' }}
                        >
                            {cursor.username}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CursorOverlay;

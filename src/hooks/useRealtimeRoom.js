
import { useRealtime } from '../context/RealtimeContext';

export const useRealtimeRoom = () => {
    const context = useRealtime(); // Already exported from Context file
    if (context === undefined) {
        throw new Error('useRealtimeRoom must be used within a RealtimeProvider');
    }
    return context;
};

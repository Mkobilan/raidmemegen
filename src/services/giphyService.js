const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

export const giphyService = {
    /**
     * Get or generate a Random ID for GIPHY session.
     * Caches in sessionStorage to persist across page reloads during the same session.
     */
    async getRandomId() {
        let randomId = sessionStorage.getItem('giphy_random_id');
        if (randomId) return randomId;

        if (!GIPHY_API_KEY) return null;

        try {
            const res = await fetch(`https://api.giphy.com/v1/randomid?api_key=${GIPHY_API_KEY}`);
            const json = await res.json();
            if (json.data && json.data.random_id) {
                randomId = json.data.random_id;
                sessionStorage.setItem('giphy_random_id', randomId);
                return randomId;
            }
        } catch (error) {
            console.error('Giphy Random ID Error:', error);
        }
        return null;
    },

    /**
     * Search GIFs using the GIPHY Search endpoint.
     */
    async searchGifs(query, limit = 1, offset = 0, rating = 'pg-13') {
        if (!GIPHY_API_KEY) throw new Error('No Giphy API Key found');

        const randomId = await this.getRandomId();
        const params = new URLSearchParams({
            api_key: GIPHY_API_KEY,
            q: query,
            limit: limit.toString(),
            offset: offset.toString(),
            rating: rating,
            bundle: 'messaging_non_clips' // Recommended for mobile/web messaging apps
        });

        if (randomId) {
            params.append('random_id', randomId);
        }

        try {
            const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`);
            const data = await res.json();
            return data;
        } catch (error) {
            console.error('Giphy Search Error:', error);
            throw error;
        }
    },

    /**
     * Send a tracking ping to GIPHY Analytics.
     * @param {string} url - The base tracking URL from the GIPHY API response.
     */
    async trackEvent(url) {
        if (!url) return;

        try {
            const randomId = await this.getRandomId();
            const baseUrl = new URL(url);
            
            baseUrl.searchParams.append('ts', Date.now().toString());
            if (randomId) {
                baseUrl.searchParams.append('random_id', randomId);
            }

            // Fire and forget
            fetch(baseUrl.toString()).catch(e => console.error('Giphy Analytics Failure:', e));
        } catch (error) {
            console.error('Giphy Track Event Error:', error);
        }
    }
};

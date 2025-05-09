const { TENOR_API_KEY, TENOR_API_URL } = require('../config/tenor');

class TenorService {
    static async searchGifs(query, limit = 8) {
        try {
            const response = await fetch(
                `${TENOR_API_URL}/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=${limit}`
            );
            
            if (!response.ok) {
                throw new Error(`Erreur API Tenor: ${response.status}`);
            }

            const data = await response.json();
            return data.results.map(result => ({
                url: result.media_formats.gif.url,
                preview: result.media_formats.tinygif.url,
                title: result.title
            }));
        } catch (error) {
            console.error('Erreur lors de la recherche de GIFs:', error);
            return [];
        }
    }
}

module.exports = TenorService;
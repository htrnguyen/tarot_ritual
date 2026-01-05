export async function fetchTarotData() {
    try {
        const response = await fetch('riderwaite_tarot.json');
        if (!response.ok) throw new Error('Failed to load tarot data');
        const RAW_DATA = await response.json();
        
        return Object.values(RAW_DATA).map(card => ({
            name: card.name_vi,
            name_en: card.name_en,
            url: card.image_url,
            core_message: card.core_message,
            keywords: card.keywords,
            daily_guidance: card.daily_guidance,
            reflection_question: card.reflection_question
        }));
    } catch (error) {
        console.error('Error loading tarot data:', error);
        return [];
    }
}

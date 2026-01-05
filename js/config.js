export const RITUAL_STATE = {
    IDLE: 'idle',
    PREPARING: 'preparing',
    SHUFFLING: 'shuffling',
    STOPPING: 'stopping',
    FINISHED: 'finished'
};

export const CARD_CONFIG = {
    cardWidth: 0.8,
    cardHeight: 1.5,
    tiers: [
        { count: 18, radius: 6.0 },
        { count: 26, radius: 9.0 },
        { count: 34, radius: 12.0 }
    ]
};

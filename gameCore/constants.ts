/**
 * Game constants and configuration
 */

export const BOARD_SIZE = 10

export const NUM_PLAYERS_MIN = 2
export const NUM_PLAYERS_MAX = 4

export const SCORE_TO_WIN = 4
export const CHIPS_IN_SCORE = 5

export const CARDS_PER_DECK = 52
export const DECKS_IN_GAME = 2
export const JOKERS_PER_DECK = 2
export const JOKERS_IN_GAME = JOKERS_PER_DECK * DECKS_IN_GAME // 2 × 2 = 4
export const TOTAL_CARDS = CARDS_PER_DECK * DECKS_IN_GAME + JOKERS_IN_GAME // 104 + 4 = 108
export const INITIAL_HAND_SIZE = 5 // Cards each player starts with


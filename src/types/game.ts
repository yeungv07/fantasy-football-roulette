export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K';

export type RosterSlotId =
  | 'QB'
  | 'RB1'
  | 'RB2'
  | 'WR1'
  | 'WR2'
  | 'TE'
  | 'FLX'
  | 'K';

export interface RosterSlotConfig {
  id: RosterSlotId;
  label: string;
  shortLabel: string;
  description: string;
  allowedPositions: Position[];
}

export const ROSTER_SLOTS: RosterSlotConfig[] = [
  {
    id: 'QB',
    label: 'QB',
    shortLabel: 'QB',
    description: 'Quarterback',
    allowedPositions: ['QB'],
  },
  {
    id: 'RB1',
    label: 'RB 1',
    shortLabel: 'RB',
    description: 'Running Back 1',
    allowedPositions: ['RB'],
  },
  {
    id: 'RB2',
    label: 'RB 2',
    shortLabel: 'RB',
    description: 'Running Back 2',
    allowedPositions: ['RB'],
  },
  {
    id: 'WR1',
    label: 'WR 1',
    shortLabel: 'WR',
    description: 'Wide Receiver 1',
    allowedPositions: ['WR'],
  },
  {
    id: 'WR2',
    label: 'WR 2',
    shortLabel: 'WR',
    description: 'Wide Receiver 2',
    allowedPositions: ['WR'],
  },
  {
    id: 'TE',
    label: 'TE',
    shortLabel: 'TE',
    description: 'Tight End',
    allowedPositions: ['TE'],
  },
  {
    id: 'FLX',
    label: 'FLX',
    shortLabel: 'FLX',
    description: 'Flex (RB / WR / TE)',
    allowedPositions: ['RB', 'WR', 'TE'],
  },
  {
    id: 'K',
    label: 'K',
    shortLabel: 'K',
    description: 'Kicker',
    allowedPositions: ['K'],
  },
];

export const MAX_SKIPS = 5;
export const MAX_HISTORY = 5;

export interface PlayerCardData {
  playerId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: Position;
  team: string | null;
  score: number;
  imageUrl: string;
  opponent?: string | null;
  number?: number | null;
}

export type RosterMap = Record<RosterSlotId, PlayerCardData | null>;

export interface RunHistoryEntry {
  id: string;
  timestamp: number;
  week: number;
  season: string;
  totalScore: number;
  skipsUsed: number;
  isNewHighScore?: boolean;
  roster: RosterMap;
}

export interface ActiveRunState {
  roster: RosterMap;
  currentPlayer: PlayerCardData | null;
  skipsLeft: number;
  seenPlayerIds: string[];
  isComplete: boolean;
  week: number;
  season: string;
  isNewHighScore: boolean;
}

export function createEmptyRoster(): RosterMap {
  return {
    QB: null,
    RB1: null,
    RB2: null,
    WR1: null,
    WR2: null,
    TE: null,
    FLX: null,
    K: null,
  };
}

export function getPlayerImageUrl(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`;
}

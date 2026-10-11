import {
  ActiveRunState,
  createEmptyRoster,
  getPlayerImageUrl,
  MAX_HISTORY,
  MAX_SKIPS,
  PlayerCardData,
  Position,
  ROSTER_SLOTS,
  RosterMap,
  RosterSlotId,
  RunHistoryEntry,
} from '../types/game';

const COOKIE_HIGH_SCORE = 'ff_high_score';
const COOKIE_ACTIVE_RUN = 'ff_active_run';
const COOKIE_HISTORY = 'ff_history';

// Compact tuple for a player to stay well under the 4KB per-cookie browser limit:
// [playerId, firstName, lastName, position, team, score, opponent, number]
type CompactPlayer = [
  string,
  string,
  string,
  Position,
  string | null,
  number,
  string | null,
  number | null,
];

type CompactRoster = Partial<Record<RosterSlotId, CompactPlayer>>;

interface CompactActiveRun {
  r: CompactRoster;
  c: CompactPlayer | null;
  s: number; // skipsLeft
  p: string[]; // seenPlayerIds (capped to last 25 IDs)
  d: number; // isComplete (1 or 0)
  w: number; // week
  y: string; // season
  h: number; // isNewHighScore (1 or 0)
}

interface CompactHistoryEntry {
  i: string;
  t: number;
  w: number;
  y: string;
  s: number;
  u: number;
  h: number;
  r: CompactRoster;
}

function setSessionCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function getSessionCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const prefix = `${name}=`;
  for (const cookie of cookies) {
    if (cookie.startsWith(prefix)) {
      try {
        return decodeURIComponent(cookie.slice(prefix.length));
      } catch {
        return cookie.slice(prefix.length);
      }
    }
  }
  return null;
}

function encodePlayer(p: PlayerCardData): CompactPlayer {
  return [
    p.playerId,
    p.firstName,
    p.lastName,
    p.position,
    p.team ?? null,
    Number(p.score.toFixed(2)),
    p.opponent ?? null,
    p.number ?? null,
  ];
}

function decodePlayer(c: CompactPlayer | null | undefined): PlayerCardData | null {
  if (!c || !Array.isArray(c) || c.length < 6) return null;
  const [playerId, firstName, lastName, position, team, score, opponent, number] = c;
  return {
    playerId,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    position,
    team: team ?? null,
    score: typeof score === 'number' ? score : Number(score) || 0,
    imageUrl: getPlayerImageUrl(playerId),
    opponent: opponent ?? null,
    number: number ?? null,
  };
}

function encodeRoster(roster: RosterMap): CompactRoster {
  const compact: CompactRoster = {};
  for (const slot of ROSTER_SLOTS) {
    const player = roster[slot.id];
    if (player) {
      compact[slot.id] = encodePlayer(player);
    }
  }
  return compact;
}

function decodeRoster(compact: CompactRoster | undefined | null): RosterMap {
  const roster = createEmptyRoster();
  if (!compact) return roster;
  for (const slot of ROSTER_SLOTS) {
    const c = compact[slot.id];
    if (c) {
      roster[slot.id] = decodePlayer(c);
    }
  }
  return roster;
}

export function saveHighScoreCookie(score: number): void {
  setSessionCookie(COOKIE_HIGH_SCORE, String(Number(score.toFixed(2))));
}

export function loadHighScoreCookie(): number | null {
  const raw = getSessionCookie(COOKIE_HIGH_SCORE);
  if (raw === null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function saveActiveRunCookie(state: ActiveRunState): void {
  const compact: CompactActiveRun = {
    r: encodeRoster(state.roster),
    c: state.currentPlayer ? encodePlayer(state.currentPlayer) : null,
    s: state.skipsLeft,
    p: state.seenPlayerIds.slice(-25),
    d: state.isComplete ? 1 : 0,
    w: state.week,
    y: state.season,
    h: state.isNewHighScore ? 1 : 0,
  };
  setSessionCookie(COOKIE_ACTIVE_RUN, JSON.stringify(compact));
}

export function loadActiveRunCookie(): ActiveRunState | null {
  const raw = getSessionCookie(COOKIE_ACTIVE_RUN);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CompactActiveRun;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      roster: decodeRoster(parsed.r),
      currentPlayer: decodePlayer(parsed.c),
      skipsLeft:
        typeof parsed.s === 'number'
          ? Math.max(0, Math.min(MAX_SKIPS, parsed.s))
          : MAX_SKIPS,
      seenPlayerIds: Array.isArray(parsed.p) ? parsed.p : [],
      isComplete: parsed.d === 1,
      week: typeof parsed.w === 'number' ? parsed.w : 1,
      season: typeof parsed.y === 'string' ? parsed.y : '2026',
      isNewHighScore: parsed.h === 1,
    };
  } catch {
    return null;
  }
}

export function saveHistoryCookie(history: RunHistoryEntry[]): void {
  const trimmed = history.slice(0, MAX_HISTORY);
  const compact: CompactHistoryEntry[] = trimmed.map((entry) => ({
    i: entry.id,
    t: entry.timestamp,
    w: entry.week,
    y: entry.season,
    s: Number(entry.totalScore.toFixed(2)),
    u: entry.skipsUsed,
    h: entry.isNewHighScore ? 1 : 0,
    r: encodeRoster(entry.roster),
  }));
  setSessionCookie(COOKIE_HISTORY, JSON.stringify(compact));
}

export function loadHistoryCookie(): RunHistoryEntry[] {
  const raw = getSessionCookie(COOKIE_HISTORY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CompactHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HISTORY).map((item) => ({
      id: item.i || String(item.t),
      timestamp: item.t || Date.now(),
      week: item.w || 1,
      season: item.y || '2026',
      totalScore: typeof item.s === 'number' ? item.s : 0,
      skipsUsed: typeof item.u === 'number' ? item.u : 0,
      isNewHighScore: item.h === 1,
      roster: decodeRoster(item.r),
    }));
  } catch {
    return [];
  }
}

export function clearAllGameCookies(): void {
  if (typeof document === 'undefined') return;
  for (const name of [COOKIE_HIGH_SCORE, COOKIE_ACTIVE_RUN, COOKIE_HISTORY]) {
    document.cookie = `${name}=; path=/; max-age=0`;
  }
}

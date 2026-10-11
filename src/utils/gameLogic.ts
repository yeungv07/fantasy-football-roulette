import {
  Position,
  ROSTER_SLOTS,
  RosterMap,
  RosterSlotConfig,
  RosterSlotId,
} from '../types/game';
import {
  buildPlayerCardData,
  fetchActivePlayersByPosition,
  fetchPlayerWeeklyScore,
  RawSleeperPlayer,
} from '../services/sleeperApi';
import { PlayerCardData } from '../types/game';

/**
 * Returns all open roster slots that can accept the given position.
 * E.g. if roster is empty and position is 'RB', returns RB1, RB2, and FLX.
 */
export function getEligibleOpenSlotsForPosition(
  roster: RosterMap,
  position: Position
): RosterSlotConfig[] {
  return ROSTER_SLOTS.filter(
    (slot) => roster[slot.id] === null && slot.allowedPositions.includes(position)
  );
}

/**
 * Returns all positions that still have at least one open eligible slot on the roster.
 * E.g.:
 * - QB is eligible if QB slot is null
 * - RB is eligible if RB1, RB2, or FLX is null
 * - WR is eligible if WR1, WR2, or FLX is null
 * - TE is eligible if TE or FLX is null
 * - K is eligible if K is null
 */
export function getUnfilledPositions(roster: RosterMap): Position[] {
  const allPositions: Position[] = ['QB', 'RB', 'WR', 'TE', 'K'];
  return allPositions.filter(
    (pos) => getEligibleOpenSlotsForPosition(roster, pos).length > 0
  );
}

/**
 * Checks whether all 8 roster slots are filled.
 */
export function isRosterComplete(roster: RosterMap): boolean {
  return ROSTER_SLOTS.every((slot) => roster[slot.id] !== null);
}

/**
 * Counts how many slots are currently filled on the roster.
 */
export function getFilledSlotCount(roster: RosterMap): number {
  return ROSTER_SLOTS.filter((slot) => roster[slot.id] !== null).length;
}

/**
 * Calculates the total full PPR score across all filled slots in the roster.
 */
export function calculateRosterScore(roster: RosterMap): number {
  const total = ROSTER_SLOTS.reduce((sum, slot) => {
    const player = roster[slot.id];
    return sum + (player ? player.score : 0);
  }, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Returns the set of player IDs currently placed on the roster.
 */
export function getRosterPlayerIds(roster: RosterMap): Set<string> {
  const ids = new Set<string>();
  for (const slot of ROSTER_SLOTS) {
    const p = roster[slot.id];
    if (p) ids.add(p.playerId);
  }
  return ids;
}

/**
 * Picks a random unfilled position, weighted slightly by how many open slots require that position,
 * or uniformly among unfilled positions.
 */
export function pickRandomUnfilledPosition(roster: RosterMap): Position | null {
  const unfilled = getUnfilledPositions(roster);
  if (unfilled.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * unfilled.length);
  return unfilled[randomIndex];
}

/**
 * Draws a random active player in a position that is not yet filled,
 * fetches their full PPR score for the target week, and returns their card data.
 */
export async function drawRandomPlayerForRoster(
  roster: RosterMap,
  seenPlayerIds: string[],
  week: number,
  season: string
): Promise<PlayerCardData | null> {
  const unfilledPositions = getUnfilledPositions(roster);
  if (unfilledPositions.length === 0) {
    return null;
  }

  const chosenPosition =
    unfilledPositions[Math.floor(Math.random() * unfilledPositions.length)];

  const pool = await fetchActivePlayersByPosition(chosenPosition);
  if (!pool || pool.length === 0) {
    throw new Error(`No active players found for position ${chosenPosition}`);
  }

  const rosterIds = getRosterPlayerIds(roster);
  const seenSet = new Set(seenPlayerIds);

  // Prefer players neither on the roster nor seen in the current run
  let candidates: RawSleeperPlayer[] = pool.filter(
    (p) => !rosterIds.has(String(p.player_id)) && !seenSet.has(String(p.player_id))
  );

  // If all players in this position have been seen, exclude only players currently on the roster
  if (candidates.length === 0) {
    candidates = pool.filter((p) => !rosterIds.has(String(p.player_id)));
  }

  // Ultimate fallback if test pool only has 1 player total
  if (candidates.length === 0) {
    candidates = pool;
  }

  const pickedRaw = candidates[Math.floor(Math.random() * candidates.length)];
  const { score, opponent } = await fetchPlayerWeeklyScore(
    String(pickedRaw.player_id),
    week,
    season
  );

  return buildPlayerCardData(pickedRaw, chosenPosition, score, opponent);
}

/**
 * Returns the default recommended slot ID for a player, preferring natural position slots (e.g., RB1/RB2)
 * before FLX so the user preserves flex flexibility unless they explicitly select FLX.
 */
export function getDefaultSlotForPlayer(
  roster: RosterMap,
  position: Position
): RosterSlotId | null {
  const eligible = getEligibleOpenSlotsForPosition(roster, position);
  if (eligible.length === 0) return null;
  const naturalSlot = eligible.find((s) => s.id !== 'FLX');
  return (naturalSlot ?? eligible[0]).id;
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import {
  clearAllGameCookies,
  loadActiveRunCookie,
  loadHighScoreCookie,
  loadHistoryCookie,
} from '../utils/cookies';
import { clearSleeperCache } from '../services/sleeperApi';
import { createEmptyRoster, Position } from '../types/game';
import {
  getEligibleOpenSlotsForPosition,
  getUnfilledPositions,
} from '../utils/gameLogic';

const MOCK_PLAYERS: Record<Position, Record<string, any>> = {
  QB: {
    '4046': {
      player_id: '4046',
      first_name: 'Patrick',
      last_name: 'Mahomes',
      full_name: 'Patrick Mahomes',
      position: 'QB',
      active: true,
      status: 'Active',
      team: 'KC',
      depth_chart_order: 1,
      number: 15,
    },
  },
  RB: {
    '4034': {
      player_id: '4034',
      first_name: 'Christian',
      last_name: 'McCaffrey',
      full_name: 'Christian McCaffrey',
      position: 'RB',
      active: true,
      status: 'Active',
      team: 'SF',
      depth_chart_order: 1,
      number: 23,
    },
    '8155': {
      player_id: '8155',
      first_name: 'Breece',
      last_name: 'Hall',
      full_name: 'Breece Hall',
      position: 'RB',
      active: true,
      status: 'Active',
      team: 'NYJ',
      depth_chart_order: 1,
      number: 20,
    },
    '9221': {
      player_id: '9221',
      first_name: 'Jahmyr',
      last_name: 'Gibbs',
      full_name: 'Jahmyr Gibbs',
      position: 'RB',
      active: true,
      status: 'Active',
      team: 'DET',
      depth_chart_order: 1,
      number: 26,
    },
  },
  WR: {
    '6794': {
      player_id: '6794',
      first_name: 'Justin',
      last_name: 'Jefferson',
      full_name: 'Justin Jefferson',
      position: 'WR',
      active: true,
      status: 'Active',
      team: 'MIN',
      depth_chart_order: 1,
      number: 18,
    },
    '6786': {
      player_id: '6786',
      first_name: 'CeeDee',
      last_name: 'Lamb',
      full_name: 'CeeDee Lamb',
      position: 'WR',
      active: true,
      status: 'Active',
      team: 'DAL',
      depth_chart_order: 1,
      number: 88,
    },
  },
  TE: {
    '1466': {
      player_id: '1466',
      first_name: 'Travis',
      last_name: 'Kelce',
      full_name: 'Travis Kelce',
      position: 'TE',
      active: true,
      status: 'Active',
      team: 'KC',
      depth_chart_order: 1,
      number: 87,
    },
  },
  K: {
    '4227': {
      player_id: '4227',
      first_name: 'Harrison',
      last_name: 'Butker',
      full_name: 'Harrison Butker',
      position: 'K',
      active: true,
      status: 'Active',
      team: 'KC',
      depth_chart_order: 1,
      number: 7,
    },
  },
};

const MOCK_SCORES: Record<string, number> = {
  '4046': 24.5,
  '4034': 28.2,
  '8155': 19.4,
  '9221': 21.1,
  '6794': 26.8,
  '6786': 31.0,
  '1466': 16.5,
  '4227': 12.0,
};

function setupFetchMock() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/v1/state/nfl')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          week: 5,
          season: '2026',
          season_type: 'regular',
          display_week: 5,
        }),
      } as Response;
    }

    if (url.includes('/v1/players/nfl')) {
      const posMatch = url.match(/position=([A-Z]+)/);
      const pos = (posMatch?.[1] || 'QB') as Position;
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_PLAYERS[pos] || MOCK_PLAYERS.QB,
      } as Response;
    }

    if (url.includes('/stats/nfl/player/')) {
      const idMatch = url.match(/\/player\/([^?]+)/);
      const playerId = idMatch?.[1] || '4046';
      const pts = MOCK_SCORES[playerId] ?? 14.2;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          '4': {
            week: 4,
            season: '2026',
            opponent: 'BUF',
            stats: {
              pts_ppr: pts,
            },
          },
        }),
      } as Response;
    }

    throw new Error(`Unhandled fetch URL: ${url}`);
  });
}

describe('Fantasy Football Lineup Game', () => {
  beforeEach(() => {
    clearAllGameCookies();
    clearSleeperCache();
    vi.restoreAllMocks();
    setupFetchMock();
  });

  it('correctly determines eligible slots and unfilled positions including FLX', () => {
    const roster = createEmptyRoster();
    expect(getUnfilledPositions(roster)).toEqual(['QB', 'RB', 'WR', 'TE', 'K']);

    // RB can go into RB1, RB2, or FLX when empty
    const rbSlots = getEligibleOpenSlotsForPosition(roster, 'RB').map((s) => s.id);
    expect(rbSlots).toEqual(['RB1', 'RB2', 'FLX']);

    // QB can only go into QB
    const qbSlots = getEligibleOpenSlotsForPosition(roster, 'QB').map((s) => s.id);
    expect(qbSlots).toEqual(['QB']);
  });

  it('allows placing an RB/WR/TE directly into the FLX slot and persists mid-run state across page refresh', async () => {
    // Force Math.random to pick index 1 ('RB') on first draw
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);

    const { unmount } = render(<App />);

    await screen.findByTestId('player-card');
    expect(screen.getByTestId('player-position')).toHaveTextContent('RB');

    // Both RB1, RB2, and FLX should be offered as slot options
    const flxOption = screen.getByTestId('slot-option-FLX');
    expect(flxOption).toBeInTheDocument();

    // Choose FLX slot and click Accept
    fireEvent.click(flxOption);
    fireEvent.click(screen.getByTestId('accept-button'));

    await waitFor(() => {
      const flxSlot = screen.getByTestId('roster-slot-FLX');
      expect(flxSlot).toHaveTextContent('McCaffrey');
    });

    // Wait for next player and use 1 skip
    await screen.findByTestId('player-card');
    fireEvent.click(screen.getByTestId('skip-button'));
    await waitFor(() => {
      expect(screen.getByTestId('skips-remaining-count')).toHaveTextContent('4 / 5');
    });
    await screen.findByTestId('player-card');

    randomSpy.mockRestore();

    // Unmount and remount to simulate browser refresh mid-run
    unmount();
    render(<App />);

    expect(await screen.findByTestId('player-card')).toBeInTheDocument();
    expect(screen.getByTestId('skips-remaining-count')).toHaveTextContent('4 / 5');
    expect(screen.getByTestId('roster-slot-FLX')).toHaveTextContent('McCaffrey');
  });

  it('displays player card details, tracks skips, and disables skip button after 5 skips', async () => {
    render(<App />);

    const card = await screen.findByTestId('player-card');
    expect(card).toBeInTheDocument();

    // Verify player name, position, score, and image exist
    expect(screen.getByTestId('player-first-name')).toBeInTheDocument();
    expect(screen.getByTestId('player-last-name')).toBeInTheDocument();
    expect(screen.getByTestId('player-position')).toBeInTheDocument();
    expect(screen.getByTestId('player-score')).toHaveTextContent(/PTS/);

    // Verify skips start at 5 / 5
    expect(screen.getByTestId('skips-remaining-count')).toHaveTextContent('5 / 5');
    const skipBtn = screen.getByTestId('skip-button');
    expect(skipBtn).not.toBeDisabled();

    // Use all 5 skips
    for (let i = 4; i >= 0; i--) {
      fireEvent.click(screen.getByTestId('skip-button'));
      await waitFor(() => {
        expect(screen.getByTestId('skips-remaining-count')).toHaveTextContent(`${i} / 5`);
      });
      await screen.findByTestId('player-card');
    }

    // After 5 skips, skip button is disabled and user must accept manually
    expect(screen.getByTestId('skip-button')).toBeDisabled();
    expect(screen.getByTestId('accept-button')).not.toBeDisabled();
  });

  it('completes multiple runs, keeps the 5 most recent rosters and high score in session cookies', async () => {
    const { unmount } = render(<App />);

    // Play 6 full runs to verify history is capped at 5
    for (let run = 0; run < 6; run++) {
      for (let pick = 0; pick < 8; pick++) {
        await screen.findByTestId('player-card');
        fireEvent.click(screen.getByTestId('accept-button'));
      }
      await screen.findByTestId('run-summary-card');
      if (run < 5) {
        fireEvent.click(screen.getByTestId('try-again-button'));
      }
    }

    const savedHistory = loadHistoryCookie();
    expect(savedHistory).toHaveLength(5);

    const savedHighScore = loadHighScoreCookie();
    expect(savedHighScore).not.toBeNull();

    const savedRun = loadActiveRunCookie();
    expect(savedRun?.isComplete).toBe(true);

    // Simulate page refresh
    unmount();
    render(<App />);

    expect(await screen.findByTestId('run-summary-card')).toBeInTheDocument();
    expect(screen.getByTestId('history-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('history-item-4')).toBeInTheDocument();
    expect(screen.queryByTestId('history-item-5')).not.toBeInTheDocument();
  });
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveRunState,
  createEmptyRoster,
  MAX_HISTORY,
  MAX_SKIPS,
  PlayerCardData,
  RosterMap,
  RosterSlotId,
  RunHistoryEntry,
} from './types/game';
import {
  loadActiveRunCookie,
  loadHighScoreCookie,
  loadHistoryCookie,
  saveActiveRunCookie,
  saveHighScoreCookie,
  saveHistoryCookie,
} from './utils/cookies';
import { fetchNflState } from './services/sleeperApi';
import {
  calculateRosterScore,
  drawRandomPlayerForRoster,
  getDefaultSlotForPlayer,
  getEligibleOpenSlotsForPosition,
  isRosterComplete,
} from './utils/gameLogic';
import { PlayerCard } from './components/PlayerCard';
import { RosterBoard } from './components/RosterBoard';
import { RunSummaryCard } from './components/RunSummaryCard';
import { HistoryPanel } from './components/HistoryPanel';
import { Trophy, Flame, Calendar, HelpCircle } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const [highScore, setHighScore] = useState<number | null>(() => loadHighScoreCookie());
  const [history, setHistory] = useState<RunHistoryEntry[]>(() => loadHistoryCookie());

  const initialSavedRun = useRef<ActiveRunState | null | undefined>(undefined);
  if (initialSavedRun.current === undefined) {
    initialSavedRun.current = loadActiveRunCookie();
  }

  const [roster, setRoster] = useState<RosterMap>(
    () => initialSavedRun.current?.roster ?? createEmptyRoster()
  );
  const [currentPlayer, setCurrentPlayer] = useState<PlayerCardData | null>(
    () => initialSavedRun.current?.currentPlayer ?? null
  );
  const [skipsLeft, setSkipsLeft] = useState<number>(
    () => initialSavedRun.current?.skipsLeft ?? MAX_SKIPS
  );
  const [seenPlayerIds, setSeenPlayerIds] = useState<string[]>(
    () => initialSavedRun.current?.seenPlayerIds ?? []
  );
  const [isComplete, setIsComplete] = useState<boolean>(
    () => initialSavedRun.current?.isComplete ?? false
  );
  const [week, setWeek] = useState<number>(() => initialSavedRun.current?.week ?? 4);
  const [season, setSeason] = useState<string>(
    () => initialSavedRun.current?.season ?? '2026'
  );
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(
    () => initialSavedRun.current?.isNewHighScore ?? false
  );

  const [selectedSlotId, setSelectedSlotId] = useState<RosterSlotId | null>(() => {
    const saved = initialSavedRun.current;
    if (saved?.currentPlayer && !saved.isComplete) {
      return getDefaultSlotForPlayer(saved.roster, saved.currentPlayer.position);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef<boolean>(false);

  const loadNextPlayer = useCallback(
    async (
      targetRoster: RosterMap,
      targetSeenIds: string[],
      targetSkipsLeft: number,
      targetWeek: number,
      targetSeason: string
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const nextPlayer = await drawRandomPlayerForRoster(
          targetRoster,
          targetSeenIds,
          targetWeek,
          targetSeason
        );

        if (!nextPlayer) {
          setIsLoading(false);
          return;
        }

        const updatedSeen = [...targetSeenIds, nextPlayer.playerId];
        const defaultSlot = getDefaultSlotForPlayer(targetRoster, nextPlayer.position);

        setCurrentPlayer(nextPlayer);
        setSeenPlayerIds(updatedSeen);
        setSelectedSlotId(defaultSlot);

        saveActiveRunCookie({
          roster: targetRoster,
          currentPlayer: nextPlayer,
          skipsLeft: targetSkipsLeft,
          seenPlayerIds: updatedSeen,
          isComplete: false,
          week: targetWeek,
          season: targetSeason,
          isNewHighScore: false,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to reach Sleeper API. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const saved = initialSavedRun.current;

    // If we have a valid saved completed run in session cookies, keep it as-is
    if (saved && saved.isComplete) {
      return;
    }

    // If we have an active run with a valid currentPlayer that fits an open slot, keep it as-is
    if (
      saved &&
      !saved.isComplete &&
      saved.currentPlayer &&
      getEligibleOpenSlotsForPosition(saved.roster, saved.currentPlayer.position).length > 0
    ) {
      return;
    }

    // Otherwise initialize NFL state and draw a player for the current (or new) roster
    (async () => {
      setIsLoading(true);
      setError(null);
      let resolvedWeek = saved?.week ?? 4;
      let resolvedSeason = saved?.season ?? '2026';

      try {
        const nflState = await fetchNflState();
        resolvedWeek = nflState.completedWeek;
        resolvedSeason = nflState.season;
        setWeek(resolvedWeek);
        setSeason(resolvedSeason);
      } catch {
        // Fallback to default week/season if state endpoint fails
      }

      const activeRoster = saved?.roster ?? createEmptyRoster();
      const activeSeen = saved?.seenPlayerIds ?? [];
      const activeSkips = saved?.skipsLeft ?? MAX_SKIPS;

      await loadNextPlayer(
        activeRoster,
        activeSeen,
        activeSkips,
        resolvedWeek,
        resolvedSeason
      );
    })();
  }, [loadNextPlayer]);

  const handleAcceptPlayer = useCallback(
    async (slotId: RosterSlotId) => {
      if (!currentPlayer || isComplete || isLoading) return;

      const eligibleSlots = getEligibleOpenSlotsForPosition(
        roster,
        currentPlayer.position
      );
      const targetSlot =
        eligibleSlots.find((s) => s.id === slotId) ?? eligibleSlots[0];
      if (!targetSlot) return;

      const nextRoster: RosterMap = {
        ...roster,
        [targetSlot.id]: currentPlayer,
      };

      setRoster(nextRoster);

      if (isRosterComplete(nextRoster)) {
        const finalScore = calculateRosterScore(nextRoster);
        const beatHighScore = highScore === null || finalScore > highScore;
        const updatedHighScore = beatHighScore ? finalScore : highScore;

        if (beatHighScore && updatedHighScore !== null) {
          setHighScore(updatedHighScore);
          saveHighScoreCookie(updatedHighScore);
        }

        const newHistoryEntry: RunHistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          week,
          season,
          totalScore: finalScore,
          skipsUsed: MAX_SKIPS - skipsLeft,
          isNewHighScore: beatHighScore,
          roster: nextRoster,
        };

        const updatedHistory = [newHistoryEntry, ...history].slice(0, MAX_HISTORY);
        setHistory(updatedHistory);
        saveHistoryCookie(updatedHistory);

        setCurrentPlayer(null);
        setIsComplete(true);
        setIsNewHighScore(beatHighScore);

        saveActiveRunCookie({
          roster: nextRoster,
          currentPlayer: null,
          skipsLeft,
          seenPlayerIds,
          isComplete: true,
          week,
          season,
          isNewHighScore: beatHighScore,
        });
        return;
      }

      // Persist intermediate roster state immediately before loading next player
      setCurrentPlayer(null);
      saveActiveRunCookie({
        roster: nextRoster,
        currentPlayer: null,
        skipsLeft,
        seenPlayerIds,
        isComplete: false,
        week,
        season,
        isNewHighScore: false,
      });

      await loadNextPlayer(nextRoster, seenPlayerIds, skipsLeft, week, season);
    },
    [
      currentPlayer,
      highScore,
      history,
      isComplete,
      isLoading,
      loadNextPlayer,
      roster,
      season,
      seenPlayerIds,
      skipsLeft,
      week,
    ]
  );

  const handleSkipPlayer = useCallback(async () => {
    if (skipsLeft <= 0 || isLoading || isComplete || !currentPlayer) return;

    const nextSkipsLeft = skipsLeft - 1;
    setSkipsLeft(nextSkipsLeft);
    setCurrentPlayer(null);

    saveActiveRunCookie({
      roster,
      currentPlayer: null,
      skipsLeft: nextSkipsLeft,
      seenPlayerIds,
      isComplete: false,
      week,
      season,
      isNewHighScore: false,
    });

    await loadNextPlayer(roster, seenPlayerIds, nextSkipsLeft, week, season);
  }, [
    currentPlayer,
    isComplete,
    isLoading,
    loadNextPlayer,
    roster,
    season,
    seenPlayerIds,
    skipsLeft,
    week,
  ]);

  const handleTryAgain = useCallback(async () => {
    const emptyRoster = createEmptyRoster();
    setRoster(emptyRoster);
    setCurrentPlayer(null);
    setSkipsLeft(MAX_SKIPS);
    setSeenPlayerIds([]);
    setIsComplete(false);
    setIsNewHighScore(false);
    setSelectedSlotId(null);

    saveActiveRunCookie({
      roster: emptyRoster,
      currentPlayer: null,
      skipsLeft: MAX_SKIPS,
      seenPlayerIds: [],
      isComplete: false,
      week,
      season,
      isNewHighScore: false,
    });

    await loadNextPlayer(emptyRoster, [], MAX_SKIPS, week, season);
  }, [loadNextPlayer, season, week]);

  const eligibleSlots = currentPlayer
    ? getEligibleOpenSlotsForPosition(roster, currentPlayer.position)
    : [];

  return (
    <div className="app-shell">
      {/* Top Broadcast Scoreboard Header */}
      <header className="top-header">
        <div className="top-header__inner">
          <div className="brand">
            <div className="brand__logo">
              <Flame size={24} />
            </div>
            <div>
              <h1 className="brand__title">GRIDIRON DRAFT</h1>
              <p className="brand__subtitle">
                Weekly Fantasy Football Lineup Challenge
              </p>
            </div>
          </div>

          <div className="header-badges">
            <div className="header-pill header-pill--week" data-testid="active-week-badge">
              <Calendar size={16} />
              <span>
                {season} NFL • <strong>Week {week}</strong> (Previous Week PPR)
              </span>
            </div>

            <div className="header-pill header-pill--highscore" data-testid="header-high-score">
              <Trophy size={17} className="trophy-gold" />
              <span>
                High Score:{' '}
                <strong data-testid="high-score-value">
                  {highScore !== null ? `${highScore.toFixed(2)} PTS` : '—'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Brief Game Rules Strip */}
      <div className="rules-strip">
        <div className="rules-strip__inner">
          <HelpCircle size={15} className="rules-strip__icon" />
          <p>
            <strong>Goal:</strong> Build an 8-player starting lineup (1 QB, 2 RB, 2 WR, 1 TE,
            1 FLX, 1 K) that maximizes last week&apos;s Sleeper Full PPR points. You only get{' '}
            <strong>5 skips</strong> per run — use them wisely!
          </p>
        </div>
      </div>

      {/* Main Two-Column Arena */}
      <main className="main-arena">
        <div className="arena-left">
          {isComplete ? (
            <RunSummaryCard
              roster={roster}
              highScore={highScore}
              isNewHighScore={isNewHighScore}
              skipsLeft={skipsLeft}
              week={week}
              season={season}
              onTryAgain={handleTryAgain}
            />
          ) : (
            <PlayerCard
              player={currentPlayer}
              eligibleSlots={eligibleSlots}
              selectedSlotId={selectedSlotId}
              onSelectSlot={setSelectedSlotId}
              onAcceptPlayer={handleAcceptPlayer}
              onSkipPlayer={handleSkipPlayer}
              skipsLeft={skipsLeft}
              week={week}
              season={season}
              isLoading={isLoading}
              error={error}
              onRetry={() =>
                loadNextPlayer(roster, seenPlayerIds, skipsLeft, week, season)
              }
            />
          )}
        </div>

        <div className="arena-right">
          <RosterBoard
            roster={roster}
            currentPlayer={currentPlayer}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            onQuickPlaceSlot={handleAcceptPlayer}
            isComplete={isComplete}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Bottom History Section (5 Most Recent Teams & Scores) */}
      <div className="history-wrapper">
        <HistoryPanel history={history} highScore={highScore} />
      </div>
    </div>
  );
};

export default App;

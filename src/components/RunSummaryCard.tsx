import React from 'react';
import { MAX_SKIPS, ROSTER_SLOTS, RosterMap } from '../types/game';
import { calculateRosterScore } from '../utils/gameLogic';
import { Trophy, RotateCcw, Award, Sparkles } from 'lucide-react';

interface RunSummaryCardProps {
  roster: RosterMap;
  highScore: number | null;
  isNewHighScore: boolean;
  skipsLeft: number;
  week: number;
  season: string;
  onTryAgain: () => void;
}

export const RunSummaryCard: React.FC<RunSummaryCardProps> = ({
  roster,
  highScore,
  isNewHighScore,
  skipsLeft,
  week,
  season,
  onTryAgain,
}) => {
  const finalScore = calculateRosterScore(roster);
  const skipsUsed = MAX_SKIPS - skipsLeft;

  // Find MVP player on the roster
  const players = ROSTER_SLOTS.map((s) => ({
    slot: s,
    player: roster[s.id],
  })).filter((item) => item.player !== null);

  const mvpEntry = players.reduce(
    (best, curr) =>
      !best || (curr.player && curr.player.score > (best.player?.score ?? -1))
        ? curr
        : best,
    players[0]
  );

  return (
    <div className="run-summary-card" data-testid="run-summary-card">
      <div className="run-summary__badge-row">
        {isNewHighScore ? (
          <div className="high-score-banner high-score-banner--new" data-testid="new-high-score-banner">
            <Trophy size={20} />
            <span>NEW HIGH SCORE RECORD!</span>
          </div>
        ) : (
          <div className="high-score-banner high-score-banner--standard">
            <Sparkles size={18} />
            <span>LINEUP COMPLETE • WEEK {week} ({season})</span>
          </div>
        )}
      </div>

      <h2 className="run-summary__title">Final Lineup Score Tally</h2>

      <div className="run-summary__score-display" data-testid="final-tallied-score">
        <span className="run-summary__score-number">{finalScore.toFixed(2)}</span>
        <span className="run-summary__score-unit">TOTAL PPR PTS</span>
      </div>

      <div className="run-summary__stats-grid">
        <div className="summary-stat-box">
          <span className="summary-stat-box__label">All-Time Best</span>
          <span className="summary-stat-box__value" data-testid="summary-high-score">
            {(highScore ?? finalScore).toFixed(2)} PTS
          </span>
        </div>
        <div className="summary-stat-box">
          <span className="summary-stat-box__label">Skips Used</span>
          <span className="summary-stat-box__value">
            {skipsUsed} / {MAX_SKIPS}
          </span>
        </div>
        {mvpEntry?.player && (
          <div className="summary-stat-box summary-stat-box--mvp">
            <span className="summary-stat-box__label">
              <Award size={14} /> Lineup MVP ({mvpEntry.slot.label})
            </span>
            <span className="summary-stat-box__value">
              {mvpEntry.player.fullName} ({mvpEntry.player.score.toFixed(2)} pts)
            </span>
          </div>
        )}
      </div>

      <div className="run-summary__breakdown">
        <h3 className="run-summary__breakdown-title">Starting Lineup Breakdown</h3>
        <div className="run-summary__breakdown-list">
          {ROSTER_SLOTS.map((slot) => {
            const p = roster[slot.id];
            return (
              <div key={slot.id} className="breakdown-row">
                <span className={`breakdown-row__slot slot-badge--${slot.shortLabel.toLowerCase()}`}>
                  {slot.label}
                </span>
                <span className="breakdown-row__name">
                  {p ? p.fullName : 'Empty'}
                  {p?.team ? <small className="breakdown-row__team"> ({p.team})</small> : null}
                </span>
                <span className="breakdown-row__pts">
                  {p ? `${p.score.toFixed(2)} pts` : '0.00 pts'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="btn btn--try-again"
        data-testid="try-again-button"
        onClick={onTryAgain}
      >
        <RotateCcw size={20} />
        <span>Try Again</span>
      </button>
    </div>
  );
};

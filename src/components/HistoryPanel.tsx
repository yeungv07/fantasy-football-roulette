import React from 'react';
import {
  MAX_HISTORY,
  MAX_SKIPS,
  ROSTER_SLOTS,
  RunHistoryEntry,
} from '../types/game';
import { History, Trophy, Calendar } from 'lucide-react';

interface HistoryPanelProps {
  history: RunHistoryEntry[];
  highScore: number | null;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, highScore }) => {
  return (
    <section
      className="history-panel"
      aria-label="Recent Runs History"
      data-testid="history-section"
    >
      <div className="history-panel__header">
        <div className="history-panel__title-group">
          <History size={22} className="history-panel__icon" />
          <div>
            <h2 className="history-panel__title">
              Recent Runs History (Last {MAX_HISTORY} Teams)
            </h2>
            <p className="history-panel__subtitle">
              Saved in session cookies • Persists across page refreshes
            </p>
          </div>
        </div>

        <div className="history-panel__high-score" data-testid="history-high-score">
          <Trophy size={18} className="trophy-gold" />
          <span>
            High Score:{' '}
            <strong>
              {highScore !== null ? `${highScore.toFixed(2)} PTS` : 'No runs completed yet'}
            </strong>
          </span>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="history-empty" data-testid="history-empty">
          <p>
            No completed runs yet! Finish building your 8-player lineup above to record your first
            team and score.
          </p>
        </div>
      ) : (
        <div className="history-grid" data-testid="history-list">
          {history.slice(0, MAX_HISTORY).map((entry, index) => {
            const isTopRecord =
              highScore !== null && Math.abs(entry.totalScore - highScore) < 0.005;

            return (
              <article
                key={entry.id}
                className={`history-card ${isTopRecord ? 'history-card--best' : ''}`}
                data-testid={`history-item-${index}`}
              >
                <div className="history-card__top">
                  <div className="history-card__meta">
                    <span className="history-card__run-badge">
                      {index === 0 ? 'Latest Run' : `Run #${history.length - index}`}
                    </span>
                    <span className="history-card__week">
                      <Calendar size={13} /> Week {entry.week} ({entry.season})
                    </span>
                    <span className="history-card__skips">
                      {entry.skipsUsed}/{MAX_SKIPS} Skips Used
                    </span>
                  </div>

                  <div className="history-card__score-group">
                    {isTopRecord && (
                      <span className="history-card__record-tag" title="Matches High Score">
                        <Trophy size={13} /> High Score
                      </span>
                    )}
                    <span
                      className="history-card__total-score"
                      data-testid={`history-score-${index}`}
                    >
                      {entry.totalScore.toFixed(2)} <small>PTS</small>
                    </span>
                  </div>
                </div>

                <div className="history-card__roster">
                  {ROSTER_SLOTS.map((slot) => {
                    const player = entry.roster[slot.id];
                    return (
                      <div key={slot.id} className="history-roster-chip">
                        <span
                          className={`history-roster-chip__slot slot-badge--${slot.shortLabel.toLowerCase()}`}
                        >
                          {slot.label}
                        </span>
                        <span className="history-roster-chip__name">
                          {player ? player.fullName : '—'}
                        </span>
                        <span className="history-roster-chip__pts">
                          {player ? player.score.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

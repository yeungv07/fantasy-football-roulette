import React, { useEffect, useState } from 'react';
import {
  MAX_SKIPS,
  PlayerCardData,
  RosterSlotConfig,
  RosterSlotId,
} from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';
import {
  CheckCircle2,
  FastForward,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface PlayerCardProps {
  player: PlayerCardData | null;
  eligibleSlots: RosterSlotConfig[];
  selectedSlotId: RosterSlotId | null;
  onSelectSlot: (slotId: RosterSlotId) => void;
  onAcceptPlayer: (slotId: RosterSlotId) => void;
  onSkipPlayer: () => void;
  skipsLeft: number;
  week: number;
  season: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  eligibleSlots,
  selectedSlotId,
  onSelectSlot,
  onAcceptPlayer,
  onSkipPlayer,
  skipsLeft,
  week,
  season,
  isLoading,
  error,
  onRetry,
}) => {
  const [activeSlot, setActiveSlot] = useState<RosterSlotId | null>(selectedSlotId);

  useEffect(() => {
    setActiveSlot(selectedSlotId);
  }, [selectedSlotId, player?.playerId]);

  const handleSlotClick = (slotId: RosterSlotId) => {
    setActiveSlot(slotId);
    onSelectSlot(slotId);
  };

  const effectiveSlotId =
    activeSlot && eligibleSlots.some((s) => s.id === activeSlot)
      ? activeSlot
      : eligibleSlots[0]?.id ?? null;

  const selectedSlotLabel =
    eligibleSlots.find((s) => s.id === effectiveSlotId)?.label ?? '';

  return (
    <div className="draft-stage">
      {/* Skips Tracker Banner */}
      <div className={`skips-tracker ${skipsLeft === 0 ? 'skips-tracker--empty' : ''}`} data-testid="skips-tracker">
        <div className="skips-tracker__header">
          <div className="skips-tracker__title-group">
            <FastForward size={18} className="skips-tracker__icon" />
            <span className="skips-tracker__label">Skips Remaining</span>
          </div>
          <span className="skips-tracker__count" data-testid="skips-remaining-count">
            {skipsLeft} / {MAX_SKIPS}
          </span>
        </div>

        <div className="skips-tracker__pips" aria-label={`${skipsLeft} of ${MAX_SKIPS} skips left`}>
          {Array.from({ length: MAX_SKIPS }).map((_, idx) => {
            const isAvailable = idx < skipsLeft;
            return (
              <span
                key={idx}
                className={`skip-pip ${isAvailable ? 'skip-pip--active' : 'skip-pip--used'}`}
              />
            );
          })}
        </div>

        {skipsLeft === 0 && (
          <div className="skips-tracker__warning" role="status">
            <ShieldAlert size={15} />
            <span>All 5 skips used! You must accept each presented player.</span>
          </div>
        )}
      </div>

      {/* Main Player Card */}
      <div className="player-card-container">
        {error ? (
          <div className="player-card player-card--error" role="alert">
            <AlertTriangle size={36} className="error-icon" />
            <h3>Couldn&apos;t Load Player Data</h3>
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={onRetry}>
              Retry Fetching Player
            </button>
          </div>
        ) : isLoading || !player ? (
          <div className="player-card player-card--loading" data-testid="player-loading">
            <Loader2 size={42} className="spinner-icon" />
            <h3>Scouting Active NFL Roster...</h3>
            <p>Fetching Week {week} PPR stats from Sleeper API</p>
          </div>
        ) : (
          <article className="player-card" data-testid="player-card">
            <div className="player-card__top-ribbon">
              <span
                className={`pos-badge pos-badge--${player.position.toLowerCase()}`}
                data-testid="player-position"
              >
                {player.position}
              </span>
              <span className="player-card__team-meta">
                {player.team ? `${player.team}` : 'NFL'}
                {player.number != null ? ` • #${player.number}` : ''}
                {player.opponent ? ` • vs ${player.opponent}` : ''}
              </span>
            </div>

            <div className="player-card__hero">
              <PlayerAvatar
                imageUrl={player.imageUrl}
                firstName={player.firstName}
                lastName={player.lastName}
                position={player.position}
                team={player.team}
                size="lg"
              />

              <div className="player-card__identity">
                <div className="player-card__name-group" data-testid="player-name">
                  <span className="player-card__first-name" data-testid="player-first-name">
                    {player.firstName}
                  </span>{' '}
                  <span className="player-card__last-name" data-testid="player-last-name">
                    {player.lastName}
                  </span>
                </div>
                <p className="player-card__subtitle">
                  Active {player.position} • {season} Regular Season
                </p>
              </div>
            </div>

            {/* Weekly PPR Score Showcase */}
            <div className="player-card__score-box">
              <div className="player-card__score-meta">
                <Sparkles size={16} className="score-sparkle" />
                <span>Week {week} Full PPR Score (Sleeper)</span>
              </div>
              <div className="player-card__score-value" data-testid="player-score">
                {player.score.toFixed(2)} <span className="pts-unit">PTS</span>
              </div>
            </div>

            {/* Position Slot Picker for Keeping the Player */}
            <div className="slot-picker">
              <div className="slot-picker__header">
                <span className="slot-picker__label">
                  Choose Roster Position Slot:
                </span>
                {eligibleSlots.length > 1 && (
                  <span className="slot-picker__hint">
                    Eligible for {eligibleSlots.map((s) => s.label).join(' or ')}
                  </span>
                )}
              </div>
              <div className="slot-picker__options" role="radiogroup" aria-label="Choose roster slot">
                {eligibleSlots.map((slot) => {
                  const isSelected = effectiveSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      data-testid={`slot-option-${slot.id}`}
                      className={`slot-option-btn ${isSelected ? 'slot-option-btn--selected' : ''} ${
                        slot.id === 'FLX' ? 'slot-option-btn--flex' : ''
                      }`}
                      onClick={() => handleSlotClick(slot.id)}
                    >
                      <span className="slot-option-btn__tag">{slot.label}</span>
                      <span className="slot-option-btn__desc">
                        {slot.id === 'FLX' ? 'Flex Spot' : `${slot.shortLabel} Slot`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Keep / Accept vs Skip Actions */}
            <div className="player-card__actions">
              <button
                type="button"
                className="btn btn--accept"
                data-testid="accept-button"
                disabled={!effectiveSlotId || isLoading}
                onClick={() => effectiveSlotId && onAcceptPlayer(effectiveSlotId)}
              >
                <CheckCircle2 size={20} />
                <span>
                  Accept &amp; Add to {selectedSlotLabel || player.position}
                </span>
              </button>

              <button
                type="button"
                className="btn btn--skip"
                data-testid="skip-button"
                disabled={skipsLeft <= 0 || isLoading}
                onClick={onSkipPlayer}
                title={
                  skipsLeft <= 0
                    ? 'No skips remaining — you must accept this player'
                    : `Skip this player (${skipsLeft} remaining)`
                }
              >
                <FastForward size={19} />
                <span>
                  {skipsLeft > 0 ? `Skip Player (${skipsLeft} left)` : 'No Skips Left'}
                </span>
              </button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import {
  PlayerCardData,
  ROSTER_SLOTS,
  RosterMap,
  RosterSlotId,
} from '../types/game';
import {
  calculateRosterScore,
  getEligibleOpenSlotsForPosition,
  getFilledSlotCount,
} from '../utils/gameLogic';
import { PlayerAvatar } from './PlayerAvatar';
import { Users, PlusCircle } from 'lucide-react';

interface RosterBoardProps {
  roster: RosterMap;
  currentPlayer: PlayerCardData | null;
  selectedSlotId: RosterSlotId | null;
  onSelectSlot: (slotId: RosterSlotId) => void;
  onQuickPlaceSlot: (slotId: RosterSlotId) => void;
  isComplete: boolean;
  isLoading: boolean;
}

export const RosterBoard: React.FC<RosterBoardProps> = ({
  roster,
  currentPlayer,
  selectedSlotId,
  onSelectSlot,
  onQuickPlaceSlot,
  isComplete,
  isLoading,
}) => {
  const filledCount = getFilledSlotCount(roster);
  const totalScore = calculateRosterScore(roster);
  const eligibleIds = new Set(
    currentPlayer && !isComplete
      ? getEligibleOpenSlotsForPosition(roster, currentPlayer.position).map((s) => s.id)
      : []
  );

  return (
    <section className="roster-board" aria-label="Current Run Roster" data-testid="current-roster">
      <div className="roster-board__header">
        <div className="roster-board__title-wrap">
          <Users size={20} className="roster-board__icon" />
          <div>
            <h2 className="roster-board__title">Current Run Roster</h2>
            <p className="roster-board__subtitle">
              {filledCount} / {ROSTER_SLOTS.length} Starters Locked In
            </p>
          </div>
        </div>

        <div className="roster-board__score-pill" data-testid="roster-running-score">
          <span className="roster-board__score-label">
            {isComplete ? 'Final Score' : 'Current Total'}
          </span>
          <span className="roster-board__score-val">{totalScore.toFixed(2)} PTS</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="roster-progress">
        <div
          className="roster-progress__bar"
          style={{ width: `${(filledCount / ROSTER_SLOTS.length) * 100}%` }}
        />
      </div>

      <div className="roster-slots-list">
        {ROSTER_SLOTS.map((slot) => {
          const assigned = roster[slot.id];
          const isEligible = !isComplete && !isLoading && eligibleIds.has(slot.id);
          const isSelectedTarget = isEligible && selectedSlotId === slot.id;

          return (
            <div
              key={slot.id}
              data-testid={`roster-slot-${slot.id}`}
              className={`roster-slot ${assigned ? 'roster-slot--filled' : 'roster-slot--empty'} ${
                isEligible ? 'roster-slot--eligible' : ''
              } ${isSelectedTarget ? 'roster-slot--selected-target' : ''}`}
              onClick={() => {
                if (isEligible) {
                  onSelectSlot(slot.id);
                }
              }}
            >
              <div
                className={`roster-slot__badge slot-badge--${slot.shortLabel.toLowerCase()}`}
              >
                {slot.label}
              </div>

              {assigned ? (
                <div className="roster-slot__player">
                  <PlayerAvatar
                    imageUrl={assigned.imageUrl}
                    firstName={assigned.firstName}
                    lastName={assigned.lastName}
                    position={assigned.position}
                    team={assigned.team}
                    size="sm"
                  />
                  <div className="roster-slot__player-info">
                    <div className="roster-slot__player-name">{assigned.fullName}</div>
                    <div className="roster-slot__player-meta">
                      <span className={`mini-pos mini-pos--${assigned.position.toLowerCase()}`}>
                        {assigned.position}
                      </span>
                      <span>{assigned.team || 'NFL'}</span>
                      {assigned.opponent && <span>• vs {assigned.opponent}</span>}
                    </div>
                  </div>
                  <div className="roster-slot__player-score">
                    <span className="roster-slot__pts">{assigned.score.toFixed(2)}</span>
                    <span className="roster-slot__pts-unit">PPR</span>
                  </div>
                </div>
              ) : (
                <div className="roster-slot__empty-body">
                  <div className="roster-slot__empty-text">
                    <span className="roster-slot__empty-title">
                      Empty {slot.description}
                    </span>
                    <span className="roster-slot__empty-allowed">
                      Accepts: {slot.allowedPositions.join(' / ')}
                    </span>
                  </div>
                  {isEligible && currentPlayer && (
                    <button
                      type="button"
                      className="roster-slot__place-btn"
                      data-testid={`quick-place-${slot.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickPlaceSlot(slot.id);
                      }}
                    >
                      <PlusCircle size={15} />
                      <span>Place {currentPlayer.lastName}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

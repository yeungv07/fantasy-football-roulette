import React, { useState, useEffect } from 'react';
import { Position } from '../types/game';

interface PlayerAvatarProps {
  imageUrl: string;
  firstName: string;
  lastName: string;
  position: Position;
  team?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  imageUrl,
  firstName,
  lastName,
  position,
  team,
  size = 'lg',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || position;
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div className={`player-avatar player-avatar--${size} pos-ring--${position.toLowerCase()}`}>
      {!imgError && imageUrl ? (
        <img
          src={imageUrl}
          alt={fullName}
          className="player-avatar__img"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`player-avatar__fallback pos-bg--${position.toLowerCase()}`}
          aria-label={fullName}
        >
          <span className="player-avatar__initials">{initials}</span>
          {team && <span className="player-avatar__team">{team}</span>}
        </div>
      )}
    </div>
  );
};

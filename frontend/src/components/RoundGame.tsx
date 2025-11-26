import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RoundStatus } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { useGame } from '../context/GameContext';
import styles from '../styles/RoundGame.module.css';

export function RoundGame() {
  const { id } = useParams<{ id: string }>();
  const { lastMessage, status: wsStatus } = useWebSocket();
  const {
    round,
    myStats,
    timeLeft,
    loading,
    particles,
    isSpinning,
    loadRound,
    handleTap,
    spawnParticles,
    getProgressPercent,
    getPlayerPosition,
  } = useGame();

  const cardRef = useRef<HTMLDivElement | null>(null);
  const gooseRef = useRef<HTMLDivElement | null>(null);
  const scoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    loadRound(id);
  }, [id, loadRound]);

  useEffect(() => {
    if (lastMessage?.type === 'tap' && lastMessage.roundId === id) {
      loadRound(id!, true);
    }
  }, [lastMessage, id, loadRound]);

  const onTap = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!id || !round || round.status !== RoundStatus.ACTIVE) return;
    spawnParticles(cardRef, gooseRef, scoreRef);
    await handleTap(id);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (!round) return '';

    switch (round.status) {
      case RoundStatus.COOLDOWN:
        return '';
      case RoundStatus.ACTIVE:
        return '';
      case RoundStatus.FINISHED:
        return 'Раунд завершен';
    }
  };

  const renderGoose = () => {
    if (!round) {
      return (
        <svg className={styles.gooseSvg} viewBox="0 0 200 200">
          <ellipse cx="100" cy="140" rx="50" ry="30" fill="#FFA500" />
          <ellipse cx="100" cy="100" rx="60" ry="50" fill="#FFD700" />
          <ellipse cx="100" cy="60" rx="40" ry="35" fill="#FFD700" />
          <rect x="70" y="30" width="60" height="15" fill="#FFA500" rx="7" />
          <circle cx="85" cy="55" r="5" fill="#000" />
          <circle cx="115" cy="55" r="5" fill="#000" />
          <path d="M 90 70 Q 100 75 110 70" stroke="#000" strokeWidth="2" fill="none" />
        </svg>
      );
    }
    
    if (round.status === RoundStatus.FINISHED) {
      return (
        <svg className={styles.gooseSvg} viewBox="0 0 200 200">
          <ellipse cx="100" cy="140" rx="50" ry="30" fill="#FFA500" />
          <ellipse cx="100" cy="100" rx="60" ry="50" fill="#FFD700" />
          <ellipse cx="100" cy="60" rx="40" ry="35" fill="#FFD700" />
          <rect x="70" y="30" width="60" height="15" fill="#FFA500" rx="7" />
          <circle cx="85" cy="55" r="5" fill="#000" />
          <circle cx="115" cy="55" r="5" fill="#000" />
          <path d="M 90 70 Q 100 72 110 70" stroke="#000" strokeWidth="2" fill="none" />
          <circle cx="100" cy="30" r="20" fill="#FFD700" stroke="#FFA500" strokeWidth="2" />
          <path d="M 85 25 L 90 18 L 95 25 M 100 22 L 100 15 L 105 22 M 105 25 L 110 18 L 115 25" 
                stroke="#FFA500" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    
    if (round.status === RoundStatus.COOLDOWN) {
      return (
        <svg className={styles.gooseSvg} viewBox="0 0 200 200">
          <ellipse cx="100" cy="140" rx="50" ry="30" fill="#CCC" />
          <ellipse cx="100" cy="100" rx="60" ry="50" fill="#DDD" />
          <ellipse cx="95" cy="80" rx="45" ry="40" fill="#DDD" />
          <rect x="70" y="65" width="60" height="15" fill="#BBB" rx="7" />
          <path d="M 85 75 Q 90 80 95 75" stroke="#888" strokeWidth="2" fill="none" />
          <path d="M 105 75 Q 110 80 115 75" stroke="#888" strokeWidth="2" fill="none" />
          <path d="M 90 95 Q 100 98 110 95" stroke="#888" strokeWidth="2" fill="none" />
          <text x="145" y="60" fontSize="40" fill="#667eea">💤</text>
        </svg>
      );
    }

    return (
      <svg className={styles.gooseSvg} viewBox="0 0 200 200">
        <ellipse cx="100" cy="140" rx="50" ry="30" fill="#FFA500" />
        <ellipse cx="100" cy="100" rx="60" ry="50" fill="#FFD700" />
        <ellipse cx="100" cy="60" rx="40" ry="35" fill="#FFD700" />
        <rect x="70" y="30" width="60" height="15" fill="#FFA500" rx="7" />
        <circle cx="85" cy="55" r="5" fill="#000" />
        <circle cx="115" cy="55" r="5" fill="#000" />
        <path d="M 90 70 Q 100 75 110 70" stroke="#000" strokeWidth="2" fill="none" />
      </svg>
    );
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!round) {
    return <div className="loading">Раунд не найден</div>;
  }

  const winner = round.playerStats?.[0];

  return (
    <div className={styles.gamePage}>
      <div className={styles.gameCard} ref={cardRef}>
        <div className={styles.particleLayer}>
          {particles.map((particle) => (
            <span
              key={particle.id}
              className={styles.particle}
              style={particle.style}
            />
          ))}
        </div>
        <div className={styles.gameHeader}>
          <Link to="/" className={styles.backLink}>← Раунды</Link>
          <div className={styles.headerRight}>
            {round.status === RoundStatus.ACTIVE && getPlayerPosition() !== null && (
              <span className={styles.playerPosition}>
                {getPlayerPosition() === 1 ? '🥇' : `#${getPlayerPosition()}`}
              </span>
            )}
            <span 
              className={`${styles.wsStatus} ${
                wsStatus === 'connected' ? styles.wsStatusConnected :
                wsStatus === 'connecting' ? styles.wsStatusConnecting :
                styles.wsStatusDisconnected
              }`} 
              title={`WebSocket: ${wsStatus}`}
            >
              {wsStatus === 'connected' && '●'}
              {wsStatus === 'connecting' && '○'}
              {wsStatus === 'disconnected' && '○'}
            </span>
          </div>
        </div>

        {(round.status === RoundStatus.ACTIVE || round.status === RoundStatus.COOLDOWN) && (
          <div className={styles.timerContainer}>
            <svg className={styles.timerCircle} viewBox="0 0 120 120">
              <circle
                className={styles.timerBg}
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                className={styles.timerProgress}
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={round.status === RoundStatus.ACTIVE ? "#667eea" : "#fbbf24"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - getProgressPercent(round) / 100)}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className={styles.timerText}>
              <div className={styles.timerValue}>{formatTime(timeLeft)}</div>
              <div className={styles.timerLabel}>
                {round.status === RoundStatus.COOLDOWN ? 'до начала' : 'осталось'}
              </div>
            </div>
          </div>
        )}

        <div className={`${styles.gooseCard} ${isSpinning ? styles.spin : ''}`}>
          <div className={styles.goose} onClick={onTap} ref={gooseRef}>
            {renderGoose()}
          </div>
        </div>

        {getStatusText() && <div className={styles.gameStatus}>{getStatusText()}</div>}

        {round.status === RoundStatus.ACTIVE && (
          <div className={styles.gameScore} ref={scoreRef}>
            Очки: {myStats?.score || 0}
          </div>
        )}

        {round.status === RoundStatus.FINISHED && (
          <div className={styles.statsSection}>
            <div className={styles.statsTitle}>Статистика</div>
            <div className={styles.statItem}>
              <span className={styles.statName}>Всего</span>
              <span className={styles.statScore}>{round.totalScore}</span>
            </div>
            {winner && (
              <div className={`${styles.statItem} ${styles.winner}`}>
                <span className={styles.statName}>Победитель - {winner.user?.username}</span>
                <span className={styles.statScore}>{winner.score}</span>
              </div>
            )}
            <div className={styles.statItem}>
              <span className={styles.statName}>Мои очки</span>
              <span className={styles.statScore}>{myStats?.score || 0}</span>
            </div>
            <div className={styles.statsList}>
              {round.playerStats?.slice(1).map((stat) => (
                <div key={stat.id} className={styles.statItem}>
                  <span className={styles.statName}>{stat.user?.username}</span>
                  <span className={styles.statScore}>{stat.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { Round, RoundStatus, PlayerStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

type ParticleStyle = CSSProperties & {
  [key: string]: string | number | undefined;
};

type Particle = {
  id: string;
  style: ParticleStyle;
  duration: number;
};

export function RoundGame() {
  const { id } = useParams<{ id: string }>();
  const [round, setRound] = useState<Round | null>(null);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const previousScoreRef = useRef(0);
  const { user } = useAuth();
  const { lastMessage, status: wsStatus } = useWebSocket();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const gooseRef = useRef<HTMLDivElement | null>(null);
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const serverTimeOffsetRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  const spawnParticles = useCallback(() => {
    if (!cardRef.current || !gooseRef.current || !scoreRef.current) {
      return;
    }

    const cardRect = cardRef.current.getBoundingClientRect();
    const gooseRect = gooseRef.current.getBoundingClientRect();
    const scoreRect = scoreRef.current.getBoundingClientRect();

    const startX = gooseRect.left + gooseRect.width / 2 - cardRect.left;
    const startY = gooseRect.top + gooseRect.height / 2 - cardRect.top;
    const endX = scoreRect.left + scoreRect.width / 2 - cardRect.left;
    const endY = scoreRect.top + scoreRect.height / 2 - cardRect.top;

    const count = 14;

    const newParticles = Array.from({ length: count }).map((_, index) => {
      const jitterX = (Math.random() - 0.5) * 80;
      const jitterY = (Math.random() - 0.5) * 30;
      const dx = endX - startX + jitterX;
      const dy = endY - startY + jitterY;
      const midX = dx * 0.55;
      const midY = dy * 0.55;
      const arc = -30 - Math.random() * 40;
      const duration = 650 + Math.random() * 500;
      const delay = Math.random() * 80;
      const size = 4 + Math.random() * 4;
      const color = `hsl(${30 + Math.random() * 26}deg, 92%, ${58 + Math.random() * 16}%)`;
      const rotation = `${Math.random() * 180}deg`;
      const id = `tap-${Date.now()}-${index}-${Math.random()}`;

      const style: ParticleStyle = {
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        background: color,
        '--dx': `${dx}px`,
        '--dy': `${dy}px`,
        '--dx-mid': `${midX}px`,
        '--dy-mid': `${midY}px`,
        '--arc': `${arc}px`,
        '--particle-rotation': rotation,
      };

      return {
        id,
        style,
        duration: duration + delay,
      };
    });

    setParticles((prev) => [...prev, ...newParticles]);

    newParticles.forEach((particle) => {
      const timeoutId = window.setTimeout(() => {
        setParticles((prev) => prev.filter((item) => item.id !== particle.id));
        timeoutsRef.current = timeoutsRef.current.filter((stored) => stored !== timeoutId);
      }, particle.duration + 60);
      timeoutsRef.current.push(timeoutId);
    });
  }, [timeoutsRef]);

  const calculateTimeLeft = useCallback((roundData: Round) => {
    const now = new Date().getTime() + serverTimeOffsetRef.current;
    const start = new Date(roundData.startTime).getTime();
    const end = new Date(roundData.endTime).getTime();

    if (roundData.status === RoundStatus.COOLDOWN) {
      return Math.max(0, Math.floor((start - now) / 1000));
    } else if (roundData.status === RoundStatus.ACTIVE) {
      return Math.max(0, Math.floor((end - now) / 1000));
    } else {
      return 0;
    }
  }, []);

  const loadRound = useCallback(async () => {
    if (!id) return;

    try {
      const data = await api.getRound(id);
      
      if (data.serverTime) {
        const serverTime = new Date(data.serverTime).getTime();
        const localTime = new Date().getTime();
        serverTimeOffsetRef.current = serverTime - localTime;
      }
      
      setRound(data);

      if (user?.id) {
        const userStats = data.playerStats?.find(
          (s: PlayerStats) => s.userId === user.id
        );
        const currentScore = userStats?.score || 0;
        const previousScore = previousScoreRef.current;

        if (currentScore > previousScore && currentScore !== 0 && currentScore % 10 === 0) {
          setIsSpinning(true);
          setTimeout(() => setIsSpinning(false), 800);
        }

        previousScoreRef.current = currentScore;
        setMyStats(userStats || null);
      } else {
        previousScoreRef.current = 0;
        setMyStats(null);
      }

      setTimeLeft(calculateTimeLeft(data));
    } catch (error) {
      console.error('Failed to load round:', error);
    } finally {
      setLoading(false);
    }
  }, [id, spawnParticles, user?.id, calculateTimeLeft]);

  useEffect(() => {
    if (!id) return;
    loadRound();
  }, [id, loadRound]);

  useEffect(() => {
    if (!round) return;

    const timerInterval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(round));
    }, 1000);

    const now = new Date().getTime() + serverTimeOffsetRef.current;
    const start = new Date(round.startTime).getTime();
    const end = new Date(round.endTime).getTime();

    let statusChangeTimeout: number | undefined;

    if (round.status === RoundStatus.COOLDOWN && start > now) {
      statusChangeTimeout = window.setTimeout(() => {
        loadRound();
      }, start - now + 100);
    } else if (round.status === RoundStatus.ACTIVE && end > now) {
      statusChangeTimeout = window.setTimeout(() => {
        loadRound();
      }, end - now + 100);
    }

    return () => {
      clearInterval(timerInterval);
      if (statusChangeTimeout !== undefined) {
        clearTimeout(statusChangeTimeout);
      }
    };
  }, [round, calculateTimeLeft, loadRound]);

  useEffect(() => {
    if (lastMessage?.type === 'tap' && lastMessage.roundId === id) {
      loadRound();
    }
  }, [lastMessage, id, loadRound]);

  const handleTap = async () => {
    if (!id || !round || round.status !== RoundStatus.ACTIVE) return;

    try {
      spawnParticles();
      await api.tap(id);
      await loadRound();
    } catch (error) {
      console.error('Tap failed:', error);
    }
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

  const getProgressPercent = () => {
    if (!round) return 0;
    
    const now = new Date().getTime() + serverTimeOffsetRef.current;
    
    if (round.status === RoundStatus.ACTIVE) {
      const start = new Date(round.startTime).getTime();
      const end = new Date(round.endTime).getTime();
      const total = end - start;
      const remaining = end - now;
      return Math.max(0, Math.min(100, (remaining / total) * 100));
    }
    
    if (round.status === RoundStatus.COOLDOWN) {
      const start = new Date(round.startTime).getTime();
      const cooldownStart = new Date(round.cooldownEnd).getTime();
      const total = start - cooldownStart;
      const remaining = start - now;
      return Math.max(0, Math.min(100, (remaining / total) * 100));
    }
    
    return 0;
  };

  const getPlayerPosition = () => {
    if (!round || !myStats || !round.playerStats) return null;
    const position = round.playerStats.findIndex(s => s.userId === user?.id) + 1;
    return position > 0 ? position : null;
  };

  const renderGoose = () => {
    if (!round) {
      return (
        <svg className="goose-svg" viewBox="0 0 200 200">
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
        <svg className="goose-svg" viewBox="0 0 200 200">
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
        <svg className="goose-svg" viewBox="0 0 200 200">
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
      <svg className="goose-svg" viewBox="0 0 200 200">
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
    <div className="game-page">
      <div className="game-card" ref={cardRef}>
        <div className="particle-layer">
          {particles.map((particle) => (
            <span
              key={particle.id}
              className="particle"
              style={particle.style}
            />
          ))}
        </div>
        <div className="game-header">
          <Link to="/" className="back-link">← Раунды</Link>
          <div className="header-right">
            {round.status === RoundStatus.ACTIVE && getPlayerPosition() !== null && (
              <span className="player-position">
                {getPlayerPosition() === 1 ? '🥇' : `#${getPlayerPosition()}`}
              </span>
            )}
            <span className={`ws-status ws-status-${wsStatus}`} title={`WebSocket: ${wsStatus}`}>
              {wsStatus === 'connected' && '●'}
              {wsStatus === 'connecting' && '○'}
              {wsStatus === 'disconnected' && '○'}
            </span>
          </div>
        </div>

        {(round.status === RoundStatus.ACTIVE || round.status === RoundStatus.COOLDOWN) && (
          <div className="timer-container">
            <svg className="timer-circle" viewBox="0 0 120 120">
              <circle
                className="timer-bg"
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                className="timer-progress"
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={round.status === RoundStatus.ACTIVE ? "#667eea" : "#fbbf24"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - getProgressPercent() / 100)}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="timer-text">
              <div className="timer-value">{formatTime(timeLeft)}</div>
              <div className="timer-label">
                {round.status === RoundStatus.COOLDOWN ? 'до начала' : 'осталось'}
              </div>
            </div>
          </div>
        )}

        <div className={`goose-card ${isSpinning ? 'spin' : ''}`}>
          <div className="goose" onClick={handleTap} ref={gooseRef}>
            {renderGoose()}
          </div>
        </div>

        {getStatusText() && <div className="game-status">{getStatusText()}</div>}

        {round.status === RoundStatus.ACTIVE && (
          <div className="game-score" ref={scoreRef}>
            Очки: {myStats?.score || 0}
          </div>
        )}

        {round.status === RoundStatus.FINISHED && (
          <div className="stats-section">
            <div className="stats-title">Статистика</div>
            <div className="stat-item">
              <span className="stat-name">Всего</span>
              <span className="stat-score">{round.totalScore}</span>
            </div>
            {winner && (
              <div className="stat-item winner">
                <span className="stat-name">Победитель - {winner.user?.username}</span>
                <span className="stat-score">{winner.score}</span>
              </div>
            )}
            <div className="stat-item">
              <span className="stat-name">Мои очки</span>
              <span className="stat-score">{myStats?.score || 0}</span>
            </div>
            <div className="stats-list">
              {round.playerStats?.slice(1).map((stat) => (
                <div key={stat.id} className="stat-item">
                  <span className="stat-name">{stat.user?.username}</span>
                  <span className="stat-score">{stat.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


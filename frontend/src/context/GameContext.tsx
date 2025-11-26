import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { Round, PlayerStats } from '../types';
import { api } from '../api';

type ParticleStyle = CSSProperties & {
  [key: string]: string | number | undefined;
};

type Particle = {
  id: string;
  style: ParticleStyle;
  duration: number;
};

interface GameContextType {
  round: Round | null;
  myStats: PlayerStats | null;
  timeLeft: number;
  loading: boolean;
  particles: Particle[];
  isSpinning: boolean;
  loadRound: (roundId: string, silent?: boolean) => Promise<void>;
  handleTap: (roundId: string) => Promise<void>;
  spawnParticles: (cardRef: React.RefObject<HTMLElement>, gooseRef: React.RefObject<HTMLElement>, scoreRef: React.RefObject<HTMLElement>) => void;
  calculateTimeLeft: (round: Round) => number;
  getProgressPercent: (round: Round) => number;
  getPlayerPosition: () => number | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children, userId }: { children: ReactNode; userId?: string | null }) {
  const [round, setRound] = useState<Round | null>(null);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const previousScoreRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  const serverTimeOffsetRef = useRef<number>(0);

  const calculateTimeLeft = useCallback((roundData: Round) => {
    const now = new Date().getTime() + serverTimeOffsetRef.current;
    const start = new Date(roundData.startTime).getTime();
    const end = new Date(roundData.endTime).getTime();

    if (roundData.status === 'COOLDOWN') {
      return Math.max(0, Math.floor((start - now) / 1000));
    } else if (roundData.status === 'ACTIVE') {
      return Math.max(0, Math.floor((end - now) / 1000));
    } else {
      return 0;
    }
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!round) return;

    const timerInterval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(round));
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [round, calculateTimeLeft]);

  const spawnParticles = useCallback((
    cardRef: React.RefObject<HTMLElement>,
    gooseRef: React.RefObject<HTMLElement>,
    scoreRef: React.RefObject<HTMLElement>
  ) => {
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
  }, []);

  const getProgressPercent = useCallback((roundData: Round) => {
    const now = new Date().getTime() + serverTimeOffsetRef.current;
    
    if (roundData.status === 'ACTIVE') {
      const start = new Date(roundData.startTime).getTime();
      const end = new Date(roundData.endTime).getTime();
      const total = end - start;
      const remaining = end - now;
      return Math.max(0, Math.min(100, (remaining / total) * 100));
    }
    
    if (roundData.status === 'COOLDOWN') {
      const start = new Date(roundData.startTime).getTime();
      const cooldownStart = new Date(roundData.cooldownEnd).getTime();
      const total = start - cooldownStart;
      const remaining = start - now;
      return Math.max(0, Math.min(100, (remaining / total) * 100));
    }
    
    return 0;
  }, []);

  const getPlayerPosition = useCallback(() => {
    if (!round || !myStats || !round.playerStats || !userId) return null;
    const position = round.playerStats.findIndex(s => s.userId === userId) + 1;
    return position > 0 ? position : null;
  }, [round, myStats, userId]);

  const loadRound = useCallback(async (roundId: string, silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await api.getRound(roundId);
      
      if (data.serverTime) {
        const serverTime = new Date(data.serverTime).getTime();
        const localTime = new Date().getTime();
        serverTimeOffsetRef.current = serverTime - localTime;
      }
      
      setRound(data);

      if (userId) {
        const userStats = data.playerStats?.find(
          (s: PlayerStats) => s.userId === userId
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
      if (!silent) {
        setLoading(false);
      }
    }
  }, [calculateTimeLeft, userId]);

  const handleTap = useCallback(async (roundId: string) => {
    if (!round || round.status !== 'ACTIVE') return;

    try {
      await api.tap(roundId);
      await loadRound(roundId, true);
    } catch (error) {
      console.error('Tap failed:', error);
    }
  }, [round, loadRound]);

  return (
    <GameContext.Provider value={{
      round,
      myStats,
      timeLeft,
      loading,
      particles,
      isSpinning,
      loadRound,
      handleTap,
      spawnParticles,
      calculateTimeLeft,
      getProgressPercent,
      getPlayerPosition,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}


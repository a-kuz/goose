import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Round } from '../types';
import { api } from '../api';

interface RoundsContextType {
  rounds: Round[];
  loading: boolean;
  creating: boolean;
  loadRounds: () => Promise<void>;
  createRound: () => Promise<void>;
}

const RoundsContext = createContext<RoundsContextType | undefined>(undefined);

export function RoundsProvider({ children }: { children: ReactNode }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadRounds = useCallback(async () => {
    try {
      const data = await api.getRounds();
      setRounds(data);
    } catch (error) {
      console.error('Failed to load rounds:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRound = useCallback(async () => {
    setCreating(true);

    try {
      await api.createRound();
      await loadRounds();
    } catch (error) {
      console.error('Failed to create round:', error);
    } finally {
      setCreating(false);
    }
  }, [loadRounds]);

  useEffect(() => {
    loadRounds();
    const interval = setInterval(loadRounds, 5000);
    return () => clearInterval(interval);
  }, [loadRounds]);

  return (
    <RoundsContext.Provider value={{ rounds, loading, creating, loadRounds, createRound }}>
      {children}
    </RoundsContext.Provider>
  );
}

export function useRounds() {
  const context = useContext(RoundsContext);
  if (context === undefined) {
    throw new Error('useRounds must be used within a RoundsProvider');
  }
  return context;
}



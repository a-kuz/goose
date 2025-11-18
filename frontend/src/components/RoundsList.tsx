import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Round, RoundStatus, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});

const formatRoundPeriod = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return '—';
  }
  const sameDay = start.toDateString() === end.toDateString();
  const startLabel = `${dayFormatter.format(start)} · ${timeFormatter.format(start)}`;
  const endLabel = sameDay
    ? timeFormatter.format(end)
    : `${dayFormatter.format(end)} · ${timeFormatter.format(end)}`;
  return `${startLabel} — ${endLabel}`;
};


export function RoundsList() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadRounds();
    const interval = setInterval(loadRounds, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRounds = async () => {
    try {
      const data = await api.getRounds();
      setRounds(data);
    } catch (error) {
      console.error('Failed to load rounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRound = async () => {
    setCreating(true);

    try {
      await api.createRound();
      await loadRounds();
    } catch (error) {
      console.error('Failed to create round:', error);
    } finally {
      setCreating(false);
    }
  };

  const getStatusText = (status: RoundStatus) => {
    switch (status) {
      case RoundStatus.COOLDOWN:
        return 'Cooldown';
      case RoundStatus.ACTIVE:
        return 'Активен';
      case RoundStatus.FINISHED:
        return 'Завершен';
    }
  };

  const getStatusClass = (status: RoundStatus) => {
    switch (status) {
      case RoundStatus.COOLDOWN:
        return 'status-cooldown';
      case RoundStatus.ACTIVE:
        return 'status-active';
      case RoundStatus.FINISHED:
        return 'status-finished';
    }
  };

  const getPlacementEmoji = (place: number) => {
    switch (place) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${place}`;
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  const activeRounds = rounds.filter(r => r.status === RoundStatus.COOLDOWN || r.status === RoundStatus.ACTIVE);
  const finishedRounds = rounds.filter(r => r.status === RoundStatus.FINISHED);

  return (
    <div className="container">
      {user?.role === UserRole.ADMIN && (
        <button
          type="button"
          className="btn btn-primary btn-full btn-create-round"
          onClick={handleCreateRound}
          disabled={creating}
        >
          {creating ? 'Создание...' : 'Создать раунд'}
        </button>
      )}

      <div className="rounds-list">
        {activeRounds.map((round) => {
          const order = rounds.length - rounds.indexOf(round);
          const period = formatRoundPeriod(round.startTime, round.endTime);

          return (
            <div
              key={round.id}
              className="round-card"
              onClick={() => navigate(`/round/${round.id}`)}
            >
              <div className="round-header">
                <div className="round-title">
                  <div className="round-name">Раунд {order}</div>
                  <div className="round-period">{period}</div>
                </div>
                <div className={`round-status ${getStatusClass(round.status)}`}>
                  {getStatusText(round.status)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {finishedRounds.length > 0 && (
        <div className="finished-rounds-section">
          <h3>Завершенные раунды</h3>
          <table className="finished-rounds-table">
            <thead>
              <tr>
                <th>Раунд</th>
                <th>Дата</th>
                <th>Место</th>
                <th>Очки</th>
              </tr>
            </thead>
            <tbody>
              {finishedRounds.map((round) => {
                const order = rounds.length - rounds.indexOf(round);
                const period = formatRoundPeriod(round.startTime, round.endTime);
                const userStats = round.playerStats?.find((stat) => stat.userId === user?.id);
                const userPlace = userStats
                  ? round.playerStats?.findIndex((stat) => stat.userId === user?.id)! + 1
                  : null;

                return (
                  <tr key={round.id} onClick={() => navigate(`/round/${round.id}`)}>
                    <td>{order}</td>
                    <td>{period}</td>
                    <td>{userPlace ? getPlacementEmoji(userPlace) : '—'}</td>
                    <td>{userStats?.score || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


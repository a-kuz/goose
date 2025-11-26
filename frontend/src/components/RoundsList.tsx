import { useNavigate } from 'react-router-dom';
import { RoundStatus, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useRounds } from '../context/RoundsContext';
import styles from '../styles/RoundsList.module.css';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rounds, loading, creating, createRound } = useRounds();

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
        return styles.statusCooldown;
      case RoundStatus.ACTIVE:
        return styles.statusActive;
      case RoundStatus.FINISHED:
        return styles.statusFinished;
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  const activeRounds = rounds.filter(r => r.status === RoundStatus.COOLDOWN || r.status === RoundStatus.ACTIVE);
  const finishedRounds = rounds.filter(r => r.status === RoundStatus.FINISHED);

  return (
    <div className={styles.container}>
      {user?.role === UserRole.ADMIN && (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={createRound}
          disabled={creating}
        >
          {creating ? 'Создание...' : 'Создать раунд'}
        </button>
      )}

      <div className={styles.roundsList}>
        {activeRounds.map((round) => {
          const order = rounds.length - rounds.indexOf(round);
          const period = formatRoundPeriod(round.startTime, round.endTime);

          return (
            <div
              key={round.id}
              className={styles.roundCard}
              onClick={() => navigate(`/round/${round.id}`)}
            >
              <div className={styles.roundHeader}>
                <div className={styles.roundTitle}>
                  <div className={styles.roundName}>Раунд {order}</div>
                  <div className={styles.roundPeriod}>{period}</div>
                </div>
                <div className={`${styles.roundStatus} ${getStatusClass(round.status)}`}>
                  {getStatusText(round.status)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {finishedRounds.length > 0 && (
        <div className={styles.finishedRoundsSection}>
          <h3>Завершенные раунды</h3>
          <table className={styles.finishedRoundsTable}>
            <thead>
              <tr>
                <th>Раунд</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {finishedRounds.map((round) => {
                const order = rounds.length - rounds.indexOf(round);
                const period = formatRoundPeriod(round.startTime, round.endTime);

                return (
                  <tr key={round.id} onClick={() => navigate(`/round/${round.id}`)}>
                    <td>{order}</td>
                    <td>{period}</td>
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

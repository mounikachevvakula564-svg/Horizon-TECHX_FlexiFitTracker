import React, { useState } from 'react';
import { Footprints, Flame, Droplet, Coffee, Trash2, Calendar, Clock, Filter } from 'lucide-react';

export default function HistoryList({ logs, onDeleteLog }) {
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = [...filteredLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const getLogConfig = (type) => {
    switch (type) {
      case 'steps':
        return { icon: Footprints, color: 'var(--color-steps)', label: 'Steps', unit: 'steps' };
      case 'water':
        return { icon: Droplet, color: 'var(--color-water)', label: 'Water', unit: 'ml' };
      case 'food':
        return { icon: Coffee, color: 'var(--color-active)', label: 'Food Log', unit: 'kcal' };
      case 'workout':
        return { icon: Flame, color: 'var(--color-calories)', label: 'Workout', unit: 'kcal' };
      default:
        return { icon: Calendar, color: 'var(--color-accent)', label: 'Entry', unit: '' };
    }
  };

  const handleDelete = (id) => {
    // Start exit transition
    setDeletingId(id);
    setTimeout(() => {
      onDeleteLog(id);
      setDeletingId(null);
    }, 300); // Match CSS transition duration
  };

  return (
    <div className="history-section animate-slide-up" style={{ animationDelay: '0.2s' }}>
      
      {/* List Header and Filter controls */}
      <div className="glass-panel history-header-card">
        <div className="history-title-row">
          <div className="title-with-icon">
            <Filter size={18} className="title-icon" />
            <h3 className="history-title">Activity Timeline</h3>
          </div>
          <span className="log-count">{logs.length} total entries</span>
        </div>

        <div className="filter-tabs">
          {[
            { id: 'all', label: 'All Logs' },
            { id: 'steps', label: 'Steps' },
            { id: 'workout', label: 'Workouts' },
            { id: 'food', label: 'Meals' },
            { id: 'water', label: 'Water' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`filter-btn ${filter === tab.id ? 'active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="history-list">
        {sortedLogs.length === 0 ? (
          <div className="glass-panel no-logs-card">
            <span>📭</span>
            <p>No activity records found matching this filter.</p>
          </div>
        ) : (
          sortedLogs.map((log) => {
            const config = getLogConfig(log.type);
            const LogIcon = config.icon;
            const logDate = new Date(log.timestamp);
            const timeStr = logDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const dateStr = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const isDeleting = deletingId === log.id;

            return (
              <div 
                key={log.id} 
                className={`glass-panel log-item-card ${isDeleting ? 'exit-slide' : ''}`}
                style={{ 
                  borderLeft: `4px solid ${config.color}`,
                  opacity: isDeleting ? 0 : 1,
                  transform: isDeleting ? 'translateX(-30px) scale(0.97)' : 'translateX(0) scale(1)'
                }}
              >
                <div className="log-item-left">
                  <div className="log-icon-circle" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                    <LogIcon size={18} />
                  </div>
                  <div className="log-details">
                    <div className="log-name-row">
                      <span className="log-type-label">{config.label}</span>
                      {log.workoutType && (
                        <span className="workout-badge">{log.workoutType}</span>
                      )}
                      {log.name && (
                        <span className="meal-name-badge">"{log.name}"</span>
                      )}
                    </div>
                    <div className="log-time-row">
                      <span className="time-item"><Calendar size={11} /> {dateStr}</span>
                      <span className="time-divider">•</span>
                      <span className="time-item"><Clock size={11} /> {timeStr}</span>
                    </div>
                  </div>
                </div>

                <div className="log-item-right">
                  <div className="log-numeric-val">
                    {log.type === 'workout' && (
                      <span className="workout-dur-prefix">{log.duration} mins • </span>
                    )}
                    <span className="val-number">{log.value.toLocaleString()}</span>
                    <span className="val-unit"> {config.unit}</span>
                  </div>
                  <button 
                    className="delete-log-btn" 
                    title="Delete record"
                    onClick={() => handleDelete(log.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx="true">{`
        .history-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 40px;
        }

        .history-header-card {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .history-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .title-with-icon {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .title-icon {
          color: var(--color-accent);
        }

        .history-title {
          font-size: 1.1rem;
          color: var(--text-primary);
        }

        .log-count {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .filter-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          background: rgba(15, 23, 42, 0.4);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          width: fit-content;
        }

        .filter-btn {
          background: transparent;
          border: none;
          padding: 6px 16px;
          border-radius: 9px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-sans);
        }

        .filter-btn:hover {
          color: var(--text-primary);
        }

        .filter-btn.active {
          background: var(--bg-main);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        /* Logs List */
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .log-item-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          transition: transform 0.3s ease, opacity 0.3s ease, border-color 0.2s;
        }

        .log-item-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .log-item-card.exit-slide {
          pointer-events: none;
        }

        .log-item-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .log-icon-circle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
        }

        .log-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .log-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .log-type-label {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .workout-badge {
          font-size: 0.72rem;
          font-weight: 600;
          background: rgba(244, 63, 94, 0.1);
          color: var(--color-calories);
          border: 1px solid rgba(244, 63, 94, 0.15);
          padding: 2px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .meal-name-badge {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-secondary);
          font-style: italic;
        }

        .log-time-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .time-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .time-divider {
          color: rgba(255, 255, 255, 0.05);
        }

        .log-item-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .log-numeric-val {
          text-align: right;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .workout-dur-prefix {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .val-number {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .val-unit {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .delete-log-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .delete-log-btn:hover {
          color: var(--color-calories);
          background: rgba(244, 63, 94, 0.15);
        }

        /* Empty state styling */
        .no-logs-card {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .no-logs-card span {
          font-size: 2rem;
        }

        .no-logs-card p {
          font-size: 0.9rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

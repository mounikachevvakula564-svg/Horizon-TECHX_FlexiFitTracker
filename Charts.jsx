import React, { useState, useEffect } from 'react';
import { 
  Footprints, 
  Flame, 
  Droplet, 
  Clock, 
  Plus, 
  TrendingUp, 
  History, 
  User, 
  Zap, 
  Info,
  Activity
} from 'lucide-react';

import confetti from 'canvas-confetti';

// Import database utilities
import {
  getRawLogs,
  getGoals,
  saveGoals,
  addLogEntry,
  deleteLogEntry,
  clearDatabase,
  getDailySummary,
  getWeeklyTrends,
  getWorkoutSplit,
  getDateString
} from './db';

// Import components
import MetricCard from './components/MetricCard';
import Charts from './components/Charts';
import LogModal from './components/LogModal';
import HistoryList from './components/HistoryList';
import ProfileSettings from './components/ProfileSettings';
import ActiveTracker from './components/ActiveTracker';

export default function App() {
  // Navigation / View Tabs
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals and Toasts
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Data State
  const [logs, setLogs] = useState([]);
  const [goals, setGoals] = useState({ steps: 10000, water: 2500, calories: 2200, activeTime: 45 });
  const [dailySummary, setDailySummary] = useState({ steps: 0, water: 0, caloriesBurned: 0, caloriesConsumed: 0, activeTime: 0, workouts: [] });
  const [weeklyTrends, setWeeklyTrends] = useState([]);
  const [workoutSplit, setWorkoutSplit] = useState([]);
  
  // Track which goals have fired confetti today
  const [celebratedGoals, setCelebratedGoals] = useState({
    steps: false,
    water: false,
    calories: false,
    activeTime: false
  });

  // Toast Helper
  const addToast = (message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Remove toast after 3s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Reload data layer
  const reloadData = () => {
    const freshLogs = getRawLogs();
    const freshGoals = getGoals();
    const summary = getDailySummary();
    const trends = getWeeklyTrends();
    const splits = getWorkoutSplit();

    setLogs(freshLogs);
    setGoals(freshGoals);
    setDailySummary(summary);
    setWeeklyTrends(trends);
    setWorkoutSplit(splits);

    return { logs: freshLogs, goals: freshGoals, summary };
  };

  // Run on Mount
  useEffect(() => {
    const { summary, goals: loadedGoals } = reloadData();
    
    // Set initial celebration status based on loaded daily statistics
    setCelebratedGoals({
      steps: summary.steps >= loadedGoals.steps,
      water: summary.water >= loadedGoals.water,
      calories: summary.caloriesConsumed >= loadedGoals.calories,
      activeTime: summary.activeTime >= loadedGoals.activeTime
    });
  }, []);

  // ── Midnight Auto-Reset ──────────────────────────────────────────────────
  // Tracks the current date; resets dashboard the moment a new day begins.
  // Runs every 30 seconds AND on page-visibility change (tab comes back into
  // focus after being open overnight).
  useEffect(() => {
    // Store what day we loaded on
    let activeDate = getDateString();

    const handleDayChange = () => {
      const today = getDateString();
      if (today !== activeDate) {
        activeDate = today; // update sentinel
        // Reload data — getDailySummary() will now return zero for the new day
        reloadData();
        // Clear celebration flags for the new day
        setCelebratedGoals({ steps: false, water: false, calories: false, activeTime: false });
        addToast('🌅 New day! Daily stats have reset to zero.', 'info');
      }
    };

    // Poll every 30 seconds (catches midnight while app is open)
    const pollInterval = setInterval(handleDayChange, 30_000);

    // Also fire when the user returns to the tab (e.g. left it open overnight)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleDayChange();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check and trigger confetti celebrations
  const checkGoalAchievements = (summary, currentGoals) => {
    const achievements = {
      steps: summary.steps >= currentGoals.steps,
      water: summary.water >= currentGoals.water,
      calories: summary.caloriesConsumed >= currentGoals.calories,
      activeTime: summary.activeTime >= currentGoals.activeTime
    };

    const newCelebrations = { ...celebratedGoals };
    let triggered = false;

    // Check individual metrics
    if (achievements.steps && !celebratedGoals.steps) {
      newCelebrations.steps = true;
      addToast('🏆 Daily Steps Goal achieved! Fantastic walking!', 'success');
      triggered = true;
    }
    if (achievements.water && !celebratedGoals.water) {
      newCelebrations.water = true;
      addToast('💧 Hydration Goal reached! Pure energy!', 'success');
      triggered = true;
    }
    if (achievements.calories && !celebratedGoals.calories) {
      newCelebrations.calories = true;
      addToast('🍳 Energy Fuel Goal reached! Diet track on point!', 'success');
      triggered = true;
    }
    if (achievements.activeTime && !celebratedGoals.activeTime) {
      newCelebrations.activeTime = true;
      addToast('⚡ Active Workout Goal reached! Feel the burn!', 'success');
      triggered = true;
    }

    if (triggered) {
      setCelebratedGoals(newCelebrations);
      // Trigger canvas confetti celebration
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#8b5cf6', '#6366f1']
      });
    }
  };

  // Add Log Entry Action
  const handleAddLog = (entry) => {
    const newEntry = addLogEntry(entry);
    const { summary, goals: curGoals } = reloadData();
    
    // Quick success toast
    let logTypeLabel = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
    if (entry.type === 'workout') logTypeLabel = `Workout (${entry.workoutType})`;
    if (entry.type === 'food') logTypeLabel = `Meal ("${entry.name}")`;
    
    addToast(`Logged ${logTypeLabel} successfully!`, 'info');
    
    // Check goal criteria for confetti
    checkGoalAchievements(summary, curGoals);
  };

  // Delete Log Entry Action
  const handleDeleteLog = (id) => {
    deleteLogEntry(id);
    const { summary, goals: curGoals } = reloadData();
    addToast('Activity record removed.', 'warning');
    
    // Recalibrate celebrated indicators if value drops below goal
    setCelebratedGoals({
      steps: summary.steps >= curGoals.steps,
      water: summary.water >= curGoals.water,
      calories: summary.caloriesConsumed >= curGoals.calories,
      activeTime: summary.activeTime >= curGoals.activeTime
    });
  };

  // Quick action presets on dashboard


  // Update goals action
  const handleUpdateGoals = (newGoals) => {
    saveGoals(newGoals);
    const { summary } = reloadData();
    addToast('Daily target goals updated.', 'success');

    // Recheck target achievement status
    setCelebratedGoals({
      steps: summary.steps >= newGoals.steps,
      water: summary.water >= newGoals.water,
      calories: summary.caloriesConsumed >= newGoals.calories,
      activeTime: summary.activeTime >= newGoals.activeTime
    });
  };

  // Clear Database Action
  const handleClearDatabase = () => {
    const seedLogs = clearDatabase();
    reloadData();
    addToast('Vault reset. Re-populated default mock records.', 'warning');
    
    setCelebratedGoals({
      steps: false,
      water: false,
      calories: false,
      activeTime: false
    });
  };

  // Save Workout from Live Active Tracker
  const handleSaveWorkout = (workoutLog, stepsLog) => {
    // 1. Commit active workout log
    addLogEntry(workoutLog);

    // 2. Commit steps log if walking/running registered steps
    if (stepsLog) {
      addLogEntry(stepsLog);
    }

    const { summary, goals: curGoals } = reloadData();
    addToast(`Tracked workout successfully saved!`, 'success');
    
    // Auto navigate to dashboard
    setActiveTab('dashboard');

    // Verify celebrations criteria
    checkGoalAchievements(summary, curGoals);
  };

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="app-layout">
      {/* Moving Background Spotlights */}
      <div className="app-bg-glow" />

      {/* Navigation Headers */}
      <header className="app-header">
        <div className="nav-bar">
          <div className="logo-section">
            <div className="logo-icon-container">
              <Zap size={22} fill="var(--color-accent)" className="logo-spark" />
            </div>
            <span className="logo-text">FlexiFit</span>
          </div>

          <nav className="nav-links">
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <TrendingUp size={16} />
              <span className="nav-tab-label">Dashboard</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'tracker' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracker')}
            >
              <Activity size={16} />
              <span className="nav-tab-label">Live Tracker</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={16} />
              <span className="nav-tab-label">Timeline</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={16} />
              <span className="nav-tab-label">Settings</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
            
            {/* Greeting Header */}
            <div className="greeting-card animate-slide-up">
              <div className="greeting-text">
                <span className="greeting-day">{todayDateFormatted}</span>
                <h1 className="greeting-title text-gradient">Track Your Wellness</h1>
                <p className="greeting-subtitle">Your metrics sync locally in your private browser sandbox.</p>
              </div>
              <button 
                className="btn btn-primary log-trigger-btn"
                onClick={() => setIsLogModalOpen(true)}
              >
                <Plus size={18} />
                <span>Log Activity</span>
              </button>
            </div>



            {/* Metric Metrics Grid */}
            <div className="metrics-grid">
              <MetricCard
                title="Steps Walked"
                value={dailySummary.steps}
                target={goals.steps}
                unit="steps"
                colorVar="--color-steps"
                rgbVar="--color-steps-rgb"
                icon={Footprints}
                delay="0.1s"
              />
              <MetricCard
                title="Water Intake"
                value={dailySummary.water}
                target={goals.water}
                unit="ml"
                colorVar="--color-water"
                rgbVar="--color-water-rgb"
                icon={Droplet}
                delay="0.15s"
              />
              <MetricCard
                title="Calories Consumed"
                value={dailySummary.caloriesConsumed}
                target={goals.calories}
                unit="kcal"
                colorVar="--color-active"
                rgbVar="--color-active-rgb"
                icon={Flame} // Food/consumed
                delay="0.2s"
              />
              <MetricCard
                title="Workout active time"
                value={dailySummary.activeTime}
                target={goals.activeTime}
                unit="mins"
                colorVar="--color-calories"
                rgbVar="--color-calories-rgb"
                icon={Clock}
                delay="0.25s"
              />
            </div>

            {/* SVG Interactive Charts */}
            <Charts 
              weeklyTrends={weeklyTrends} 
              workoutSplit={workoutSplit} 
            />

          </div>
        )}

        {/* Live Active Tracker Tab */}
        {activeTab === 'tracker' && (
          <ActiveTracker onSaveWorkout={handleSaveWorkout} />
        )}

        {/* History Logs Tab */}
        {activeTab === 'history' && (
          <HistoryList 
            logs={logs} 
            onDeleteLog={handleDeleteLog} 
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'profile' && (
          <ProfileSettings
            goals={goals}
            onUpdateGoals={handleUpdateGoals}
            onClearDatabase={handleClearDatabase}
          />
        )}

      </main>

      {/* Log Modal overlay */}
      <LogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onAddLog={handleAddLog}
      />

      {/* Toast Alert System */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast-alert toast-${toast.type} glass-panel`}
          >
            <div className="toast-glow-left" />
            <Info size={16} className="toast-icon" />
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>

      <style jsx="true">{`
        .app-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .app-header {
          position: sticky;
          top: 0;
          background: rgba(2, 6, 23, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          z-index: 50;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-icon-container {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
        }

        .logo-spark {
          color: var(--color-accent);
          filter: drop-shadow(0 0 3px rgba(99, 102, 241, 0.8));
        }

        .logo-text {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @media (max-width: 580px) {
          .nav-bar {
            flex-direction: column;
            gap: 16px;
            padding: 16px 12px;
          }
          .nav-tab-label {
            display: none;
          }
          .nav-tab {
            padding: 8px 14px;
          }
        }

        .main-content {
          flex-grow: 1;
          width: 100%;
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 24px 20px;
        }

        /* Greeting Card */
        .greeting-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .greeting-day {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-accent);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .greeting-title {
          font-size: 2.2rem;
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 4px;
        }

        .greeting-subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .log-trigger-btn {
          height: 48px;
          padding: 0 24px;
        }



        /* Metrics grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 1000px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 520px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Toasts alert system */
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 110;
          max-width: 320px;
          pointer-events: none;
        }

        .toast-alert {
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 14px;
          position: relative;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          animation: toastSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: auto;
        }

        @keyframes toastSlide {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .toast-glow-left {
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
        }

        .toast-info .toast-glow-left {
          background: var(--color-accent);
        }

        .toast-success .toast-glow-left {
          background: var(--color-steps);
        }

        .toast-warning .toast-glow-left {
          background: var(--color-calories);
        }

        .toast-info .toast-icon {
          color: var(--color-accent);
        }

        .toast-success .toast-icon {
          color: var(--color-steps);
        }

        .toast-warning .toast-icon {
          color: var(--color-calories);
        }

        .toast-message {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

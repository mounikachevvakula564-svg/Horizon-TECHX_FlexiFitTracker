import React, { useState } from 'react';
import { Target, RotateCcw, AlertTriangle, Check, ShieldAlert } from 'lucide-react';

export default function ProfileSettings({ goals, onUpdateGoals, onClearDatabase }) {
  const [stepsGoal, setStepsGoal] = useState(goals.steps);
  const [waterGoal, setWaterGoal] = useState(goals.water);
  const [caloriesGoal, setCaloriesGoal] = useState(goals.calories);
  const [activeGoal, setActiveGoal] = useState(goals.activeTime);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateGoals({
      steps: parseInt(stepsGoal) || 10000,
      water: parseInt(waterGoal) || 2500,
      calories: parseInt(caloriesGoal) || 2200,
      activeTime: parseInt(activeGoal) || 45
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClear = () => {
    onClearDatabase();
    setShowClearConfirm(false);
    // Refresh states
    setStepsGoal(10000);
    setWaterGoal(2500);
    setCaloriesGoal(2200);
    setActiveGoal(45);
  };

  return (
    <div className="profile-settings-container animate-slide-up" style={{ animationDelay: '0.3s' }}>
      
      {/* 1. Goals Editor */}
      <div className="glass-panel profile-card">
        <div className="profile-header">
          <Target className="profile-icon" size={20} />
          <h3 className="profile-title">Daily Fitness Goals</h3>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="goals-grid">
            <div className="form-group">
              <label className="form-label">Steps Target (steps)</label>
              <input
                type="number"
                value={stepsGoal}
                onChange={(e) => setStepsGoal(e.target.value)}
                min="1000"
                max="50000"
                step="500"
                required
              />
              <span className="goal-desc">Recommended: 8,000 - 12,000 steps</span>
            </div>

            <div className="form-group">
              <label className="form-label">Water Target (ml)</label>
              <input
                type="number"
                value={waterGoal}
                onChange={(e) => setWaterGoal(e.target.value)}
                min="500"
                max="10000"
                step="250"
                required
              />
              <span className="goal-desc">Recommended: 2,000 - 3,500 ml</span>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Calories Consumed Target (kcal)</label>
              <input
                type="number"
                value={caloriesGoal}
                onChange={(e) => setCaloriesGoal(e.target.value)}
                min="1000"
                max="10000"
                step="50"
                required
              />
              <span className="goal-desc">Meal consumption allowance</span>
            </div>

            <div className="form-group">
              <label className="form-label">Workout Active Duration (mins)</label>
              <input
                type="number"
                value={activeGoal}
                onChange={(e) => setActiveGoal(e.target.value)}
                min="10"
                max="300"
                step="5"
                required
              />
              <span className="goal-desc">Recommended: 30 - 60 minutes</span>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary save-btn">
              {saveSuccess ? (
                <>
                  <Check size={16} /> Saved Successfully
                </>
              ) : (
                'Save New Targets'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. System Settings & Hard Reset */}
      <div className="glass-panel profile-card danger-card">
        <div className="profile-header danger-header">
          <ShieldAlert className="profile-icon danger-icon" size={20} />
          <h3 className="profile-title">System & Storage Vault</h3>
        </div>

        <div className="danger-content">
          <p className="danger-text">
            All fitness records and daily targets are stored locally inside your browser's LocalStorage sandbox (simulating SQLite data schemas). Wiping this data will permanently delete your workout timeline and cannot be undone.
          </p>

          {!showClearConfirm ? (
            <button 
              type="button" 
              className="btn danger-btn"
              onClick={() => setShowClearConfirm(true)}
            >
              <RotateCcw size={16} /> Reset Vault (Clear Database)
            </button>
          ) : (
            <div className="clear-confirm-box animate-fade-in">
              <div className="confirm-header">
                <AlertTriangle size={18} className="warning-yellow-icon" />
                <span>Are you absolutely sure you want to reset?</span>
              </div>
              <p className="confirm-desc">This deletes all mock history, steps counts, water intakes, and customs settings.</p>
              <div className="confirm-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary cancel-reset-btn"
                  onClick={() => setShowClearConfirm(false)}
                >
                  No, Keep Data
                </button>
                <button 
                  type="button" 
                  className="btn danger-btn-confirm"
                  onClick={handleClear}
                >
                  Yes, Wipe Database
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .profile-settings-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 40px;
        }

        .profile-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .danger-card {
          border-color: rgba(244, 63, 94, 0.15);
        }

        .danger-card:hover {
          border-color: rgba(244, 63, 94, 0.25);
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }

        .profile-icon {
          color: var(--color-accent);
        }

        .danger-icon {
          color: var(--color-calories);
        }

        .profile-title {
          font-size: 1.1rem;
          color: var(--text-primary);
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .goals-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 600px) {
          .goals-grid {
            grid-template-columns: 1fr;
          }
        }

        .goal-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }

        .save-btn {
          min-width: 180px;
          background: ${saveSuccess ? '#10b981' : 'linear-gradient(135deg, var(--color-accent) 0%, #4f46e5 100%)'};
          box-shadow: ${saveSuccess ? '0 4px 14px 0 rgba(16, 185, 129, 0.3)' : '0 4px 14px 0 rgba(99, 102, 241, 0.3)'};
        }

        /* Danger Section */
        .danger-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        .danger-text {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .danger-btn {
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: var(--color-calories);
        }

        .danger-btn:hover {
          background: rgba(244, 63, 94, 0.15);
          border-color: rgba(244, 63, 94, 0.3);
          transform: translateY(-2px);
        }

        /* Confirm Reset Box */
        .clear-confirm-box {
          width: 100%;
          background: rgba(244, 63, 94, 0.05);
          border: 1px solid rgba(244, 63, 94, 0.15);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .confirm-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 0.92rem;
        }

        .warning-yellow-icon {
          color: #eab308;
        }

        .confirm-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .confirm-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .cancel-reset-btn {
          padding: 8px 16px;
          font-size: 0.8rem;
        }

        .danger-btn-confirm {
          padding: 8px 16px;
          background: var(--color-calories);
          color: white;
          border: none;
          font-size: 0.8rem;
          border-radius: 8px;
          font-family: var(--font-sans);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .danger-btn-confirm:hover {
          background: #e11d48;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

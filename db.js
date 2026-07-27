import React, { useState, useEffect } from 'react';
import { X, Footprints, Flame, Droplet, Coffee } from 'lucide-react';

export default function LogModal({ isOpen, onClose, onAddLog }) {
  const [activeTab, setActiveTab] = useState('steps');
  
  // Steps state
  const [steps, setSteps] = useState('');
  
  // Workout state
  const [workoutType, setWorkoutType] = useState('Running');
  const [duration, setDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [isAutoCalc, setIsAutoCalc] = useState(true);

  // Food state
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');

  // Water state
  const [waterAmount, setWaterAmount] = useState('250');
  const [customWater, setCustomWater] = useState('');

  // Workout MET and default calories calculations
  const metRates = {
    Running: 10,
    Walking: 4.5,
    'Gym Training': 6.5,
    Cycling: 8,
    Yoga: 3,
    Swimming: 9,
    Other: 6
  };

  useEffect(() => {
    if (duration && isAutoCalc) {
      const rate = metRates[workoutType] || 6;
      setCaloriesBurned(Math.round(duration * rate));
    }
  }, [duration, workoutType, isAutoCalc]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let entry = { type: activeTab };

    if (activeTab === 'steps') {
      const val = parseInt(steps);
      if (isNaN(val) || val <= 0) return;
      entry.value = val;
      // Reset
      setSteps('');
    } else if (activeTab === 'workout') {
      const dur = parseInt(duration);
      const cal = parseInt(caloriesBurned);
      if (isNaN(dur) || dur <= 0 || isNaN(cal) || cal <= 0) return;
      entry.workoutType = workoutType;
      entry.duration = dur;
      entry.value = cal; // Calories burned
      // Reset
      setDuration('');
      setCaloriesBurned('');
    } else if (activeTab === 'food') {
      const cal = parseInt(foodCalories);
      if (!foodName.trim() || isNaN(cal) || cal <= 0) return;
      entry.name = foodName;
      entry.value = cal; // Calories consumed
      // Reset
      setFoodName('');
      setFoodCalories('');
    } else if (activeTab === 'water') {
      const amount = waterAmount === 'custom' ? parseInt(customWater) : parseInt(waterAmount);
      if (isNaN(amount) || amount <= 0) return;
      entry.value = amount;
      // Reset
      setCustomWater('');
    }

    onAddLog(entry);
    onClose();
  };

  const tabs = [
    { id: 'steps', label: 'Steps', icon: Footprints, color: 'var(--color-steps)' },
    { id: 'workout', label: 'Workout', icon: Flame, color: 'var(--color-calories)' },
    { id: 'food', label: 'Food & Cal', icon: Coffee, color: 'var(--color-active)' },
    { id: 'water', label: 'Water', icon: Droplet, color: 'var(--color-water)' }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-panel modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title">Manual Log Entry</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation */}
        <div className="modal-tabs">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`modal-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                style={{ '--tab-theme': tab.color }}
                onClick={() => setActiveTab(tab.id)}
              >
                <TabIcon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form-body">
          {activeTab === 'steps' && (
            <div className="form-group animate-fade-in">
              <label className="form-label">Steps Walked</label>
              <div className="input-with-preset">
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  min="1"
                  required
                  autoFocus
                />
              </div>
              <div className="preset-buttons">
                {[1000, 2500, 5000, 10000].map(val => (
                  <button
                    key={val}
                    type="button"
                    className="btn btn-secondary preset-btn"
                    onClick={() => setSteps(val.toString())}
                  >
                    +{val.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workout' && (
            <div className="form-grid animate-fade-in">
              <div className="form-group">
                <label className="form-label">Activity Type</label>
                <select 
                  value={workoutType} 
                  onChange={(e) => setWorkoutType(e.target.value)}
                >
                  <option value="Running">Running</option>
                  <option value="Walking">Walking</option>
                  <option value="Gym Training">Gym Training</option>
                  <option value="Cycling">Cycling</option>
                  <option value="Yoga">Yoga</option>
                  <option value="Swimming">Swimming</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duration (Minutes)</label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div className="form-group full-width">
                <div className="checkbox-label-row">
                  <label className="form-label">Calories Burned (kcal)</label>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      className="checkbox-input"
                      checked={isAutoCalc}
                      onChange={(e) => {
                        setIsAutoCalc(e.target.checked);
                        if (e.target.checked && duration) {
                          setCaloriesBurned(Math.round(duration * (metRates[workoutType] || 6)));
                        }
                      }}
                    />
                    <span className="checkbox-text">Auto-calculate</span>
                  </label>
                </div>
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={caloriesBurned}
                  onChange={(e) => {
                    setCaloriesBurned(e.target.value);
                    setIsAutoCalc(false);
                  }}
                  min="1"
                  required
                />
              </div>
            </div>
          )}

          {activeTab === 'food' && (
            <div className="form-grid animate-fade-in">
              <div className="form-group full-width">
                <label className="form-label">Food / Meal Item</label>
                <input
                  type="text"
                  placeholder="e.g. Grilled Chicken Wrap"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Calories Consumed (kcal)</label>
                <input
                  type="number"
                  placeholder="e.g. 450"
                  value={foodCalories}
                  onChange={(e) => setFoodCalories(e.target.value)}
                  min="1"
                  required
                />
              </div>
            </div>
          )}

          {activeTab === 'water' && (
            <div className="form-group animate-fade-in">
              <label className="form-label">Water Amount</label>
              <div className="preset-grid">
                {[
                  { value: '250', label: 'Cup (250 ml)' },
                  { value: '500', label: 'Bottle (500 ml)' },
                  { value: '750', label: 'Large Bottle (750 ml)' },
                  { value: '1000', label: 'Carafe (1000 ml)' },
                  { value: 'custom', label: 'Custom amount' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`preset-select-card ${waterAmount === opt.value ? 'active' : ''}`}
                    onClick={() => setWaterAmount(opt.value)}
                  >
                    <Droplet 
                      size={20} 
                      className="preset-water-icon" 
                      fill={waterAmount === opt.value ? 'var(--color-water)' : 'transparent'} 
                    />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {waterAmount === 'custom' && (
                <div className="form-group custom-water-input animate-fade-in">
                  <label className="form-label">Enter Custom Amount (ml)</label>
                  <input
                    type="number"
                    placeholder="e.g. 330"
                    value={customWater}
                    onChange={(e) => setCustomWater(e.target.value)}
                    min="1"
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary submit-btn">
              Add Log Entry
            </button>
          </div>
        </form>

      </div>

      <style jsx="true">{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(2, 6, 23, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-container {
          width: 100%;
          max-width: 500px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          animation: modalZoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes modalZoom {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-title {
          font-size: 1.2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
        }

        .modal-close-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .modal-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid var(--border-color);
          background: rgba(15, 23, 42, 0.25);
        }

        .modal-tab-btn {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 14px 8px;
          font-family: var(--font-sans);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .modal-tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }

        .modal-tab-btn.active {
          color: var(--tab-theme);
          border-bottom-color: var(--tab-theme);
          background: rgba(255, 255, 255, 0.04);
        }

        .modal-form-body {
          padding: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .full-width {
          grid-column: span 2;
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .checkbox-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-input {
          width: 16px;
          height: 16px;
          accent-color: var(--color-accent);
          cursor: pointer;
        }

        .checkbox-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .preset-buttons {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 10px;
        }

        .preset-btn {
          padding: 8px 4px;
          font-size: 0.8rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
        }

        /* Preset grid for Water */
        .preset-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .preset-select-card {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: var(--font-sans);
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.2s;
          text-align: left;
        }

        .preset-select-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
        }

        .preset-select-card.active {
          border-color: var(--color-water);
          background: rgba(6, 182, 212, 0.08);
          color: var(--text-primary);
        }

        .preset-water-icon {
          color: var(--text-muted);
          transition: color 0.2s, fill 0.2s;
        }

        .preset-select-card.active .preset-water-icon {
          color: var(--color-water);
        }

        .custom-water-input {
          margin-top: 16px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          border-top: 1px solid var(--border-color);
          padding-top: 20px;
        }

        .submit-btn {
          flex-grow: 1;
          max-width: 200px;
        }

        /* Tab fade-in micro-animation */
        .animate-fade-in {
          animation: modalFadeIn 0.25s ease-out forwards;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

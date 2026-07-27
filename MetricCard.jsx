import React, { useState, useEffect } from 'react';

export default function Charts({ weeklyTrends, workoutSplit }) {
  const [activeMetric, setActiveMetric] = useState('steps');
  const [hoveredBar, setHoveredBar] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Bar Chart Setup
  const metricsConfig = {
    steps: { label: 'Steps', color: 'var(--color-steps)', unit: 'steps' },
    caloriesBurned: { label: 'Calories Burned', color: 'var(--color-calories)', unit: 'kcal' },
    water: { label: 'Water Consumed', color: 'var(--color-water)', unit: 'ml' },
    activeTime: { label: 'Active Time', color: 'var(--color-active)', unit: 'mins' }
  };

  const chartHeight = 160;
  const chartWidth = 500;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const graphHeight = chartHeight - padding.top - padding.bottom;
  const graphWidth = chartWidth - padding.left - padding.right;

  // Calculate max value for active metric
  const maxMetricVal = Math.max(...weeklyTrends.map(d => d[activeMetric]), 10);
  // Round up maxMetricVal to clean steps
  const roundedMax = Math.ceil(maxMetricVal * 1.15 / 10) * 10;

  // 2. Donut Chart Setup
  const totalWorkoutMins = workoutSplit.reduce((acc, curr) => acc + curr.value, 0);
  const donutColors = ['#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b', '#64748b'];

  let accumulatedPercentage = 0;
  const donutSegments = workoutSplit.map((item, idx) => {
    const percentage = totalWorkoutMins > 0 ? (item.value / totalWorkoutMins) * 100 : 0;
    const strokeLength = (percentage / 100) * 314.16; // Circumference for r=50
    const offset = 314.16 - strokeLength + (accumulatedPercentage / 100) * 314.16;
    
    accumulatedPercentage += percentage;
    
    return {
      ...item,
      percentage,
      strokeLength,
      offset: -offset, // Rotated coordinate
      color: donutColors[idx % donutColors.length]
    };
  });

  return (
    <div className="charts-container animate-slide-up" style={{ animationDelay: '0.1s' }}>
      
      {/* 1. Bar Chart Card */}
      <div className="glass-panel chart-card bar-chart-section">
        <div className="chart-header">
          <h3 className="chart-title">Weekly Trends</h3>
          <div className="metric-selector">
            {Object.keys(metricsConfig).map(key => (
              <button
                key={key}
                className={`metric-select-btn ${activeMetric === key ? 'active' : ''}`}
                style={{
                  '--btn-theme': metricsConfig[key].color,
                  '--btn-theme-rgb': key === 'steps' ? 'var(--color-steps-rgb)' : key === 'water' ? 'var(--color-water-rgb)' : key === 'caloriesBurned' ? 'var(--color-calories-rgb)' : 'var(--color-active-rgb)'
                }}
                onClick={() => setActiveMetric(key)}
              >
                {metricsConfig[key].label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-body">
          <svg className="weekly-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yVal = padding.top + graphHeight * (1 - ratio);
              const labelVal = Math.round(roundedMax * ratio);
              return (
                <g key={i} className="gridline-group">
                  <line
                    x1={padding.left}
                    y1={yVal}
                    x2={chartWidth - padding.right}
                    y2={yVal}
                    stroke="rgba(255, 255, 255, 0.04)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={yVal + 4}
                    fill="var(--text-muted)"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {labelVal.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {weeklyTrends.map((data, index) => {
              const barWidth = 32;
              const spacing = graphWidth / weeklyTrends.length;
              const x = padding.left + index * spacing + (spacing - barWidth) / 2;
              
              const val = data[activeMetric];
              const percentHeight = roundedMax > 0 ? (val / roundedMax) : 0;
              const barHeight = mounted ? percentHeight * graphHeight : 0;
              const y = padding.top + graphHeight - barHeight;

              return (
                <g 
                  key={index}
                  onMouseEnter={() => setHoveredBar({ index, x, y, val, day: data.day })}
                  onMouseLeave={() => setHoveredBar(null)}
                  className="bar-group"
                >
                  {/* Background invisible hover target area */}
                  <rect
                    x={x - 6}
                    y={padding.top}
                    width={barWidth + 12}
                    height={graphHeight}
                    fill="transparent"
                    cursor="pointer"
                  />
                  {/* Animated Bar */}
                  <rect
                    className="chart-rect"
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    fill={metricsConfig[activeMetric].color}
                    style={{
                      transition: 'height 0.5s ease-out, y 0.5s ease-out, opacity 0.2s',
                      opacity: hoveredBar && hoveredBar.index !== index ? 0.45 : 1,
                      filter: hoveredBar && hoveredBar.index === index ? `drop-shadow(0 0 6px ${metricsConfig[activeMetric].color})` : 'none'
                    }}
                  />
                  {/* Day labels */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 10}
                    fill={hoveredBar && hoveredBar.index === index ? 'var(--text-primary)' : 'var(--text-muted)'}
                    fontSize="11"
                    fontWeight={hoveredBar && hoveredBar.index === index ? '600' : '400'}
                    textAnchor="middle"
                    style={{ transition: 'color 0.2s' }}
                  >
                    {data.day}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Glowing Tooltip */}
          {hoveredBar && (
            <div 
              className="chart-tooltip" 
              style={{ 
                left: `${(hoveredBar.x + 16) / chartWidth * 100}%`,
                top: `${(hoveredBar.y - 12) / chartHeight * 100}%`,
                borderColor: metricsConfig[activeMetric].color,
                boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4), 0 0 10px ${metricsConfig[activeMetric].color}33`
              }}
            >
              <div className="tooltip-day">{hoveredBar.day}</div>
              <div className="tooltip-value">
                {hoveredBar.val.toLocaleString()}
                <span className="tooltip-unit"> {metricsConfig[activeMetric].unit}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Donut Chart Card */}
      <div className="glass-panel chart-card donut-chart-section">
        <h3 className="chart-title">Workout Split</h3>
        
        {totalWorkoutMins === 0 ? (
          <div className="no-chart-data">
            <span className="no-data-icon">🏋️</span>
            <span className="no-data-text">No workouts logged yet.</span>
          </div>
        ) : (
          <div className="donut-chart-wrapper">
            <div className="donut-svg-container">
              <svg viewBox="0 0 120 120" width="100%" height="100%">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.03)"
                  strokeWidth="11"
                />
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="12"
                    strokeDasharray="314.16"
                    strokeDashoffset={mounted ? seg.offset : '314.16'}
                    strokeLinecap="round"
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                    }}
                  />
                ))}
              </svg>
              <div className="donut-inner-text">
                <span className="donut-inner-val">{totalWorkoutMins}</span>
                <span className="donut-inner-lbl">total mins</span>
              </div>
            </div>

            <div className="donut-legend">
              {donutSegments.map((seg, idx) => (
                <div key={idx} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: seg.color }}></span>
                  <div className="legend-info">
                    <span className="legend-name">{seg.name}</span>
                    <span className="legend-value">{seg.value}m ({Math.round(seg.percentage)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx="true">{`
        .charts-container {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 900px) {
          .charts-container {
            grid-template-columns: 1fr;
          }
        }

        .chart-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 240px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .chart-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .metric-selector {
          display: flex;
          background: rgba(15, 23, 42, 0.4);
          padding: 4px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          gap: 4px;
        }

        .metric-select-btn {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .metric-select-btn:hover {
          color: var(--text-primary);
        }

        .metric-select-btn.active {
          background: rgba(var(--btn-theme-rgb), 0.15);
          color: var(--btn-theme);
          border: 1px solid rgba(var(--btn-theme-rgb), 0.2);
        }

        .chart-body {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 160px;
        }

        .weekly-svg {
          display: block;
          overflow: visible;
        }

        .chart-tooltip {
          position: absolute;
          transform: translate(-50%, -100%);
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid;
          border-radius: 8px;
          padding: 8px 12px;
          z-index: 10;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: left 0.15s ease-out, top 0.15s ease-out;
        }

        .tooltip-day {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .tooltip-value {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .tooltip-unit {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Donut Chart styles */
        .no-chart-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-grow: 1;
          gap: 8px;
          color: var(--text-muted);
        }

        .no-data-icon {
          font-size: 2rem;
        }

        .no-data-text {
          font-size: 0.85rem;
          font-weight: 500;
        }

        .donut-chart-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-around;
          flex-grow: 1;
          gap: 16px;
        }

        @media (max-width: 480px) {
          .donut-chart-wrapper {
            flex-direction: column;
            gap: 24px;
          }
        }

        .donut-svg-container {
          position: relative;
          width: 130px;
          height: 130px;
          flex-shrink: 0;
        }

        .donut-inner-text {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .donut-inner-val {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }

        .donut-inner-lbl {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 160px;
          overflow-y: auto;
          padding-right: 6px;
          width: 100%;
        }

        .legend-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 6px;
          flex-shrink: 0;
        }

        .legend-info {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .legend-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .legend-value {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

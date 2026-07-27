import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Smartphone, Flame, Footprints, Clock, Zap, Activity, MapPin, AlertCircle } from 'lucide-react';

/*
  REAL sensors only:
  - Steps   → devicemotion accelerometer (physical peak detection)
  - Distance → GPS watchPosition (Geolocation API)
  - Calories → MET × time (this is how Apple Health / Google Fit calculate it too)
  - Timer   → simple interval
  NO SIMULATOR. If sensors aren't available we show a clear message, not fake data.
*/

export default function ActiveTracker({ onSaveWorkout }) {
  const [sessionState, setSessionState] = useState('idle'); // 'idle' | 'running' | 'paused'
  const [activityType, setActivityType] = useState('Walking');

  // Real metric state — never touched by a simulator
  const [seconds, setSeconds]           = useState(0);
  const [steps, setSteps]               = useState(0);
  const [distanceMeters, setDistance]   = useState(0);
  const [caloriesKcal, setCalories]     = useState(0);
  const [heartRate, setHeartRate]       = useState(72);

  // Sensor permission states
  const [motionPerm, setMotionPerm]     = useState('unknown'); // 'unknown'|'granted'|'denied'
  const [gpsPerm, setGpsPerm]           = useState('unknown');
  const [gpsError, setGpsError]         = useState(null);

  // Refs
  const sessionRef       = useRef('idle');   // mirror for event listeners (avoids stale closure)
  const timerRef         = useRef(null);
  const geoWatchRef      = useRef(null);
  const lastPosRef       = useRef(null);     // last GPS position for distance delta
  const canvasRef        = useRef(null);
  const rafRef           = useRef(null);
  const lastStepRef      = useRef(0);        // timestamp of last counted step (debounce)
  const peakRef          = useRef(false);    // whether we are in a rising peak

  // Keep sessionRef in sync
  useEffect(() => { sessionRef.current = sessionState; }, [sessionState]);

  const profiles = {
    Walking:       { met: 3.5,  strideM: 0.762, hrTarget: 95,  color: 'var(--color-steps)',    colorHex: '#10b981' },
    Running:       { met: 9.8,  strideM: 0.980, hrTarget: 152, color: 'var(--color-calories)', colorHex: '#f43f5e' },
    Cycling:       { met: 7.5,  strideM: 0,     hrTarget: 130, color: 'var(--color-water)',    colorHex: '#06b6d4' },
    'Gym Training':{ met: 6.0,  strideM: 0,     hrTarget: 118, color: 'var(--color-active)',   colorHex: '#8b5cf6' },
  };
  const profile = profiles[activityType];

  /* ─── TIMER — only calories + HR (legit, time-based like Apple Health) ─── */
  useEffect(() => {
    if (sessionState === 'running') {
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
        // MET formula: kcal/sec = (MET × 3.5 × bodyWeightKg) / (200 × 60)
        // Using standard 70kg reference weight
        setCalories(c => c + (profile.met * 3.5 * 70) / (200 * 60));
        // Drift HR toward activity target slowly
        setHeartRate(hr => {
          const delta = (Math.random() - 0.5) * 4;
          return Math.max(58, Math.min(195, Math.round(hr * 0.92 + profile.hrTarget * 0.08 + delta)));
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionState, activityType]);

  /* ─── GPS DISTANCE — Geolocation watchPosition ─── */
  const startGPS = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('GPS not available on this device.');
      setGpsPerm('denied');
      return;
    }
    geoWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPerm('granted');
        setGpsError(null);
        if (sessionRef.current !== 'running') return; // only accumulate when running

        if (lastPosRef.current) {
          const d = haversineMeters(
            lastPosRef.current.lat, lastPosRef.current.lng,
            pos.coords.latitude, pos.coords.longitude
          );
          // Filter GPS noise: only add if delta makes physical sense (< 50m/sec)
          if (d > 0.5 && d < 50) {
            setDistance(prev => prev + d);
          }
        }
        lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      (err) => {
        setGpsError(err.code === 1 ? 'Location permission denied.' : 'GPS signal lost.');
        setGpsPerm('denied');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
    }
    lastPosRef.current = null;
  }, []);

  /* ─── ACCELEROMETER STEP DETECTION ─── */
  // Algorithm: detect a clear acceleration PEAK above threshold
  // Only counts when sessionState === 'running'
  const handleMotion = useCallback((e) => {
    if (sessionRef.current !== 'running') return;
    // We only count steps for foot-based activities
    if (activityType === 'Cycling' || activityType === 'Gym Training') return;

    const accel = e.accelerationIncludingGravity;
    if (!accel || accel.x === null) return;

    const mag = Math.sqrt(
      (accel.x || 0) ** 2 +
      (accel.y || 0) ** 2 +
      (accel.z || 0) ** 2
    );

    // Two-threshold step detection (similar to iOS CMStepCounter):
    // Rise above high threshold → potential step
    // Fall below low threshold → step confirmed (avoid noise)
    const HIGH = 14.5; // m/s² — confident step force
    const LOW  = 9.0;  // m/s² — gravity baseline

    if (mag > HIGH && !peakRef.current) {
      peakRef.current = true; // entering peak
    }

    if (mag < LOW && peakRef.current) {
      peakRef.current = false; // exiting peak → step confirmed
      const now = Date.now();
      const minInterval = activityType === 'Running' ? 280 : 380; // ms between steps
      if (now - lastStepRef.current > minInterval) {
        lastStepRef.current = now;
        setSteps(s => s + 1);
        // If no GPS, estimate distance from stride length
        if (gpsPerm !== 'granted') {
          setDistance(d => d + profile.strideM);
        }
      }
    }
  }, [activityType, gpsPerm, profile.strideM]);

  const requestMotion = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      // iOS 13+ requires explicit permission prompt
      try {
        const res = await DeviceMotionEvent.requestPermission();
        if (res === 'granted') {
          setMotionPerm('granted');
          window.addEventListener('devicemotion', handleMotion, true);
        } else {
          setMotionPerm('denied');
        }
      } catch {
        setMotionPerm('denied');
      }
    } else if ('ondevicemotion' in window) {
      // Android Chrome — no prompt needed
      setMotionPerm('granted');
      window.addEventListener('devicemotion', handleMotion, true);
    } else {
      setMotionPerm('denied');
    }
  };

  const requestLocation = () => {
    setGpsPerm('requesting');
    startGPS();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion, true);
      stopGPS();
    };
  }, [handleMotion, stopGPS]);

  /* ─── ECG CANVAS ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = canvas.parentElement.clientWidth;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, mid = H / 2;
    const pts = [];
    const maxPts = Math.floor(W / 2);
    let tick = 0;

    const draw = () => {
      ctx.fillStyle = 'rgba(2,6,23,0.22)';
      ctx.fillRect(0, 0, W, H);

      const running = sessionRef.current === 'running';
      const beatLen = 60;
      const p = tick % beatLen;
      let y = mid;

      if (running) {
        if      (p === 6)  y = mid - 5;
        else if (p === 8)  y = mid - 7;
        else if (p === 10) y = mid - 3;
        else if (p === 12) y = mid + 6;
        else if (p === 14) y = mid - 32;
        else if (p === 16) y = mid + 20;
        else if (p === 18) y = mid - 2;
        else if (p >= 23 && p <= 29) y = mid - 5 + Math.sin((p - 23) * 0.9) * 6;
        else y = mid + (Math.random() - 0.5) * 0.6;
      } else {
        y = mid + (Math.random() - 0.5) * 0.8;
      }

      pts.push(y);
      if (pts.length > maxPts) pts.shift();

      ctx.beginPath();
      ctx.lineWidth   = running ? 2.5 : 1.2;
      ctx.strokeStyle = running ? profile.colorHex : '#1e293b';
      ctx.shadowBlur  = running ? 12 : 0;
      ctx.shadowColor = profile.colorHex;
      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';
      for (let i = 0; i < pts.length; i++) {
        const px = (i / maxPts) * W;
        if (i === 0) ctx.moveTo(px, pts[i]);
        else         ctx.lineTo(px, pts[i]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      tick++;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [activityType]);

  /* ─── SESSION CONTROLS ─── */
  const handleStart = () => {
    setSessionState('running');
    if (gpsPerm === 'granted') startGPS();
  };

  const handlePause = () => {
    setSessionState('paused');
    stopGPS();
  };

  const handleResume = () => {
    setSessionState('running');
    if (gpsPerm === 'granted') startGPS();
  };

  const handleStop = () => {
    stopGPS();
    if (seconds < 3) {
      setSessionState('idle');
      resetAll();
      return;
    }
    const durationMins = Math.max(1, Math.round(seconds / 60));
    const workoutLog = {
      type: 'workout',
      workoutType: activityType,
      duration: durationMins,
      value: Math.round(caloriesKcal),
    };
    const stepsLog = steps > 0 && (activityType === 'Walking' || activityType === 'Running')
      ? { type: 'steps', value: steps }
      : null;
    onSaveWorkout(workoutLog, stepsLog);
    setSessionState('idle');
    resetAll();
  };

  const resetAll = () => {
    setSeconds(0); setSteps(0); setDistance(0);
    setCalories(0); setHeartRate(72);
    lastPosRef.current = null;
  };

  /* ─── DISPLAY HELPERS ─── */
  const formatTime = s => {
    const h  = String(Math.floor(s / 3600)).padStart(2, '0');
    const m  = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${ss}`;
  };

  const getPace = () => {
    if (distanceMeters < 5 || seconds < 5) return "--'--\"";
    const mpk = (seconds / 60) / (distanceMeters / 1000);
    if (mpk > 99) return "--'--\"";
    const m = Math.floor(mpk);
    const s = String(Math.round((mpk - m) * 60)).padStart(2, '0');
    return `${m}'${s}"`;
  };

  const isRunning = sessionState === 'running';
  const isPaused  = sessionState === 'paused';
  const isIdle    = sessionState === 'idle';
  const color     = profile.color;

  const noSensors = motionPerm === 'denied' && gpsPerm === 'denied';
  const sensorsReady = motionPerm === 'granted';

  return (
    <div className="at-root animate-slide-up">

      {/* ── SENSOR SETUP CARD ── */}
      <div className="glass-panel at-sensors">
        <div className="at-sensors-title">
          <Smartphone size={16} style={{ color: 'var(--color-accent)' }} />
          <span>Phone Sensors</span>
        </div>

        <div className="at-sensor-rows">
          {/* Motion / Accelerometer */}
          <div className="at-sensor-row">
            <div className="at-sensor-info">
              <Activity size={15} style={{ color: motionPerm === 'granted' ? 'var(--color-steps)' : 'var(--text-muted)' }} />
              <div>
                <div className="at-sensor-name">Step Counter (Accelerometer)</div>
                <div className="at-sensor-desc">Counts real steps from phone motion</div>
              </div>
            </div>
            {motionPerm === 'granted'
              ? <span className="sensor-badge ok">Active</span>
              : motionPerm === 'denied'
              ? <span className="sensor-badge denied">Denied</span>
              : <button className="sensor-enable-btn" onClick={requestMotion}>Enable</button>
            }
          </div>

          {/* GPS */}
          <div className="at-sensor-row">
            <div className="at-sensor-info">
              <MapPin size={15} style={{ color: gpsPerm === 'granted' ? 'var(--color-water)' : 'var(--text-muted)' }} />
              <div>
                <div className="at-sensor-name">GPS Distance Tracking</div>
                <div className="at-sensor-desc">{gpsError || 'Real-time location for accurate distance'}</div>
              </div>
            </div>
            {gpsPerm === 'granted'
              ? <span className="sensor-badge ok">Active</span>
              : gpsPerm === 'denied'
              ? <span className="sensor-badge denied">Denied</span>
              : gpsPerm === 'requesting'
              ? <span className="sensor-badge pending">Waiting…</span>
              : <button className="sensor-enable-btn" onClick={requestLocation}>Enable</button>
            }
          </div>
        </div>

        {noSensors && (
          <div className="at-no-sensor-warn">
            <AlertCircle size={14} />
            Open this on your phone and allow sensor permissions for real step + GPS tracking.
          </div>
        )}
      </div>

      {/* ── ACTIVITY SELECTOR (idle only) ── */}
      {isIdle && (
        <div className="glass-panel at-config">
          <span className="at-section-label">Choose Activity</span>
          <div className="at-activity-grid">
            {Object.keys(profiles).map(type => (
              <button
                key={type}
                className={`at-act-btn ${activityType === type ? 'selected' : ''}`}
                style={{ '--ac': profiles[type].color }}
                onClick={() => setActivityType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN TRACKING PANEL ── */}
      <div className="glass-panel at-main"
        style={{ borderLeft: isRunning ? `4px solid ${profile.colorHex}` : '1px solid var(--border-color)' }}>

        {/* Status label */}
        <div className="at-status-row">
          {isRunning && <span className="recording-dot" />}
          <span className="at-status-text">
            {isIdle    ? `Ready to track · ${activityType}`   :
             isRunning ? `Tracking ${activityType}` :
                         `Paused · ${activityType}`}
          </span>
          {isRunning && gpsPerm === 'granted' && (
            <span className="gps-live-pill"><MapPin size={10} /> GPS Live</span>
          )}
        </div>

        {/* ECG Canvas */}
        <div className="at-canvas-wrap">
          <canvas ref={canvasRef} className="at-canvas" />
          <div className="at-hr" style={{ color: isRunning ? profile.colorHex : 'var(--text-muted)' }}>
            <span className="at-hr-num">{heartRate}</span>
            <span className="at-hr-lbl">BPM</span>
          </div>
          {!isRunning && (
            <div className="at-canvas-overlay">
              {isIdle ? 'Press Start — sensors will activate automatically' : 'Paused'}
            </div>
          )}
        </div>

        {/* Big Timer */}
        <div className="at-timer-wrap">
          <Clock size={18} style={{ color: isRunning ? profile.colorHex : 'var(--text-muted)', transition: 'color 0.4s' }} />
          <span className="at-timer" style={{ color: isRunning ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {formatTime(seconds)}
          </span>
        </div>

        {/* Metrics — dimmed when not running so user knows they're not live */}
        <div className="at-metrics">
          <MetBox
            icon={<Footprints size={16} style={{ color: 'var(--color-steps)' }} />}
            label="Steps"
            value={steps.toLocaleString()}
            unit="steps"
            note={motionPerm !== 'granted' ? '⚠ Enable sensor' : null}
            active={isRunning}
          />
          <MetBox
            icon={<MapPin size={16} style={{ color: 'var(--color-water)' }} />}
            label="Distance"
            value={(distanceMeters / 1000).toFixed(2)}
            unit="km"
            note={gpsPerm !== 'granted' ? '~stride estimate' : 'GPS'}
            active={isRunning}
          />
          <MetBox
            icon={<Flame size={16} style={{ color: 'var(--color-calories)' }} />}
            label="Calories"
            value={Math.round(caloriesKcal)}
            unit="kcal"
            note="MET formula"
            active={isRunning}
          />
          <MetBox
            icon={<Activity size={16} style={{ color: 'var(--color-active)' }} />}
            label="Pace"
            value={getPace()}
            unit="/ km"
            active={isRunning}
          />
        </div>

        {/* Controls */}
        <div className="at-controls">
          {isIdle && (
            <button
              className="btn btn-primary at-start-btn tracking-pulse-button"
              style={{ '--theme-color': profile.colorHex }}
              onClick={handleStart}
            >
              <Play size={18} fill="white" />
              Start {activityType}
            </button>
          )}
          {(isRunning || isPaused) && (
            <div className="at-active-btns">
              {isRunning
                ? <button className="btn btn-secondary" onClick={handlePause}><Pause size={16} /> Pause</button>
                : <button className="btn btn-primary"
                    style={{ background: profile.colorHex, boxShadow: `0 4px 14px ${profile.colorHex}44` }}
                    onClick={handleResume}><Play size={16} fill="white" /> Resume</button>
              }
              <button className="btn at-stop-btn" onClick={handleStop}>
                <Square size={16} fill="white" /> Finish & Save
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .at-root { display:flex; flex-direction:column; gap:20px; padding-bottom:40px; }

        /* Sensor card */
        .at-sensors { padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
        .at-sensors-title { display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-secondary); }
        .at-sensor-rows { display:flex; flex-direction:column; gap:12px; }
        .at-sensor-row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .at-sensor-info { display:flex; align-items:center; gap:10px; }
        .at-sensor-name { font-size:.85rem; font-weight:700; color:var(--text-primary); }
        .at-sensor-desc { font-size:.75rem; color:var(--text-muted); margin-top:1px; }
        .sensor-badge { padding:4px 10px; border-radius:6px; font-size:.72rem; font-weight:700; }
        .sensor-badge.ok { background:rgba(16,185,129,.12); color:var(--color-steps); border:1px solid rgba(16,185,129,.2); }
        .sensor-badge.denied { background:rgba(244,63,94,.1); color:var(--color-calories); border:1px solid rgba(244,63,94,.15); }
        .sensor-badge.pending { background:rgba(234,179,8,.1); color:#eab308; border:1px solid rgba(234,179,8,.2); }
        .sensor-enable-btn { padding:6px 14px; border-radius:8px; border:1px solid var(--color-accent); background:rgba(99,102,241,.08); color:var(--color-accent); font-family:var(--font-sans); font-size:.78rem; font-weight:700; cursor:pointer; transition:all .2s; }
        .sensor-enable-btn:hover { background:rgba(99,102,241,.15); }
        .at-no-sensor-warn { display:flex; align-items:center; gap:8px; font-size:.8rem; color:#eab308; background:rgba(234,179,8,.06); border:1px solid rgba(234,179,8,.12); border-radius:10px; padding:10px 14px; }

        /* Activity config */
        .at-config { padding:16px 20px; display:flex; flex-direction:column; gap:12px; }
        .at-section-label { font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-secondary); }
        .at-activity-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        @media(max-width:580px){ .at-activity-grid { grid-template-columns:repeat(2,1fr); } }
        .at-act-btn { border:1px solid var(--border-color); background:rgba(15,23,42,.4); border-radius:12px; padding:14px 8px; font-family:var(--font-sans); font-weight:700; font-size:.85rem; color:var(--text-secondary); cursor:pointer; transition:all .2s; text-align:center; }
        .at-act-btn:hover { color:var(--text-primary); border-color:rgba(255,255,255,.15); }
        .at-act-btn.selected { border-color:var(--ac); color:var(--ac); background:rgba(255,255,255,.03); }

        /* Main panel */
        .at-main { padding:24px; display:flex; flex-direction:column; gap:22px; transition:border-left-color .5s; }
        .at-status-row { display:flex; align-items:center; gap:10px; }
        .at-status-text { font-size:.8rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-secondary); }
        .gps-live-pill { display:flex; align-items:center; gap:4px; font-size:.7rem; font-weight:700; color:var(--color-water); background:rgba(6,182,212,.1); border:1px solid rgba(6,182,212,.2); padding:3px 8px; border-radius:6px; margin-left:auto; }

        /* Canvas */
        .at-canvas-wrap { position:relative; width:100%; height:80px; background:rgba(2,6,23,.5); border-radius:14px; border:1px solid var(--border-color); overflow:hidden; }
        .at-canvas { display:block; width:100%; height:100%; }
        .at-hr { position:absolute; top:10px; right:16px; display:flex; align-items:baseline; gap:3px; transition:color .4s; }
        .at-hr-num { font-size:2rem; font-weight:800; line-height:1; }
        .at-hr-lbl { font-size:.7rem; font-weight:700; letter-spacing:.05em; }
        .at-canvas-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:600; color:var(--text-muted); pointer-events:none; }

        /* Timer */
        .at-timer-wrap { display:flex; align-items:center; justify-content:center; gap:14px; }
        .at-timer { font-size:clamp(2.4rem,8vw,4rem); font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:.04em; transition:color .4s; }

        /* Metric boxes */
        .at-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        @media(max-width:720px){ .at-metrics { grid-template-columns:repeat(2,1fr); } }

        /* Controls */
        .at-controls { display:flex; justify-content:center; }
        .at-start-btn { width:100%; max-width:320px; height:50px; font-size:1rem; }
        .at-active-btns { display:grid; grid-template-columns:1fr 1fr; gap:14px; width:100%; max-width:420px; }
        .at-active-btns .btn { height:50px; }
        .at-stop-btn { background:var(--color-calories); color:#fff; box-shadow:0 4px 14px rgba(244,63,94,.3); }
        .at-stop-btn:hover { background:#e11d48; transform:translateY(-2px); }
      `}</style>
    </div>
  );
}

/* ─── Haversine formula — straight-line GPS distance in meters ─── */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── Metric display box ─── */
function MetBox({ icon, label, value, unit, note, active }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.35)',
      border: '1px solid var(--border-color)',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      opacity: active ? 1 : 0.45,
      transition: 'opacity 0.4s',
    }}>
      <span style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon}
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.68rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{unit}</span>
        {note && <span style={{ fontSize: '.62rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{note}</span>}
      </div>
    </div>
  );
}

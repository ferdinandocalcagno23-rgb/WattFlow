'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bluetooth, Heart, Zap, Activity, Play, Pause, Plus, Trash2, Settings, Monitor, Save, Edit3, Clock, BarChart2, X, ChevronLeft, RotateCcw, Home, Gauge, Sliders, ArrowRight, SkipForward, BookOpen, XCircle, Eye, EyeOff, Download, ChevronsUpDown, PanelLeftClose, PanelRightClose, Minus, UploadCloud, User, LogOut, HelpCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { bleService } from '@/services/bleService';
import { TrainerData, HeartRateData, Workout, WorkoutSessionState, IntervalStep, RawDataPoint } from '@/types';
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useWorkoutRecorder } from '@/hooks/useWorkoutRecorder';
import { getWorkoutsByProfile, addCustomWorkout, getCustomWorkoutsByProfile, deleteCustomWorkout } from '@/services/dbService';
import type { CustomWorkout, WorkoutRecording, UserProfile } from '@/types';
import { PRE_MADE_WORKOUTS, PreMadeWorkout } from '@/lib/workouts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { syncService } from '@/services/syncService';
import { stravaService } from '@/services/stravaService';
// Development Mirror Branch
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { ProfileSelector } from '@/components/profile/ProfileSelector';
import { HistoryDashboard } from '@/components/history/HistoryDashboard';
import { ProfileDashboard } from '@/components/profile/ProfileDashboard';
import { setActiveProfileId } from '@/services/profileService';


// --- New Component for Resistance Slider ---
const ResistanceSlider = React.memo(({ initialResistance, onCommit }: { initialResistance: number; onCommit: (value: number) => void }) => {
  const [localValue, setLocalValue] = useState(initialResistance);
  const [isDragging, setIsDragging] = useState(false);

  // Sync external changes (only if not currently interacting)
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(initialResistance);
    }
  }, [initialResistance, isDragging]);

  return (
    <div
      className="flex items-center gap-3 w-full max-w-xs"
      onPointerDown={() => setIsDragging(true)}
      onPointerUp={() => setIsDragging(false)}
      onPointerLeave={() => setIsDragging(false)}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
    >
      <label htmlFor="slope-slider" className="font-bold text-xs text-gray-400 uppercase">Slope</label>
      <Slider
        id="slope-slider"
        value={[localValue]}
        onValueChange={(val) => setLocalValue(val[0])}
        onValueCommit={(val) => {
          setLocalValue(val[0]);
          onCommit(val[0]);
          setIsDragging(false);
        }}
        min={0}
        max={100}
        step={1}
      />
      <span className="font-bold text-sm tabular-nums w-12 text-center">{localValue}%</span>
    </div>
  );
});
ResistanceSlider.displayName = 'ResistanceSlider';


// --- Constants & Helpers ---

const FTP_DEFAULT = 200;

// Joe Friel / Coggan Power Zones with Gradient Definitions
const ZONES = [
  { name: 'Z1', label: 'Recovery', min: 0, max: 0.55, color: '#94a3b8', gradient: ['#94a3b8', '#cbd5e1'], desc: '< 55%' },
  { name: 'Z2', label: 'Endurance', min: 0.56, max: 0.75, color: '#06b6d4', gradient: ['#06b6d4', '#67e8f9'], desc: '56-75%' },
  { name: 'Z3', label: 'Tempo', min: 0.76, max: 0.90, color: '#10b981', gradient: ['#10b981', '#6ee7b7'], desc: '76-90%' },
  { name: 'Z4', label: 'Threshold', min: 0.91, max: 1.05, color: '#f59e0b', gradient: ['#f59e0b', '#fcd34d'], desc: '91-105%' },
  { name: 'Z5', label: 'VO2 Max', min: 1.06, max: 1.20, color: '#ef4444', gradient: ['#ef4444', '#fca5a5'], desc: '106-120%' },
  { name: 'Z6', label: 'Anaerobic', min: 1.21, max: 2.50, color: '#8b5cf6', gradient: ['#8b5cf6', '#c4b5fd'], desc: '> 121%' },
  { name: 'Z7', label: 'Neuromuscular', min: 2.51, max: 10.0, color: '#d946ef', gradient: ['#d946ef', '#f0abfc'], desc: '> 251%' },
];

const getZoneColor = (watts: number, ftp: number) => {
  if (ftp === 0) return ZONES[0];
  const ratio = watts / ftp;
  const zone = ZONES.find(z => ratio <= z.max) || ZONES[ZONES.length - 1];
  return zone;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

type ViewState = 'HOME' | 'FREE_RIDE' | 'ERG_MODE' | 'EDITOR' | 'SESSION' | 'HISTORY' | 'PROFILE';

// --- Styled Components (Functional) ---

const Card = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div
    onClick={onClick}
    className={`
      relative
      bg-idx-surface/40 backdrop-blur-xl border border-white/10 rounded-3xl 
      transition-all duration-500 ease-out
      ${onClick ? 'cursor-pointer hover:bg-idx-surface/60 hover:border-white/20' : ''} 
      ${className}
    `}
  >
    {children}
  </div>
);


const GradientText = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <span className={`bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple font-extrabold tracking-tight ${className}`}>
    {children}
  </span>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }: any) => {
  const base = "relative overflow-hidden rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  const styles = {
    primary: "bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:brightness-110 shadow-neon-blue/25 hover:shadow-neon-blue/50 border border-white/20",
    secondary: "bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 backdrop-blur-md",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-red-500/20",
    neon: "bg-transparent border border-neon-cyan/30 text-neon-cyan shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:bg-neon-cyan/5 hover:border-neon-cyan"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant as keyof typeof styles]} ${className}`}>
      {children}
    </button>
  );
};

const WorkoutStepsList = React.memo(({ steps, currentStepIndex, ftp, difficultyBias = 100 }: { steps: IntervalStep[], currentStepIndex: number, ftp: number, difficultyBias: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    // This effect is now empty to disable auto-scrolling
  }, [currentStepIndex]);


  return (
    <div className="bg-black/20 p-4 rounded-3xl border border-white/10 backdrop-blur-sm h-full flex flex-col text-sm">
      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2 px-2">Intervals</h3>
      <div ref={containerRef} className="flex-1 overflow-y-auto pr-2 -mr-2">
        <ul className="space-y-1">
          {steps.map((step, index) => {
            const isPast = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const zone = getZoneColor(step.targetPower, ftp);

            let biasedTargetPower;
            if (step.type === 'ramp' && step.startPower !== undefined) {
              const biasedStart = Math.round(step.startPower * (difficultyBias / 100));
              const biasedEnd = Math.round(step.targetPower * (difficultyBias / 100));
              biasedTargetPower = `${biasedStart}→${biasedEnd}`;
            } else {
              biasedTargetPower = Math.round(step.targetPower * (difficultyBias / 100));
            }


            return (
              <li
                key={step.id}
                ref={isCurrent ? currentStepRef : null}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg transition-all duration-300",
                  isCurrent && 'bg-white/10 ring-2 ring-neon-cyan/80',
                  isPast ? 'opacity-30' : 'opacity-90'
                )}
                style={isCurrent ? {
                  boxShadow: `0 0 15px ${zone.color}40`,
                  border: `1px solid ${zone.color}80`,
                  backgroundColor: `${zone.color}20`,
                } : { border: '1px solid transparent' }}
              >
                <div className="flex items-center gap-3">
                  <div className="font-bold text-white w-16">{formatTime(step.duration)}</div>
                </div>
                <div className="text-right flex-1 truncate">
                  <span className="font-semibold text-white truncate">{step.description || `Z${zone.name}`}</span>
                  <span className="font-mono text-xs text-gray-400 ml-2">@{biasedTargetPower}W</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
});
WorkoutStepsList.displayName = 'WorkoutStepsList';

// --- Workout Preview SVG ---
const WorkoutPreviewSVG = React.memo(({ steps, className = '' }: { steps: import('@/lib/workouts').PreMadeIntervalStep[], className?: string }) => {
  if (!steps || steps.length === 0) return null;
  const W = 240, H = 60;
  const maxPower = Math.max(...steps.map(s => Math.max(s.targetPowerPercent, s.startPowerPercent ?? 0)), 0.5);
  const totalDuration = steps.reduce((a, s) => a + s.duration, 0);
  if (totalDuration === 0) return null;

  const getColor = (pct: number) => {
    if (pct < 0.56) return '#94a3b8';
    if (pct < 0.76) return '#06b6d4';
    if (pct < 0.91) return '#10b981';
    if (pct < 1.06) return '#f59e0b';
    if (pct < 1.21) return '#ef4444';
    return '#8b5cf6';
  };

  let x = 0;
  const rects: React.ReactNode[] = [];
  steps.forEach((step, i) => {
    const w = (step.duration / totalDuration) * W;
    if (step.type === 'ramp' && step.startPowerPercent !== undefined) {
      const y1 = H - (step.startPowerPercent / maxPower) * H;
      const y2 = H - (step.targetPowerPercent / maxPower) * H;
      const color = getColor((step.startPowerPercent + step.targetPowerPercent) / 2);
      rects.push(
        <polygon key={i}
          points={`${x},${H} ${x},${y1} ${x + w},${y2} ${x + w},${H}`}
          fill={color} fillOpacity={0.85}
        />
      );
    } else {
      const h = (step.targetPowerPercent / maxPower) * H;
      const color = getColor(step.targetPowerPercent);
      rects.push(
        <rect key={i} x={x} y={H - h} width={Math.max(w - 0.5, 0.5)} height={h}
          fill={color} fillOpacity={0.85} rx={1}
        />
      );
    }
    x += w;
  });

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className}>
      <rect width={W} height={H} fill="#00000030" rx={4} />
      {rects}
    </svg>
  );
});
WorkoutPreviewSVG.displayName = 'WorkoutPreviewSVG';

function App() {
  // --- Global State ---
  const [view, setView] = useState<ViewState>('HOME');
  const [isTrainerConnected, setIsTrainerConnected] = useState(false);
  const [isHRConnected, setIsHRConnected] = useState(false);
  const [trainerData, setTrainerData] = useState<TrainerData>({ power: 0, cadence: 0, speed: 0 });
  const [hrData, setHrData] = useState<HeartRateData>({ heartRate: 0 });
  const [history, setHistory] = useState<RawDataPoint[]>([]);
  const [ftp, setFtp] = useState(FTP_DEFAULT);
  const [resistanceLevel, setResistanceLevel] = useState(10);
  const [targetPower, setTargetPower] = useState(150);
  const [workout, setWorkout] = useState<Workout>({
    id: 'custom-1', name: 'Neon Intervals', description: 'High intensity neon workout.',
    author: 'User', tags: [], steps: [], totalDuration: 0
  });
  const [session, setSession] = useState<WorkoutSessionState>({
    isActive: false, currentStepIndex: 0, elapsedTimeInStep: 0, totalElapsedTime: 0, isPaused: false, rawData: [], startTime: 0
  });
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [userWorkouts, setUserWorkouts] = useState<WorkoutRecording[]>([]);
  const [customWorkoutsList, setCustomWorkoutsList] = useState<CustomWorkout[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const timerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [isIntervalCreatorOpen, setIsIntervalCreatorOpen] = useState(false);
  const [intervalCreatorData, setIntervalCreatorData] = useState({
    workDuration: 60,
    workPower: 250,
    restDuration: 60,
    restPower: 120,
    repetitions: 5
  });
  const [avg3sPower, setAvg3sPower] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isWorkoutLibraryOpen, setIsWorkoutLibraryOpen] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPWA, setIsPWA] = useState(false);
  const [isInstallHelpOpen, setIsInstallHelpOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [lastSavedWorkout, setLastSavedWorkout] = useState<WorkoutRecording | null>(null);

  // --- Sprint 2 & 3 State ---
  const [difficultyBias, setDifficultyBias] = useState(100); // as percentage
  const [isErgModeActive, setIsErgModeActive] = useState(true);
  const [showHr, setShowHr] = useState(true);
  const [userWeight, setUserWeight] = useState(75); // Sprint 3
  const [kilojoules, setKilojoules] = useState(0); // Sprint 3

  // --- Sprint 3 FTP Test & PW:HR State ---
  const [ftpTestResult, setFtpTestResult] = useState<number | null>(null);
  const [decouplingResult, setDecouplingResult] = useState<number | null>(null);
  const [currentBlockAvgHr, setCurrentBlockAvgHr] = useState(0);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);
  const [isIntervalsCollapsed, setIsIntervalsCollapsed] = useState(false);
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);
  const sessionContainerRef = useRef<HTMLDivElement>(null);


  // --- Hooks ---
  const { isRecording, startRecording, stopRecording, addDatapoint } = useWorkoutRecorder(workout.name, workout.steps, currentProfile?.id || null);


  // --- Effects ---

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWA(true);
    }

    // Initialize auto background sync
    syncService.initAutoSync();
  }, []);

  useEffect(() => {
    const trainerCallback = (data: TrainerData) => {
      setTrainerData(data);
      if (!isTrainerConnected && (bleService.isMocking || data.power > 0)) {
        setIsTrainerConnected(true);
      }
    };
    const hrCallback = (data: HeartRateData) => {
      setHrData(data)
      if (!isHRConnected && (bleService.isMocking || data.heartRate > 0)) {
        setIsHRConnected(true);
      }
    };
    bleService.setCallbacks(trainerCallback, hrCallback);
  }, [isTrainerConnected, isHRConnected]);

  useEffect(() => {
    if (currentProfile) {
      setFtp(currentProfile.ftp);
      setUserWeight(currentProfile.weight);
      loadUserWorkouts();
    }
  }, [currentProfile]);

  const loadUserWorkouts = async () => {
    if (currentProfile?.id) {
      const data = await getWorkoutsByProfile(currentProfile.id);
      setUserWorkouts(data);
      const customData = await getCustomWorkoutsByProfile(currentProfile.id);
      setCustomWorkoutsList(customData);
    }
  };

  useEffect(() => {
    if (view === 'HOME') {
      loadUserWorkouts();
    }
  }, [view]);


  // Background audio hack
  useEffect(() => {
    if (session.isActive && !session.isPaused) {
      audioRef.current?.play().catch(e => console.error("Audio play failed, user interaction may be required.", e));
    } else {
      audioRef.current?.pause();
    }
  }, [session.isActive, session.isPaused]);

  useEffect(() => {
    const total = workout.steps.reduce((acc, step) => acc + step.duration, 0);
    setWorkout(w => ({ ...w, totalDuration: total }));
  }, [workout.steps]);

  useEffect(() => {
    if (isConfirmingClear) {
      const timer = setTimeout(() => setIsConfirmingClear(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingClear]);

  // Effect for recording live data to history
  useEffect(() => {
    if (!session.isActive || session.isPaused) return;

    const time = session.totalElapsedTime;

    const newPoint: RawDataPoint = {
      time,
      power: trainerData.power,
      cadence: trainerData.cadence,
      heartRate: hrData.heartRate || 0,
      speed: trainerData.speed,
    };

    setHistory(prevHistory => {
      if (prevHistory.length > 0) {
        const lastPoint = prevHistory[prevHistory.length - 1];
        const timeDelta = newPoint.time - lastPoint.time;
        if (timeDelta > 0) {
          const workDelta = ((lastPoint.power + newPoint.power) / 2) * timeDelta;
          setKilojoules(prevKj => prevKj + (workDelta / 1000));
        }
      }

      const newHistory = [...prevHistory, newPoint];

      const last3 = newHistory.slice(-3);
      if (last3.length > 0) {
        const avg = last3.reduce((sum, p) => sum + p.power, 0) / last3.length;
        setAvg3sPower(Math.round(avg));
      }

      return newHistory;
    });

    setSession(prev => ({ ...prev, rawData: [...prev.rawData, newPoint] }));

    if (isRecording) {
      addDatapoint(newPoint.power, newPoint.cadence, newPoint.heartRate, newPoint.speed);
    }
  }, [trainerData, hrData, session.isActive, session.isPaused, addDatapoint, isRecording, session.totalElapsedTime]);

  useEffect(() => {
    if (!session.isActive || !workout.steps[session.currentStepIndex] || !isHRConnected) {
      setCurrentBlockAvgHr(0);
      return;
    };

    const stepStartTime = workout.steps.slice(0, session.currentStepIndex).reduce((acc, s) => acc + s.duration, 0);

    const blockData = session.rawData.filter(p => p.time >= stepStartTime && p.time <= session.totalElapsedTime && p.heartRate > 0);

    if (blockData.length > 0) {
      const avgHr = blockData.reduce((sum, p) => sum + p.heartRate, 0) / blockData.length;
      setCurrentBlockAvgHr(Math.round(avgHr));
    } else {
      setCurrentBlockAvgHr(0);
    }
  }, [session.totalElapsedTime, session.currentStepIndex, session.isActive, workout.steps, isHRConnected, session.rawData]);


  // Effect for workout session progression (timers)
  useEffect(() => {
    if (session.isActive && !session.isPaused) {
      timerRef.current = window.setInterval(() => {
        setSession(prev => {
          if (view !== 'SESSION' && view !== 'FREE_RIDE' && view !== 'ERG_MODE') {
            return { ...prev, totalElapsedTime: prev.totalElapsedTime + 1 };
          }

          if (view === 'SESSION') {
            const currentStep = workout.steps[prev.currentStepIndex];
            if (!currentStep) { // Workout finished
              if (timerRef.current) clearInterval(timerRef.current);
              stopRecording();
              setShowSaveModal(true);
              return { ...prev, isPaused: true };
            }

            // --- Step Transition Logic ---
            if (prev.elapsedTimeInStep >= currentStep.duration - 1) { // -1 to match second-based interval
              const nextIndex = prev.currentStepIndex + 1;
              if (nextIndex >= workout.steps.length) {
                if (timerRef.current) clearInterval(timerRef.current);
                stopRecording();
                setShowSaveModal(true);
                return { ...prev, isPaused: true };
              }
              const nextStep = workout.steps[nextIndex];
              const power = nextStep.type === 'ramp' && nextStep.startPower ? nextStep.startPower : nextStep.targetPower;
              const biasedPower = Math.round(power * (difficultyBias / 100));
              if (isErgModeActive) bleService.setTargetPower(biasedPower);

              return { ...prev, currentStepIndex: nextIndex, elapsedTimeInStep: 0, totalElapsedTime: prev.totalElapsedTime + 1 };
            }

            // --- Intra-Step Power Adjustment Logic ---
            if (currentStep.type === 'ramp' && typeof currentStep.startPower !== 'undefined') {
              // For ramps, send power update every second for a smoother transition
              const progress = prev.elapsedTimeInStep / currentStep.duration;
              const range = currentStep.targetPower - currentStep.startPower;
              const currentRampPower = Math.round(currentStep.startPower + (range * progress));
              const biasedRampPower = Math.round(currentRampPower * (difficultyBias / 100));
              if (isErgModeActive) bleService.setTargetPower(biasedRampPower);
            } else if (currentStep.type === 'steady') {
              // For steady intervals, re-send the power command every 5 seconds
              // This makes the workout more robust against missed BLE commands.
              if (prev.elapsedTimeInStep % 5 === 0) {
                const biasedPower = Math.round(currentStep.targetPower * (difficultyBias / 100));
                if (isErgModeActive) bleService.setTargetPower(biasedPower);
              }
            }

            return { ...prev, elapsedTimeInStep: prev.elapsedTimeInStep + 1, totalElapsedTime: prev.totalElapsedTime + 1 };
          }

          // For FREE_RIDE and ERG_MODE, just increment total time
          return { ...prev, totalElapsedTime: prev.totalElapsedTime + 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session.isActive, session.isPaused, workout.steps, stopRecording, view, difficultyBias, isErgModeActive]);

  // --- Wake Lock Effect ---
  useEffect(() => {
    if (!('wakeLock' in navigator)) {
      console.log('Screen Wake Lock API not supported.');
      return;
    }

    const requestWakeLock = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        wakeLockRef.current = lock;
        lock.addEventListener('release', () => {
          console.log('Screen Wake Lock was released');
          wakeLockRef.current = null;
        });
        console.log('Screen Wake Lock is active');
      } catch (err: any) {
        console.error(`Screen Wake Lock error: ${err.name}, ${err.message}`);
      }
    };

    const releaseWakeLock = async () => {
      if (!wakeLockRef.current) return;
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Screen Wake Lock released');
      } catch (err: any) {
        console.error(`Screen Wake Lock error on release: ${err.name}, ${err.message}`);
      }
    };

    if (session.isActive && !session.isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session.isActive && !session.isPaused) {
        if (!wakeLockRef.current) {
          requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session.isActive, session.isPaused]);


  // --- Handlers ---

  const handleConnectTrainer = async () => {
    if (isTrainerConnected) { await bleService.disconnectTrainer(); setIsTrainerConnected(false); }
    else { const success = await bleService.connectTrainer(); if (success) setIsTrainerConnected(success); }
  };
  const handleConnectHR = async () => {
    if (isHRConnected) { await bleService.disconnectHeartRate(); setIsHRConnected(false); }
    else { const success = await bleService.connectHeartRate(); if (success) setIsHRConnected(success); }
  };
  const updateResistance = useCallback((level: number) => { setResistanceLevel(level); bleService.setResistance(level); }, []);
  const updateTargetPower = (watts: number) => { setTargetPower(watts); bleService.setTargetPower(watts); };

  const handleAddIntervals = () => {
    if (intervalCreatorData.repetitions <= 0) return;

    const newSteps: IntervalStep[] = [];
    for (let i = 0; i < intervalCreatorData.repetitions; i++) {
      // Work interval
      newSteps.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'steady',
        duration: intervalCreatorData.workDuration,
        targetPower: intervalCreatorData.workPower,
        description: `Work ${i + 1}/${intervalCreatorData.repetitions}`
      });
      // Rest interval
      newSteps.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'steady',
        duration: intervalCreatorData.restDuration,
        targetPower: intervalCreatorData.restPower,
        description: `Rest ${i + 1}/${intervalCreatorData.repetitions}`
      });
    }

    setWorkout(w => ({ ...w, steps: [...w.steps, ...newSteps] }));
    setIsIntervalCreatorOpen(false); // Close the popup
  };

  const calculateAerobicDecoupling = (rawData: RawDataPoint[], steps: IntervalStep[]): number | null => {
    let firstLongInterval: { step: IntervalStep, startTime: number } | null = null;
    let accumulatedTime = 0;

    for (const step of steps) {
      if (step.type === 'steady' && step.duration >= 600) { // Find first interval >= 10 mins
        firstLongInterval = { step, startTime: accumulatedTime };
        break;
      }
      accumulatedTime += step.duration;
    }

    if (!firstLongInterval) return null;

    const intervalStartTime = firstLongInterval.startTime;
    const intervalEndTime = intervalStartTime + firstLongInterval.step.duration;
    const intervalData = rawData.filter(p => p.time >= intervalStartTime && p.time <= intervalEndTime && p.power > 0 && p.heartRate > 0);

    if (intervalData.length < 120) return null; // Need at least 2 mins of data to be meaningful

    const midPointIndex = Math.floor(intervalData.length / 2);
    const firstHalf = intervalData.slice(0, midPointIndex);
    const secondHalf = intervalData.slice(midPointIndex);

    if (firstHalf.length === 0 || secondHalf.length === 0) return null;

    const avgPower1 = firstHalf.reduce((sum, p) => sum + p.power, 0) / firstHalf.length;
    const avgHr1 = firstHalf.reduce((sum, p) => sum + p.heartRate, 0) / firstHalf.length;

    const avgPower2 = secondHalf.reduce((sum, p) => sum + p.power, 0) / secondHalf.length;
    const avgHr2 = secondHalf.reduce((sum, p) => sum + p.heartRate, 0) / secondHalf.length;

    if (avgHr1 === 0 || avgHr2 === 0) return null; // Avoid division by zero

    const ratio1 = avgPower1 / avgHr1;
    const ratio2 = avgPower2 / avgHr2;

    if (ratio1 === 0) return null; // Avoid division by zero

    const drift = ((ratio1 - ratio2) / ratio1) * 100;

    return parseFloat(drift.toFixed(2));
  }

  const handleSaveWorkout = () => {
    stopRecording();

    // --- FTP Test Calculation ---
    if (workout.name.toLowerCase().includes('ramp test')) {
      const rawData = session.rawData;
      if (rawData.length >= 60) { // Assuming ~1 datapoint per second
        let best1MinPower = 0;
        // Iterate through all possible 60-second windows
        for (let i = 0; i <= rawData.length - 60; i++) {
          const window = rawData.slice(i, i + 60);
          const averagePower = window.reduce((sum, point) => sum + point.power, 0) / 60;
          if (averagePower > best1MinPower) {
            best1MinPower = averagePower;
          }
        }

        if (best1MinPower > 0) {
          const estimatedFtp = Math.round(best1MinPower * 0.75);
          setFtpTestResult(estimatedFtp);
          setShowSaveModal(false);
          return; // Exit early and show the FTP result modal
        }
      }
    }

    // --- Aerobic Decoupling Calculation ---
    const drift = calculateAerobicDecoupling(session.rawData, workout.steps);
    if (drift !== null) {
      setDecouplingResult(drift);
      setShowSaveModal(false); // Hide the save modal
      return; // Show the decoupling modal instead
    }


    const totalPower = session.rawData.reduce((sum, p) => sum + p.power, 0);
    const avgPower = session.rawData.length > 0 ? Math.round(totalPower / session.rawData.length) : 0;

    const workoutToSave: WorkoutRecording = {
      profileId: currentProfile?.id || 0,
      name: workout.name,
      date: new Date(session.startTime),
      duration: session.totalElapsedTime,
      avgPower,
      steps: workout.steps,
      rawData: session.rawData,
      status: 'pending'
    };

    // Skip the auto-download, just save and show completion modal
    setLastSavedWorkout(workoutToSave);
    setIsCompletionModalOpen(true);
    setShowSaveModal(false);
    bleService.setTargetPower(100);
    setSession({ isActive: false, currentStepIndex: 0, elapsedTimeInStep: 0, totalElapsedTime: 0, isPaused: false, rawData: [], startTime: 0 });
  };

  const handleDownloadTcx = (workoutData: WorkoutRecording) => {
    import('@/lib/strava/fitEncoder').then(({ createTcxBlob }) => {
      const tcxBlob = createTcxBlob(workoutData);
      const url = URL.createObjectURL(tcxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workoutData.name.replace(/\s+/g, '_') || 'workout'}.tcx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).catch(err => {
      console.error("Failed to load fitEncoder", err);
    });
  };

  const handleDownloadHistory = (workoutToDownload: WorkoutRecording) => {
    // Lazy load the fitEncoder
    import('@/lib/strava/fitEncoder').then(({ createTcxBlob }) => {
      const tcxBlob = createTcxBlob(workoutToDownload);
      const url = URL.createObjectURL(tcxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workoutToDownload.name.replace(/\s+/g, '_') || 'workout'}.tcx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).catch(err => {
      console.error("Failed to load fitEncoder for history download", err);
    });
  };

  const handleDiscardWorkout = () => {
    setShowSaveModal(false);
    bleService.setTargetPower(100);
    setView('HOME');
    setSession({ isActive: false, currentStepIndex: 0, elapsedTimeInStep: 0, totalElapsedTime: 0, isPaused: false, rawData: [], startTime: 0 });
  };

  const handleSkipInterval = () => {
    if (!session.isActive || session.isPaused) return;

    setSession(prev => {
      const currentStep = workout.steps[prev.currentStepIndex];
      if (!currentStep) return prev; // Should not happen, but safe guard.

      // Add remaining time in current step to total elapsed time to advance progress bar
      const remainingTimeInStep = currentStep.duration - prev.elapsedTimeInStep;
      const newTotalElapsedTime = prev.totalElapsedTime + remainingTimeInStep;

      const nextIndex = prev.currentStepIndex + 1;

      if (nextIndex >= workout.steps.length) {
        // End workout if skipping the last step
        if (timerRef.current) clearInterval(timerRef.current);
        stopRecording();
        setShowSaveModal(true); // show save dialog instead of going home
        return {
          ...prev,
          isPaused: true,
          totalElapsedTime: newTotalElapsedTime, // Update time before stopping
        };
      }

      // Move to next step
      const nextStep = workout.steps[nextIndex];
      const power = nextStep.type === 'ramp' && nextStep.startPower ? nextStep.startPower : nextStep.targetPower;
      const biasedPower = Math.round(power * (difficultyBias / 100));
      if (isErgModeActive) bleService.setTargetPower(biasedPower);

      return {
        ...prev,
        currentStepIndex: nextIndex,
        elapsedTimeInStep: 0,
        totalElapsedTime: newTotalElapsedTime,
      };
    });
  };

  const handleLoadWorkout = (premadeWorkout: PreMadeWorkout) => {
    const newSteps: IntervalStep[] = premadeWorkout.steps.map(step => ({
      ...step,
      id: Math.random().toString(36).substr(2, 9),
      targetPower: Math.round(step.targetPowerPercent * ftp),
      startPower: step.startPowerPercent ? Math.round(step.startPowerPercent * ftp) : undefined,
    }));

    setWorkout({
      ...workout,
      name: premadeWorkout.name,
      description: premadeWorkout.description,
      steps: newSteps,
    });

    setIsWorkoutLibraryOpen(false);
    setSelectedStepId(null);
  };

  const handleLoadCustomWorkout = (customWorkout: CustomWorkout) => {
    const newSteps: IntervalStep[] = customWorkout.steps.map(step => ({
      ...step,
      id: Math.random().toString(36).substr(2, 9),
    }));

    setWorkout({
      ...workout,
      id: customWorkout.id,
      name: customWorkout.name,
      description: customWorkout.description,
      steps: newSteps,
    });

    setIsWorkoutLibraryOpen(false);
    setSelectedStepId(null);
  };

  const handleSaveCustomWorkout = async () => {
    if (!currentProfile?.id) return;
    if (workout.steps.length === 0) return;

    // Ensure workout has a proper unique id for custom workouts
    const customId = workout.id.startsWith('custom-') && workout.id !== 'custom-1'
      ? workout.id
      : `custom-${Date.now()}`;

    const customWorkout: CustomWorkout = {
      ...workout,
      id: customId,
      profileId: currentProfile.id,
    };

    await addCustomWorkout(customWorkout);
    setWorkout(customWorkout); // Update current workout id to the new custom id

    // Refresh list
    const customData = await getCustomWorkoutsByProfile(currentProfile.id);
    setCustomWorkoutsList(customData);
  };

  const handleDeleteCustomWorkout = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProfile?.id) return;
    await deleteCustomWorkout(id);
    const customData = await getCustomWorkoutsByProfile(currentProfile.id);
    setCustomWorkoutsList(customData);
  };

  const startSession = (mode: ViewState) => {
    let sessionName = 'Workout';
    if (mode === 'FREE_RIDE') sessionName = 'Free Ride';
    if (mode === 'ERG_MODE') sessionName = 'ERG Mode';

    setHistory([]);
    setKilojoules(0);
    if (mode === 'FREE_RIDE') {
      setWorkout(w => ({ ...w, name: 'Free Ride', steps: [] }));
      updateResistance(resistanceLevel);
    }
    if (mode === 'ERG_MODE') {
      setWorkout(w => ({ ...w, name: 'ERG Mode', steps: [] }));
      updateTargetPower(targetPower);
    }
    if (mode === 'SESSION') {
      const firstStep = workout.steps[0];
      const power = firstStep.type === 'ramp' && firstStep.startPower ? firstStep.startPower : firstStep.targetPower;
      const biasedPower = Math.round(power * (difficultyBias / 100));
      if (isErgModeActive) bleService.setTargetPower(biasedPower);
    }

    startRecording();
    setSession({ isActive: true, currentStepIndex: 0, elapsedTimeInStep: 0, totalElapsedTime: 0, isPaused: false, rawData: [], startTime: Date.now() });
    setView(mode);
  }

  // --- Sprint 2 Handlers ---
  const handleDifficultyChange = (newBias: number) => {
    const bias = Math.max(50, Math.min(200, newBias)); // Clamp between 50% and 200%
    setDifficultyBias(bias);

    // Also update the power on the trainer immediately
    if (session.isActive && view === 'SESSION' && isErgModeActive) {
      const currentStep = workout.steps[session.currentStepIndex];
      if (!currentStep) return;

      let basePower = currentStep.targetPower;
      if (currentStep.type === 'ramp' && typeof currentStep.startPower !== 'undefined') {
        const progress = session.elapsedTimeInStep / currentStep.duration;
        const range = currentStep.targetPower - currentStep.startPower;
        basePower = Math.round(currentStep.startPower + (range * progress));
      }
      const biasedPower = Math.round(basePower * (bias / 100));
      bleService.setTargetPower(biasedPower);
    }
  };

  const handleTargetPowerAdjust = (delta: number) => {
    if (view === 'ERG_MODE') {
      const newPower = Math.max(50, targetPower + delta);
      updateTargetPower(newPower);
    } else if (view === 'SESSION' && isErgModeActive) {
      const currentStep = workout.steps[session.currentStepIndex];
      if (!currentStep) return;

      let basePower = currentStep.targetPower;
      // For ramps, use the current ramp power as base
      if (currentStep.type === 'ramp' && typeof currentStep.startPower !== 'undefined') {
        const progress = session.elapsedTimeInStep / currentStep.duration;
        const range = currentStep.targetPower - currentStep.startPower;
        basePower = Math.round(currentStep.startPower + (range * progress));
      }
      if (basePower === 0) return; // Avoid division by zero

      const currentBiasedPower = Math.round(basePower * (difficultyBias / 100));
      const newBiasedPower = currentBiasedPower + delta;

      const newBias = Math.round((newBiasedPower / basePower) * 100);

      handleDifficultyChange(newBias);
    }
  };


  const handleErgToggle = (active: boolean) => {
    setIsErgModeActive(active);
    if (!active) {
      // When turning ERG off, switch to a baseline resistance mode
      bleService.setResistance(resistanceLevel);
    } else {
      // When turning ERG on, re-apply the target power immediately
      if (session.isActive && view === 'SESSION') {
        const currentStep = workout.steps[session.currentStepIndex];
        if (!currentStep) return;

        let basePower = currentStep.targetPower;
        if (currentStep.type === 'ramp' && typeof currentStep.startPower !== 'undefined') {
          const progress = session.elapsedTimeInStep / currentStep.duration;
          const range = currentStep.targetPower - currentStep.startPower;
          basePower = Math.round(currentStep.startPower + (range * progress));
        }
        const biasedPower = Math.round(basePower * (difficultyBias / 100));
        bleService.setTargetPower(biasedPower);
      }
    }
  };

  // --- Components ---
  const LiveGraph = ({ zoneColor = '#3b82f6' }: { zoneColor?: string }) => {
    // FIX: Limit history to the last 300 data points (5 minutes) to prevent performance degradation over long sessions.
    const displayHistory = history.slice(-300);

    return (
      <div className="w-full h-full relative" style={{ transform: 'translateZ(0)' }}>
        <div className="w-full h-full pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayHistory}>
              <defs>
                <linearGradient id="powerFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={zoneColor} stopOpacity="0.2" />
                  <stop offset="95%" stopColor={zoneColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              />
              <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
              <YAxis yAxisId="power" orientation="left" domain={[0, 'dataMax + 50']} hide />
              <YAxis yAxisId="hr" orientation="right" domain={['dataMin - 20', 'dataMax + 20']} hide />
              <YAxis yAxisId="cadence" orientation="right" domain={[0, 'dataMax + 40']} hide />

              <Area
                yAxisId="power"
                type="monotone"
                dataKey="power"
                stroke={zoneColor}
                strokeWidth={2}
                fill="url(#powerFill)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              {showHr && isHRConnected && (
                <Line
                  yAxisId="hr"
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )}
              <Line
                yAxisId="cadence"
                type="monotone"
                dataKey="cadence"
                stroke="#06b6d4"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const MetricDisplay = ({ label, value, unit, isTarget = false, color, className }: { label: string, value: string | number, unit: string, isTarget?: boolean, color?: string, className?: string }) => (
    <div className={cn(
      "bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm flex flex-col justify-center items-center text-center h-full",
      isTarget ? 'border-neon-green/30' : '',
      className
    )}>
      <div className="text-sm md:text-base text-gray-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="flex items-baseline justify-center gap-1">
        <span className="font-bold tracking-tighter text-4xl md:text-5xl lg:text-6xl" style={color ? { color } : {}}>{value}</span>
        <span className="text-lg text-gray-500 font-bold">{unit}</span>
      </div>
    </div>
  );

  const WorkoutProfileTooltip = ({ active, payload, label: time, ftp, difficultyBias = 100 }: any) => {
    if (active && payload && payload.length) {
      let stepToShow: IntervalStep | undefined;
      let accumulatedTime = 0;

      // Find the step that contains the hovered `time`
      for (const step of workout.steps) {
        const stepStartTime = accumulatedTime;
        const stepEndTime = accumulatedTime + step.duration;
        if (time >= stepStartTime && time < stepEndTime) {
          stepToShow = step;
          break;
        }
        accumulatedTime = stepEndTime;
      }

      // If hovering past the last step, show the last step's data
      if (!stepToShow && time >= workout.totalDuration && workout.steps.length > 0) {
        stepToShow = workout.steps[workout.steps.length - 1];
      }


      if (stepToShow) {
        const zone = getZoneColor(stepToShow.targetPower, ftp);
        const biasedPower = Math.round(stepToShow.targetPower * (difficultyBias / 100));
        const biasedStartPower = stepToShow.startPower !== undefined ? Math.round(stepToShow.startPower * (difficultyBias / 100)) : undefined;

        let powerString;
        if (stepToShow.type === 'ramp' && biasedStartPower !== undefined) {
          powerString = `${biasedStartPower}→${biasedPower}W`;
        } else {
          powerString = `${biasedPower}W`;
        }

        return (
          <div className="bg-black/80 backdrop-blur-sm p-2 rounded-md border border-white/20 text-xs shadow-lg">
            <p className="font-bold mb-1" style={{ color: zone.color }}>{stepToShow.description || zone.label}</p>
            <p><span className="font-medium text-gray-400">Time:</span> {formatTime(stepToShow.duration)}</p>
            <p><span className="font-medium text-gray-400">Power:</span> {powerString}</p>
          </div>
        );
      }
    }
    return null;
  };


  // --- Views ---

  const renderHome = () => (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto relative z-10 px-4 pt-8 pb-40 md:px-8">
      {/* Ambient Background Blobs specific to Home */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-neon-purple/20 rounded-full blur-[120px] -z-10 animate-pulse-slow mix-blend-screen"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-neon-blue/20 rounded-full blur-[120px] -z-10 animate-pulse-slow mix-blend-screen" style={{ animationDelay: '2s' }}></div>

      <div className="text-center mb-16 relative">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight text-white drop-shadow-2xl">
          Ciao, <GradientText>{currentProfile?.name}</GradientText>!
        </h1>
        <p className="text-lg md:text-xl text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
          Pronto per un nuovo allenamento?
        </p>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
        >
          <HelpCircle size={16} /> Guida App
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-16 px-4">
        {/* Trainer Connect */}
        <Card className={`p-8 flex items-center justify-between border-l-[6px] ${isTrainerConnected ? 'border-l-neon-green bg-gradient-to-r from-neon-green/5 to-transparent' : 'border-l-gray-700'}`}>
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isTrainerConnected ? 'bg-neon-green/20 text-neon-green shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-neon-green/50' : 'bg-white/5 text-gray-500'}`}>
              <Zap size={32} strokeWidth={isTrainerConnected ? 2.5 : 2} />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl">Smart Trainer</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${isTrainerConnected ? 'bg-neon-green shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-gray-600'}`}></span>
                <span className={`text-sm font-medium ${isTrainerConnected ? 'text-neon-green' : 'text-gray-500'}`}>{isTrainerConnected ? 'CONNECTED' : 'OFFLINE'}</span>
              </div>
            </div>
          </div>
          <Button
            variant={isTrainerConnected ? 'secondary' : 'primary'}
            onClick={handleConnectTrainer}
            className="px-8 py-3 text-sm"
          >
            {isTrainerConnected ? 'Disconnect' : 'Connect'}
          </Button>
        </Card>

        {/* HR Connect */}
        <Card className={`p-8 flex items-center justify-between border-l-[6px] ${isHRConnected ? 'border-l-neon-pink bg-gradient-to-r from-neon-pink/5 to-transparent' : 'border-l-gray-700'}`}>
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isHRConnected ? 'bg-neon-pink/20 text-neon-pink shadow-[0_0_20px_rgba(236,72,153,0.3)] ring-1 ring-neon-pink/50' : 'bg-white/5 text-gray-500'}`}>
              <Heart size={32} strokeWidth={isHRConnected ? 2.5 : 2} />
            </div>
            <div>
              <h3 className="font-bold text-white text-xl">Heart Rate</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${isHRConnected ? 'bg-neon-pink shadow-[0_0_10px_#ec4899] animate-pulse' : 'bg-gray-600'}`}></span>
                <span className={`text-sm font-medium ${isHRConnected ? 'text-neon-pink' : 'text-gray-500'}`}>{isHRConnected ? 'CONNECTED' : 'OFFLINE'}</span>
              </div>
            </div>
          </div>
          <Button
            variant={isHRConnected ? 'secondary' : 'primary'}
            onClick={handleConnectHR}
            className="px-8 py-3 text-sm"
          >
            {isHRConnected ? 'Disconnect' : 'Connect'}
          </Button>
        </Card>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4 max-w-7xl">
        {[
          { id: 'FREE_RIDE', icon: Gauge, title: 'Free Ride', desc: 'Manual slope control.', color: 'text-neon-cyan', gradient: 'from-neon-cyan/20 to-transparent' },
          { id: 'ERG_MODE', icon: Zap, title: 'ERG Mode', desc: 'Target power training.', color: 'text-neon-purple', gradient: 'from-neon-purple/20 to-transparent' },
          { id: 'EDITOR', icon: BarChart2, title: 'Workouts', desc: 'Custom interval builder.', color: 'text-neon-green', gradient: 'from-neon-green/20 to-transparent' }
        ].map((item) => (
          <Card
            key={item.id}
            onClick={() => setView(item.id as ViewState)}
            className={`p-10 group transition-all duration-500`}
          >
            <div className="relative z-10">
              <div className={`mb-8 w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/5 group-hover:border-white/20 shadow-lg`}>
                <item.icon size={32} className={`${item.color} drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`} />
              </div>
              <h3 className="text-3xl font-bold mb-3 text-white">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">{item.desc}</p>
              <div className="flex items-center text-sm font-bold text-white/50 group-hover:text-white transition-colors uppercase tracking-widest">
                Enter <ArrowRight size={16} className="ml-2" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl px-4 mt-16">
        {/* Strava Automatic Sync Status */}
        <Card
          onClick={() => setView('PROFILE')}
          className={`p-8 border-l-[6px] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] duration-300 ${currentProfile?.stravaToken ? 'border-l-neon-green bg-gradient-to-r from-neon-green/5 to-transparent shadow-lg shadow-neon-green/5' : 'border-l-gray-600 bg-white/5 hover:border-l-neon-cyan'}`}
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all ${currentProfile?.stravaToken ? 'bg-neon-green/20 text-neon-green shadow-neon-green/20' : 'bg-gray-800 text-gray-400'}`}>
              <RefreshCw size={32} className={currentProfile?.stravaToken ? 'animate-spin-slow' : ''} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-white text-xl mb-2">Sincronizzazione Strava</h3>
              {currentProfile?.stravaToken ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-neon-green">
                    <CheckCircle size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Attiva</span>
                  </div>
                  <p className="text-gray-400 text-sm">I tuoi allenamenti verranno caricati automaticamente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Collega Strava nel tuo <span className="text-neon-cyan font-bold">Profilo</span> per abilitare il caricamento automatico in background.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Strava Manual Upload Guide */}
        <Card className="p-8 border-l-[6px] border-l-neon-amber bg-gradient-to-r from-neon-amber/5 to-transparent">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-neon-amber/20 text-neon-amber flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <UploadCloud size={32} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-white text-xl mb-2">Caricamento Manuale</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Preferisci il metodo classico? Scarica il file <span className="text-white font-mono">.tcx</span> al termine della sessione e caricalo su <a href="https://www.strava.com/upload/select" target="_blank" rel="noreferrer" className="text-neon-cyan hover:underline">strava.com</a>.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderFreeRide = () => {
    if (session.isActive) {
      return renderLiveSessionView('FREE_RIDE');
    }

    // Pre-session configuration view
    return (
      <div className="flex-1 flex flex-col items-center p-6 md:p-12 animate-fade-in max-w-4xl mx-auto w-full">
        <div className="flex-1 flex flex-col justify-center items-center gap-12 w-full">
          <div className="text-center space-y-4">
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter">
              Free <span className="text-neon-cyan">Ride</span>
            </h1>
            <p className="text-xl text-gray-400 font-medium">Imposta la pendenza iniziale.</p>
          </div>

          <Card className="p-8 md:p-12 text-center bg-white/5 border-white/10 rounded-[2.5rem] w-full shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <span className="text-gray-500 font-bold uppercase block mb-8 text-xs tracking-[0.2em] relative z-10">Slope Resistance</span>
            <div className="font-black tracking-tighter text-9xl md:text-[12rem] text-neon-cyan drop-shadow-[0_0_30px_rgba(6,182,212,0.3)] relative z-10" style={{ lineHeight: 1 }}>
              {resistanceLevel}%
            </div>
            <div className="mt-16 space-y-6 relative z-10">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={resistanceLevel}
                onChange={(e) => setResistanceLevel(parseInt(e.target.value))}
                className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-neon-cyan"
              />
              <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <span>Pianura (0%)</span>
                <span>Salita (100%)</span>
              </div>
            </div>
          </Card>

          <Button
            onClick={() => startSession('FREE_RIDE')}
            className="w-full md:w-auto px-24 py-8 text-3xl font-black rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] hover:shadow-[0_0_70px_rgba(6,182,212,0.5)] transition-all hover:scale-105 active:scale-95"
            variant="primary"
          >
            <Play size={32} fill="currentColor" className="mr-2" /> START
          </Button>
        </div>
      </div>
    );
  };

  const renderErgMode = () => {
    if (session.isActive) {
      return renderLiveSessionView('ERG_MODE');
    }

    // Pre-session configuration view
    return (
      <div className="flex-1 flex flex-col items-center p-6 md:p-12 animate-fade-in max-w-4xl mx-auto w-full">
        <div className="flex-1 flex flex-col justify-center items-center gap-12 w-full">
          <div className="text-center space-y-4">
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter">
              ERG <span className="text-neon-purple">Mode</span>
            </h1>
            <p className="text-xl text-gray-400 font-medium">Imposta la tua potenza target.</p>
          </div>

          <Card className="p-8 md:p-12 text-center bg-white/5 border-white/10 rounded-[2.5rem] w-full shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <span className="text-gray-500 font-bold uppercase block mb-8 text-xs tracking-[0.2em] relative z-10">Target Power Control</span>

            <div className="flex items-center justify-center gap-8 md:gap-12 relative z-10">
              <button
                onClick={() => updateTargetPower(Math.max(50, targetPower - 10))}
                className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all active:scale-90 group/btn"
              >
                <Plus size={40} className="rotate-45 text-gray-500 group-hover/btn:text-white transition-colors" />
              </button>

              <div className="relative">
                <div className="text-9xl md:text-[12rem] font-black text-white tabular-nums drop-shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                  {targetPower}
                </div>
                <div className="text-2xl text-gray-500 font-black absolute -top-2 -right-8">W</div>
              </div>

              <button
                onClick={() => updateTargetPower(Math.min(1000, targetPower + 10))}
                className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center transition-all active:scale-90 shadow-[0_0_30px_rgba(139,92,246,0.2)] group/btn"
              >
                <Plus size={40} className="text-neon-purple group-hover/btn:text-white transition-colors" />
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-16 relative z-10">
              {[100, 150, 200, 250, 300].map(w => (
                <button
                  key={w}
                  onClick={() => updateTargetPower(w)}
                  className={`px-8 py-4 rounded-2xl font-black transition-all border text-lg ${targetPower === w ? 'bg-neon-purple text-white border-neon-purple shadow-[0_0_25px_rgba(139,92,246,0.5)] scale-110' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
                >
                  {w}W
                </button>
              ))}
            </div>
          </Card>

          <Button
            onClick={() => startSession('ERG_MODE')}
            className="w-full md:w-auto px-24 py-8 text-3xl font-black rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.3)] hover:shadow-[0_0_70px_rgba(139,92,246,0.5)] transition-all hover:scale-105 active:scale-95"
            variant="primary"
          >
            <Play size={32} fill="currentColor" className="mr-2" /> START
          </Button>
        </div>
      </div>
    );
  };

  const renderEditor = () => {
    // Helper to add interval
    const addStep = (type: 'steady' | 'ramp', zoneIndex: number, label: string) => {
      const zone = ZONES[zoneIndex];
      const defaultPercents = [0.50, 0.65, 0.83, 0.98, 1.13, 1.50, 2.50];
      const powerPercent = defaultPercents[zoneIndex] || 0.50;
      const power = Math.round(ftp * powerPercent);

      let step: IntervalStep = {
        id: Math.random().toString(36).substr(2, 9),
        type: type, duration: 300, targetPower: power, description: label || zone.label
      };

      if (type === 'ramp') {
        if (label === 'Warm up') {
          step.startPower = Math.round(ftp * 0.40); step.targetPower = Math.round(ftp * 0.75); step.duration = 600;
        } else if (label === 'Cool down') {
          step.startPower = Math.round(ftp * 0.75); step.targetPower = Math.round(ftp * 0.40); step.duration = 300;
        }
      }
      setWorkout(w => ({ ...w, steps: [...w.steps, step] }));
      setSelectedStepId(step.id);
    };

    const getRoundedPath = (x: number, width: number, y1: number, y2: number) => {
      const r = 0; // Removed radius for sharp corners

      let d = `M ${x},100 `;
      d += `L ${x},${y1 + r} `;
      d += `L ${x + width},${y2 + r} `;
      d += `L ${x + width},100 Z`;
      return d;
    };

    const renderGraph = () => {
      if (workout.steps.length === 0) return (
        <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-2 animate-pulse border border-white/5">
            <BarChart2 size={40} className="opacity-40" />
          </div>
          <p className="text-sm tracking-widest uppercase">Workout Empty</p>
          <p className="text-xs text-gray-500">Select a zone below to construct sequence</p>
        </div>
      )
      const maxPower = Math.max(...workout.steps.map(s => Math.max(s.targetPower, s.startPower || 0)));
      const yMax = Math.max(maxPower * 1.1, ftp * 1.5);
      let currentX = 0;

      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
          <defs>
            {ZONES.map((z) => (
              <linearGradient key={z.name} id={`grad-${z.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={z.gradient[0]} stopOpacity="0.9" />
                <stop offset="100%" stopColor={z.gradient[1]} stopOpacity="0.2" />
              </linearGradient>
            ))}
            <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {ZONES.slice(0, 6).map((z, i) => {
            const y = 100 - (z.max * ftp / yMax * 100);
            return (
              <line key={z.name} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
            );
          })}

          {workout.steps.map((step, index) => {
            const widthPct = (step.duration / workout.totalDuration) * 100;
            const startP = step.type === 'ramp' && step.startPower ? step.startPower : step.targetPower;
            const endP = step.targetPower;
            const yStart = 100 - ((startP / yMax) * 100);
            const yEnd = 100 - ((endP / yMax) * 100);

            const avgPower = (startP + endP) / 2;
            const zone = getZoneColor(avgPower, ftp);
            const isSelected = step.id === selectedStepId;

            const pathD = getRoundedPath(currentX, widthPct, yStart, yEnd);

            const element = (
              <g key={step.id} onClick={() => setSelectedStepId(step.id)} className="cursor-pointer group">
                <path
                  d={pathD}
                  fill={`url(#grad-${zone.name})`}
                  stroke={isSelected ? 'white' : 'transparent'}
                  strokeWidth={0.2}
                  vectorEffect="non-scaling-stroke"
                  className={`transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'}`}
                />
              </g>
            );
            currentX += widthPct;
            return element;
          })}
        </svg>
      );
    }

    return (
      <div className="h-full flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto w-full p-4 md:p-8">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex-1 bg-white/5 rounded-2xl p-3 px-5 border border-white/5 flex items-center gap-3 backdrop-blur-md">
            <Edit3 size={18} className="text-gray-400" />
            <input
              value={workout.name}
              onChange={(e) => setWorkout({ ...workout, name: e.target.value })}
              className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full placeholder-gray-600"
              placeholder="Workout Name..."
            />
          </div>
          <div className="flex gap-2 h-full">
            <Button onClick={() => setIsWorkoutLibraryOpen(true)} variant="secondary" className="px-4">
              <BookOpen size={18} /> Load
            </Button>
            <Button onClick={handleSaveCustomWorkout} variant="secondary" className="px-4 text-neon-cyan border-neon-cyan/30 hover:bg-neon-cyan/10 hover:border-neon-cyan">
              <Save size={18} /> Save
            </Button>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 rounded-2xl p-3 px-5 border border-white/5 backdrop-blur-md">
              <label className="text-[10px] text-gray-500 font-bold uppercase block">FTP Target</label>
              <div className="flex items-center gap-1">
                <input type="number" value={ftp} onChange={(e) => setFtp(parseInt(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-neon-blue w-16 focus:outline-none" />
                <span className="text-xs text-gray-400">W</span>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 px-5 border border-white/5 backdrop-blur-md">
              <label className="text-[10px] text-gray-500 font-bold uppercase block">Weight</label>
              <div className="flex items-center gap-1">
                <input type="number" value={userWeight} onChange={(e) => setUserWeight(parseInt(e.target.value) || 0)} className="bg-transparent text-xl font-bold text-neon-blue w-16 focus:outline-none" />
                <span className="text-xs text-gray-400">kg</span>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 px-5 border border-white/5 backdrop-blur-md">
              <label className="text-[10px] text-gray-500 font-bold uppercase block">Duration</label>
              <div className="text-xl font-bold text-white">{formatTime(workout.totalDuration)}</div>
            </div>
          </div>
        </div>

        <Card className="h-[450px] relative flex flex-col p-8">
          <div className="flex-1 w-full h-full z-10">{renderGraph()}</div>

          {workout.steps.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setIsConfirmingClear(!isConfirmingClear ? true : false); if (isConfirmingClear) { setWorkout(w => ({ ...w, steps: [], totalDuration: 0 })); setSelectedStepId(null); setIsConfirmingClear(false); } }}
              className={`absolute top-6 right-6 z-20 flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all border shadow-lg ${isConfirmingClear ? "bg-red-500/20 text-red-400 border-red-500" : "bg-black/40 text-gray-400 border-white/10 hover:text-white hover:bg-white/5"}`}
            >
              <Trash2 size={14} /> {isConfirmingClear ? "Confirm?" : "Clear"}
            </button>
          )}

          {selectedStepId && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
              <div className="animate-slide-up bg-black/90 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl flex items-center gap-6 ring-1 ring-white/10">
                {['duration', 'targetPower'].map(field => (
                  <div key={field} className="flex flex-col items-center">
                    <label className="text-[10px] text-gray-500 font-bold block uppercase mb-1">{field === 'duration' ? 'Secs' : 'Watts'}</label>
                    <input type="number" className="bg-white/5 rounded-lg text-white w-20 p-1 text-center font-bold border border-white/10 focus:border-neon-blue focus:bg-white/10 outline-none transition-colors"
                      value={(workout.steps.find(s => s.id === selectedStepId) as any)?.[field] || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setWorkout(w => ({ ...w, steps: w.steps.map(s => s.id === selectedStepId ? { ...s, [field]: val } : s) }))
                      }}
                    />
                  </div>
                ))}
                <div className="h-8 w-px bg-white/10"></div>
                <button onClick={() => { setWorkout(w => ({ ...w, steps: w.steps.filter(s => s.id !== selectedStepId) })); setSelectedStepId(null); }} className="p-2 hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-lg transition-colors"><Trash2 size={18} /></button>
                <button onClick={() => setSelectedStepId(null)} className="p-2 hover:bg-white/10 hover:text-white text-gray-400 rounded-lg transition-colors"><X size={18} /></button>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-3 md:grid-cols-9 gap-3 mt-2">
          <button onClick={() => addStep('ramp', 0, 'Warm up')} className="h-24 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-center justify-center gap-2 group">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white">Warm Up</span>
            <div className="w-12 h-1.5 bg-gradient-to-r from-gray-700 to-gray-400 rounded-full"></div>
          </button>

          <button onClick={() => setIsIntervalCreatorOpen(true)} className="h-24 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-center justify-center gap-2 group">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white">Intervals</span>
            <Sliders size={24} className="text-neon-purple" />
          </button>

          {ZONES.slice(0, 6).map((z, i) => (
            <button key={z.name} onClick={() => addStep('steady', i, '')}
              className="relative h-24 rounded-2xl border border-white/5 transition-all group overflow-hidden"
              style={{ backgroundColor: `${z.color}10` }}
            >
              <div className="absolute bottom-0 left-0 right-0 h-1.5 transition-all" style={{ backgroundColor: z.color }}></div>

              <div className="flex flex-col items-center justify-center h-full relative z-10">
                <span className="text-xl font-black text-white drop-shadow-md mb-1">{z.name}</span>
                <div className="px-2 py-0.5 rounded bg-black/40 border border-white/5 backdrop-blur-sm">
                  <span className="text-[10px] text-gray-300 font-bold">{Math.round(ftp * z.min)}-{Math.round(ftp * (z.max > 2 ? 2 : z.max))}w</span>
                </div>
              </div>
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/20 rounded-2xl transition-all"></div>
            </button>
          ))}

          <button onClick={() => addStep('ramp', 0, 'Cool down')} className="h-24 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-center justify-center gap-2 group">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white">Cool Down</span>
            <div className="w-12 h-1.5 bg-gradient-to-r from-gray-400 to-gray-700 rounded-full"></div>
          </button>
        </div>

        <div className="flex justify-end pt-4 pb-8">
          <Button
            onClick={() => {
              if (workout.steps.length === 0) return;
              startSession('SESSION');
            }}
            disabled={workout.steps.length === 0}
            className="w-full md:w-auto px-16 py-5 text-xl bg-gradient-to-r from-neon-green via-neon-cyan to-neon-blue shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)]"
          >
            <Play size={24} fill="currentColor" /> INITIATE
          </Button>
        </div>
      </div>
    );
  };

  const renderIntervalCreator = () => {
    if (!isIntervalCreatorOpen) return null;

    const inputStyle = "bg-white/5 rounded-lg text-white w-full p-2 text-center font-bold border border-white/10 focus:border-neon-blue focus:bg-white/10 outline-none transition-colors";

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
        <Card className="w-full max-w-lg p-6 md:p-8 relative shadow-2xl shadow-neon-purple/20 border-neon-purple/20">
          <button onClick={() => setIsIntervalCreatorOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white text-center">Create Interval Set</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            {/* Work Block */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
              <label className="text-sm font-bold text-neon-green uppercase tracking-widest block text-center">Work</label>
              <div>
                <label className="text-xs text-gray-400">Duration (s)</label>
                <input type="number" value={intervalCreatorData.workDuration} onChange={(e) => setIntervalCreatorData(d => ({ ...d, workDuration: parseInt(e.target.value) || 0 }))} className={inputStyle} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Power (W)</label>
                <input type="number" value={intervalCreatorData.workPower} onChange={(e) => setIntervalCreatorData(d => ({ ...d, workPower: parseInt(e.target.value) || 0 }))} className={inputStyle} />
              </div>
            </div>

            {/* Rest Block */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
              <label className="text-sm font-bold text-neon-cyan uppercase tracking-widest block text-center">Rest</label>
              <div>
                <label className="text-xs text-gray-400">Duration (s)</label>
                <input type="number" value={intervalCreatorData.restDuration} onChange={(e) => setIntervalCreatorData(d => ({ ...d, restDuration: parseInt(e.target.value) || 0 }))} className={inputStyle} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Power (W)</label>
                <input type="number" value={intervalCreatorData.restPower} onChange={(e) => setIntervalCreatorData(d => ({ ...d, restPower: parseInt(e.target.value) || 0 }))} className={inputStyle} />
              </div>
            </div>
          </div>

          {/* Repetitions */}
          <div className="mb-8">
            <label className="text-sm font-bold text-white uppercase tracking-widest text-center block mb-3">Repetitions</label>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setIntervalCreatorData(d => ({ ...d, repetitions: Math.max(1, d.repetitions - 1) }))} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-3xl font-light transition active:scale-95">-</button>
              <input type="number" value={intervalCreatorData.repetitions} onChange={(e) => setIntervalCreatorData(d => ({ ...d, repetitions: parseInt(e.target.value) || 1 }))} className="bg-transparent text-white text-5xl font-bold text-center w-24 focus:outline-none tabular-nums" />
              <button onClick={() => setIntervalCreatorData(d => ({ ...d, repetitions: d.repetitions + 1 }))} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-3xl font-light transition active:scale-95">+</button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button onClick={() => setIsIntervalCreatorOpen(false)} variant="secondary" className="px-8 py-3">Cancel</Button>
            <Button onClick={handleAddIntervals} variant="primary" className="px-8 py-3 from-neon-purple to-neon-blue">Add to Workout</Button>
          </div>
        </Card>
      </div>
    );
  };

  const renderSaveModal = () => {
    if (!showSaveModal) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center sm:justify-center z-50 animate-fade-in sm:p-4">
        <Card className="w-full sm:w-auto sm:max-w-lg p-6 sm:p-8 relative rounded-t-3xl sm:rounded-3xl rounded-b-none sm:rounded-b-xl shadow-2xl shadow-neon-blue/20 border-neon-blue/20">
          <h2 className="text-3xl font-bold mb-4 text-white text-center">In pausa</h2>
          <p className="text-gray-400 text-center mb-8">Cosa desideri fare con questa sessione?</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleDiscardWorkout}
              variant="danger"
              className="px-6 py-4 text-lg"
            >
              <XCircle size={20} className="mr-2" />
              Scarta
            </Button>
            <Button
              onClick={() => {
                setShowSaveModal(false);
                setSession(s => ({ ...s, isPaused: false }));
              }}
              variant="secondary"
              className="px-6 py-4 text-lg"
            >
              Riprendi
            </Button>
            <Button
              onClick={handleSaveWorkout}
              variant="primary"
              className="px-6 py-4 text-lg from-neon-green to-neon-cyan"
            >
              <Save size={20} className="mr-2" />
              Salva
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  const renderCompletionModal = () => {
    if (!isCompletionModalOpen || !lastSavedWorkout) return null;

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
        <Card className="w-full max-w-md p-8 bg-idx-surface/90 border-neon-green/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-green to-neon-cyan" />

          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-bounce-slow">
              <CheckCircle size={48} />
            </div>

            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Allenamento Salvato!</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Ottimo lavoro. La tua sessione è stata salvata correttamente nell'**Archivio** dell'app.
            </p>

            <div className="w-full space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3">Opzioni Esportazione</p>
                <p className="text-xs text-gray-400 mb-4">
                  Se vuoi caricare manualmente questo allenamento su Strava o Garmin, scarica il file ora:
                </p>
                <Button
                  onClick={() => handleDownloadTcx(lastSavedWorkout)}
                  variant="outline"
                  className="w-full border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 py-6"
                >
                  <Download size={20} className="mr-2" />
                  Scarica File .TCX
                </Button>
              </div>

              <Button
                onClick={() => {
                  setIsCompletionModalOpen(false);
                  setView('HOME');
                }}
                variant="primary"
                className="w-full py-6 text-lg from-neon-green to-neon-cyan shadow-lg shadow-neon-green/20"
              >
                Torna alla Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="max-w-7xl mx-auto w-full px-6 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Archivio Workout</h1>
        </div>
        <HistoryDashboard
          workouts={userWorkouts}
          profile={currentProfile}
          stravaAuthUrl={stravaService.getAuthUrl()}
          onDownloadTcx={handleDownloadHistory}
          onSyncWorkout={async (workout) => {
            const success = await syncService.syncSingleWorkout(workout);
            if (success) {
              await loadUserWorkouts();
            }
          }}
        />
      </div>
    );
  };

  const renderProfile = () => {
    if (!currentProfile) return null;
    return (
      <ProfileDashboard
        profile={currentProfile}
        workouts={userWorkouts}
        onProfileUpdated={(updated) => {
          setCurrentProfile(updated);
          setFtp(updated.ftp);
          setUserWeight(updated.weight);
        }}
      />
    );
  };

  const renderWorkoutLibrary = () => {
    if (!isWorkoutLibraryOpen) return null;

    const allCategories: string[] = customWorkoutsList.length > 0
      ? ['Custom', ...Array.from(new Set(PRE_MADE_WORKOUTS.map(w => w.category)))]
      : Array.from(new Set(PRE_MADE_WORKOUTS.map(w => w.category)));

    const activeCategory = libraryCategory || allCategories[0];

    const workoutsForCategory = activeCategory === 'Custom'
      ? null
      : PRE_MADE_WORKOUTS.filter(w => w.category === activeCategory);

    // Split into 2 rows: first half + second half
    const buildRows = <T,>(items: T[]): [T[], T[]] => {
      const mid = Math.ceil(items.length / 2);
      return [items.slice(0, mid), items.slice(mid)];
    };

    const categoryColors: Record<string, string> = {
      Custom: 'border-neon-cyan text-neon-cyan',
      Recovery: 'border-slate-400 text-slate-300',
      Endurance: 'border-cyan-400 text-cyan-300',
      'Sweet Spot': 'border-emerald-400 text-emerald-300',
      Threshold: 'border-amber-400 text-amber-300',
      'VO2 Max': 'border-red-400 text-red-300',
      Testing: 'border-purple-400 text-purple-300',
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col text-white animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Workout Library</h2>
            <p className="text-sm text-gray-400 mt-0.5">FTP attuale: {ftp}W</p>
          </div>
          <button
            onClick={() => setIsWorkoutLibraryOpen(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-6 py-3 overflow-x-auto shrink-0 scrollbar-none">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setLibraryCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${activeCategory === cat
                ? `${categoryColors[cat] || 'border-white text-white'} bg-white/10`
                : 'border-white/10 text-gray-400 hover:bg-white/5'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Workout Grid – 2 rows, horizontal scroll */}
        <div className="flex-1 overflow-hidden px-6 pb-6">
          {activeCategory === 'Custom' ? (
            <div className="grid grid-flow-col grid-rows-2 gap-4 h-full overflow-x-auto py-2" style={{ gridAutoColumns: '280px' }}>
              {customWorkoutsList.map(cw => (
                <div key={cw.id} className="bg-white/5 border border-neon-cyan/20 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors group">
                  <div>
                    <h4 className="font-bold text-white text-base">{cw.name}</h4>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock size={11} /> {formatTime(cw.totalDuration)}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={() => handleLoadCustomWorkout(cw)} variant="primary" className="flex-1 py-2 text-sm">Carica</Button>
                    <Button onClick={(e: any) => handleDeleteCustomWorkout(cw.id, e)} variant="danger" className="px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : workoutsForCategory && (() => {
            const [row1, row2] = buildRows(workoutsForCategory);
            const allRows = [row1, row2];
            const colCount = Math.max(row1.length, row2.length);
            return (
              <div
                className="grid gap-4 h-full overflow-x-auto py-2"
                style={{
                  gridTemplateRows: 'repeat(2, 1fr)',
                  gridTemplateColumns: `repeat(${colCount}, 260px)`,
                  gridAutoFlow: 'column',
                }}
              >
                {allRows.flatMap((row, ri) =>
                  row.map((pw, ci) => {
                    const totalMins = Math.round(pw.steps.reduce((a, s) => a + s.duration, 0) / 60);
                    return (
                      <div
                        key={pw.id}
                        className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col hover:bg-white/10 transition-colors"
                        style={{ gridRow: ri + 1, gridColumn: ci + 1 }}
                      >
                        {/* Title row */}
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-white text-sm leading-tight flex-1 pr-2 truncate">{pw.name}</h4>
                          <span className="text-[10px] text-gray-500 shrink-0 flex items-center gap-1"><Clock size={9} />{totalMins}m</span>
                        </div>
                        {/* SVG Preview */}
                        <WorkoutPreviewSVG steps={pw.steps} className="w-full rounded-lg mb-2" />
                        {/* Load button */}
                        <Button onClick={() => handleLoadWorkout(pw)} variant="primary" className="w-full py-1.5 text-xs mb-2">Carica Workout</Button>
                        {/* Compact description strip */}
                        <p className="text-[10px] text-gray-500 leading-tight truncate">{pw.description}</p>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const renderFtpResultModal = () => {
    if (!ftpTestResult) return null;

    const handleAcceptFtp = () => {
      setFtp(ftpTestResult);
      setFtpTestResult(null); // Close modal
      bleService.setTargetPower(100);
      setView('HOME');
      setSession({ isActive: false, currentStepIndex: 0, elapsedTimeInStep: 0, totalElapsedTime: 0, isPaused: false, rawData: [], startTime: 0 });
    };

    const handleDeclineFtp = () => {
      setFtpTestResult(null); // Close modal
      bleService.setTargetPower(100);
      setView('HOME');
      setSession({ isActive: false, currentStepIndex: 0, elapsedTimeInStep: 0, totalElapsedTime: 0, isPaused: false, rawData: [], startTime: 0 });
    };

    return (
      <Dialog open={!!ftpTestResult} onOpenChange={(isOpen) => !isOpen && handleDeclineFtp()}>
        <DialogContent aria-describedby={undefined} className="max-w-[90vw] rounded-lg sm:max-w-md bg-idx-surface/80 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-white text-center">FTP Test Complete!</DialogTitle>
            <DialogDescription className="text-gray-400 text-center pt-2">
              Based on your performance, your estimated FTP is:
            </DialogDescription>
          </DialogHeader>
          <div className="text-center my-6">
            <span className="text-8xl font-bold text-neon-amber tracking-tighter">{ftpTestResult}</span>
            <span className="text-2xl text-gray-400 font-bold ml-2">W</span>
          </div>
          <p className="text-center text-sm text-gray-400 mb-6">
            Would you like to update your FTP setting from {ftp}W to {ftpTestResult}W? This will adjust the power targets for all workouts.
          </p>
          <DialogFooter className="sm:justify-center gap-4">
            <Button onClick={handleDeclineFtp} variant="secondary" className="px-8 py-3">No, Thanks</Button>
            <Button onClick={handleAcceptFtp} variant="primary" className="px-8 py-3 from-neon-amber to-amber-600">Yes, Update FTP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderAerobicDecouplingModal = () => {
    if (decouplingResult === null) return null;

    const handleClose = () => {
      setDecouplingResult(null);
      // After showing the result, proceed with the normal save/exit flow
      const totalPower = session.rawData.reduce((sum, p) => sum + p.power, 0);
      const avgPower = session.rawData.length > 0 ? Math.round(totalPower / session.rawData.length) : 0;
      const workoutToSave: Omit<WorkoutRecording, 'id' | 'status' | 'stravaId'> = {
        profileId: currentProfile?.id || 0,
        name: workout.name, date: new Date(session.startTime), duration: session.totalElapsedTime,
        avgPower, steps: workout.steps, rawData: session.rawData,
      };

      import('@/lib/strava/fitEncoder').then(({ createTcxBlob }) => {
        const tcxBlob = createTcxBlob(workoutToSave as WorkoutRecording);
        const url = URL.createObjectURL(tcxBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${workout.name.replace(/\s+/g, '_') || 'workout'}.tcx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        bleService.setTargetPower(100);
        setView('HOME');
        setSession({ isActive: false, currentStepIndex: 0, elapsedTimeInStep: 0, totalElapsedTime: 0, isPaused: false, rawData: [], startTime: 0 });
      }).catch(err => {
        console.error(err);
        bleService.setTargetPower(100);
        setView('HOME');
        setSession({ isActive: false, currentStepIndex: 0, elapsedTimeInStep: 0, totalElapsedTime: 0, isPaused: false, rawData: [], startTime: 0 });
      });
    };

    return (
      <Dialog open={decouplingResult !== null} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent aria-describedby={undefined} className="max-w-[90vw] rounded-lg sm:max-w-md bg-idx-surface/80 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-white text-center">Workout Analysis</DialogTitle>
            <DialogDescription className="text-gray-400 text-center pt-2">
              Your Aerobic Decoupling (Cardiac Drift) is:
            </DialogDescription>
          </DialogHeader>
          <div className="text-center my-6">
            <span className="text-8xl font-bold text-neon-cyan tracking-tighter">{decouplingResult.toFixed(2)}%</span>
          </div>
          <p className="text-center text-sm text-gray-400 mb-6">
            This measures how much your heart rate drifts for the same power output. A value under 5% indicates strong aerobic fitness. A higher value might suggest fatigue or dehydration.
          </p>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleClose} variant="primary" className="px-8 py-3 from-neon-cyan to-neon-blue">Got it!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };


  const renderSession = () => {
    const totalDuration = workout.totalDuration;

    const biasedStepsData = workout.steps.flatMap((step, i) => {
      const start = workout.steps.slice(0, i).reduce((a, b) => a + b.duration, 0);
      const sP = step.type === 'ramp' && step.startPower ? step.startPower : step.targetPower;
      const eP = step.targetPower;

      const biasedSP = Math.round(sP * (difficultyBias / 100));
      const biasedEP = Math.round(eP * (difficultyBias / 100));

      return [{ time: start, power: biasedSP }, { time: start + step.duration, power: biasedEP }];
    });


    const workoutProfile = (
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={biasedStepsData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sessionFill" x1="0%" y1="0" x2="100%" y2="0">
                {workout.steps.map((step, index) => {
                  const zone = getZoneColor(step.targetPower, ftp);
                  const prevStepsDuration = workout.steps.slice(0, index).reduce((acc, s) => acc + s.duration, 0);
                  const stepStartOffset = (prevStepsDuration / totalDuration) * 100;
                  const stepEndOffset = ((prevStepsDuration + step.duration) / totalDuration) * 100;
                  const color = zone.color;
                  return (
                    <React.Fragment key={step.id}>
                      <stop offset={`${stepStartOffset}%`} stopColor={color} stopOpacity={0.8} />
                      <stop offset={`${stepEndOffset}%`} stopColor={color} stopOpacity={0.8} />
                    </React.Fragment>
                  )
                })}
              </linearGradient>
            </defs>
            <Tooltip
              content={<WorkoutProfileTooltip ftp={ftp} difficultyBias={difficultyBias} />}
              cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '3 3' }}
              allowEscapeViewBox={{ x: true, y: false }}
            />
            <XAxis dataKey="time" type="number" domain={[0, totalDuration]} hide />
            <YAxis domain={[0, 'dataMax + 100']} hide />
            <Area
              type={workout.steps.some(s => s.type === 'ramp') ? 'monotone' : 'stepAfter'}
              dataKey="power"
              strokeWidth={0}
              fill="url(#sessionFill)"
              isAnimationActive={false}
            />
            {/* Progress Cursor */}
            <foreignObject
              x={`${(session.totalElapsedTime / workout.totalDuration) * 100}%`}
              y="0"
              width="2"
              height="100%"
              style={{ overflow: 'visible' }}
            >
              <div
                className="w-0.5 h-full bg-white shadow-[0_0_20px_white] z-20"
              >
                <div className="absolute top-0 -left-[5px] w-3 h-3 bg-white rounded-full shadow-[0_0_15px_white]"></div>
              </div>
            </foreignObject>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );

    return renderLiveSessionView('SESSION', workoutProfile);
  };

  const MainMetric = ({ label, value, unit, zoneColor = '#FFFFFF', className = '' }: { label: string; value: string | number; unit: string; zoneColor?: string; className?: string }) => (
    <div className={`text-center ${className}`}>
      <div className="text-gray-400 text-base md:text-2xl font-medium">{label}</div>
      <div className="font-bold tracking-tighter text-[clamp(4.5rem,15vw,9rem)] md:text-[12rem] lg:text-[14rem]" style={{ color: zoneColor, lineHeight: 1, textShadow: `0 0 20px ${zoneColor}40` }}>
        {value}
      </div>
      <div className="text-gray-500 text-lg md:text-2xl font-bold">{unit}</div>
    </div>
  );

  const ControlsFooter = ({ mode }: { mode: ViewState }) => {
    const isIntervalSession = mode === 'SESSION';

    const renderLeftControls = () => {
      if (mode === 'FREE_RIDE') {
        return (
          <ResistanceSlider initialResistance={resistanceLevel} onCommit={updateResistance} />
        );
      }

      // For SESSION mode, show bias controls
      if (isIntervalSession) {
        return (
          <div className="flex items-center gap-1">
            <Button onClick={() => handleDifficultyChange(difficultyBias - 1)} variant="secondary" className="rounded-xl w-12 h-12 text-xl">-</Button>
            <div className="font-bold text-sm tabular-nums w-16 text-center">
              <div className="text-xs text-gray-400">BIAS</div>
              {difficultyBias}%
            </div>
            <Button onClick={() => handleDifficultyChange(difficultyBias + 1)} variant="secondary" className="rounded-xl w-12 h-12 text-xl">+</Button>
          </div>
        );
      }

      // For ERG or other modes, just a placeholder
      return <div className="w-40" />
    }

    return (
      <footer className="fixed bottom-0 left-0 right-0 bg-idx-surface border-t border-white/10 z-30 p-2 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between gap-1 sm:gap-2 flex-wrap md:flex-nowrap max-w-5xl mx-auto">
          {/* Left Controls */}
          <div className="flex-1 flex justify-start pl-1 sm:pl-2 min-w-[30%]">
            {renderLeftControls()}
          </div>

          {/* Main Transport */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 mx-auto">
            <Button
              onClick={() => {
                setSession(s => ({ ...s, isPaused: true }));
                setShowSaveModal(true);
              }}
              variant="danger"
              className="w-12 h-12 md:w-14 md:h-14 rounded-xl"
            >
              <div className="w-3 h-3 md:w-4 md:h-4 bg-current rounded-sm"></div>
            </Button>
            <Button
              onClick={() => setSession(s => ({ ...s, isPaused: !s.isPaused }))}
              className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-white text-black hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-white/20"
            >
              {session.isPaused ? <Play size={28} fill="black" className="ml-1 md:ml-2" /> : <Pause size={28} fill="black" />}
            </Button>
            <Button
              onClick={handleSkipInterval}
              disabled={!isIntervalSession}
              variant="secondary"
              className="w-12 h-12 md:w-14 md:h-14 rounded-xl"
            >
              <SkipForward size={20} className="md:w-6 md:h-6" />
            </Button>
          </div>

          {/* Right Controls */}
          <div className="flex-1 flex justify-end pr-1 sm:pr-2 min-w-[30%]">
            {isIntervalSession ? (
              <div className="flex flex-col items-center justify-center">
                <Button
                  onClick={() => handleErgToggle(!isErgModeActive)}
                  variant={isErgModeActive ? 'primary' : 'secondary'}
                  className={`w-14 h-12 md:w-20 md:h-14 rounded-xl flex flex-col items-center justify-center gap-0 md:gap-0.5 transition-all ${isErgModeActive ? 'border-neon-cyan/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'opacity-70'}`}
                >
                  <span className="font-bold text-[10px] md:text-xs uppercase tracking-widest text-gray-300">ERG</span>
                  <span className={`text-xs md:text-sm font-black ${isErgModeActive ? 'text-neon-cyan' : 'text-gray-500'}`}>{isErgModeActive ? 'ON' : 'OFF'}</span>
                </Button>
              </div>
            ) : <div className="w-14 md:w-40" />}
          </div>
        </div>
      </footer>
    );
  };

  const renderLiveSessionView = (mode: ViewState, topPanelContent?: React.ReactNode) => {
    const isIntervalSession = mode === 'SESSION';
    const currentStep = isIntervalSession ? workout.steps[session.currentStepIndex] : undefined;
    const currentPowerZone = getZoneColor(trainerData.power, ftp);
    const avgPowerZone = getZoneColor(avg3sPower, ftp);
    const wattsPerKg = userWeight > 0 ? (avg3sPower / userWeight).toFixed(1) : '0.0';

    const sessionDataWithHr = session.rawData.filter(p => p.heartRate > 0);
    const sessionAvgHr = sessionDataWithHr.length > 0
      ? Math.round(sessionDataWithHr.reduce((sum, p) => sum + p.heartRate, 0) / sessionDataWithHr.length)
      : 0;

    const SessionGridMetric = ({ label, value, unit, color, isTarget = false, className = '' }: any) => (
      <div
        className={cn(
          "relative p-[1px] rounded-xl h-full group",
          className
        )}
        style={color ? { '--metric-color': color } as React.CSSProperties : {}}
      >
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl transition-colors duration-500 opacity-50",
          "group-hover:from-[color:var(--metric-color)]",
          isTarget && "from-neon-green/30"
        )} />

        <div className="bg-[#09090b] relative h-full rounded-xl p-2 sm:p-4 flex flex-col justify-center items-center text-center">
          <div className="text-xs sm:text-sm md:text-base text-gray-400 uppercase tracking-widest mb-1">{label}</div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-bold tracking-tighter text-3xl sm:text-4xl md:text-5xl lg:text-5xl" style={color ? { color } : {}}>{value}</span>
            <span className="text-sm sm:text-lg text-gray-500 font-bold">{unit}</span>
          </div>
        </div>
      </div>
    );

    const EditableTargetMetric = ({ value, unit, onAdjust }: { value: string | number; unit: string; onAdjust: (delta: number) => void; }) => (
      <div
        className="relative p-[1px] rounded-xl h-full group"
        style={{ '--metric-color': `#10b981` } as React.CSSProperties}
      >
        <div className={cn(
          "absolute inset-0 bg-gradient-to-b from-neon-green/30 to-transparent rounded-xl transition-colors duration-500 opacity-50",
          "group-hover:from-[color:var(--metric-color)]"
        )} />

        <div className="bg-[#09090b] relative h-full rounded-xl p-2 sm:p-4 flex flex-col justify-center items-center text-center">
          <div className="text-xs sm:text-sm md:text-base text-gray-400 uppercase tracking-widest mb-1">Target</div>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-white/5 border-white/10 z-10 relative" onClick={() => onAdjust(-5)}>
              <Minus size={16} className="sm:w-5 sm:h-5 text-gray-400" />
            </Button>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-bold tracking-tighter text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-neon-green">{value}</span>
              <span className="text-sm sm:text-lg text-gray-500 font-bold">{unit}</span>
            </div>
            <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-white/5 border-white/10 z-10 relative" onClick={() => onAdjust(5)}>
              <Plus size={16} className="sm:w-5 sm:h-5 text-gray-400" />
            </Button>
          </div>
        </div>
      </div>
    );

    let targetPowerDisplay: string | number = '~';
    if (isIntervalSession && currentStep) {
      if (currentStep.type === 'ramp') {
        const progress = session.elapsedTimeInStep / currentStep.duration;
        const range = currentStep.targetPower - (currentStep.startPower || 0);
        const currentRampPower = Math.round((currentStep.startPower || 0) + (range * progress));
        targetPowerDisplay = Math.round(currentRampPower * (difficultyBias / 100));
      } else {
        targetPowerDisplay = Math.round(currentStep.targetPower * (difficultyBias / 100));
      }
    } else if (mode === 'ERG_MODE') {
      targetPowerDisplay = targetPower;
    }

    const finalTopPanelContent = (mode === 'FREE_RIDE' || mode === 'ERG_MODE') ? <LiveGraph zoneColor={avgPowerZone.color} /> : (topPanelContent || <LiveGraph zoneColor={avgPowerZone.color} />);

    const isTargetEditable = (isErgModeActive && isIntervalSession) || mode === 'ERG_MODE';


    return (
      <div className="flex flex-col h-screen min-h-0">
        <div className={cn(
          "relative w-full px-4 pt-4 transition-all duration-300",
          isProfileCollapsed ? "h-12" : "h-[20vh]"
        )}>
          {!isProfileCollapsed && finalTopPanelContent}
          <Button onClick={() => setIsProfileCollapsed(!isProfileCollapsed)} variant="secondary" size="icon" className="absolute top-2 right-2 z-20 !w-8 !h-8 bg-black/30 backdrop-blur-sm">
            <ChevronsUpDown size={16} />
          </Button>
        </div>

        <div ref={sessionContainerRef} className="flex-1 flex min-h-0 p-4 pb-28">
          {mode === 'SESSION' && (
            <>
              <div
                className={cn("relative h-full transition-all duration-300 hidden md:flex flex-col", isIntervalsCollapsed && 'overflow-hidden')}
                style={{ width: isIntervalsCollapsed ? '3rem' : `30%` }}
              >
                {!isIntervalsCollapsed && <WorkoutStepsList steps={workout.steps} currentStepIndex={session.currentStepIndex} ftp={ftp} difficultyBias={difficultyBias} />}
                <Button onClick={() => setIsIntervalsCollapsed(!isIntervalsCollapsed)} variant="secondary" size="icon" className="absolute top-2 right-2 z-20 !w-8 !h-8 bg-black/30 backdrop-blur-sm">
                  {isIntervalsCollapsed ? <PanelRightClose size={16} /> : <PanelLeftClose size={16} />}
                </Button>
              </div>
            </>
          )}

          <div className={cn(
            "relative flex-1 transition-all duration-500 flex flex-col",
            isGridCollapsed ? "w-12" : "flex-1",
            (mode !== 'SESSION' && !isGridCollapsed) && 'w-full'
          )}>
            {!isGridCollapsed ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 h-full">
                {/* Row 1: Power */}
                <SessionGridMetric label="Power" value={trainerData.power} unit="W" color={currentPowerZone.color} />
                <SessionGridMetric label="Avg 3s" value={avg3sPower} unit="W" color={avgPowerZone.color} />
                {(isIntervalSession || mode === 'ERG_MODE') ? (
                  isTargetEditable ? (
                    <EditableTargetMetric value={targetPowerDisplay} unit="W" onAdjust={handleTargetPowerAdjust} />
                  ) : (
                    <SessionGridMetric label="Target" value={targetPowerDisplay} unit="W" isTarget />
                  )
                ) : <SessionGridMetric label="Speed" value={trainerData.speed.toFixed(1)} unit="km/h" color="#94a3b8" />}
                <SessionGridMetric label="W/kg" value={wattsPerKg} unit="" color="#94a3b8" />

                {/* Row 2: Metabolic */}
                {isHRConnected && <SessionGridMetric label="FC" value={hrData.heartRate > 0 ? hrData.heartRate : '--'} unit="BPM" color="#ef4444" className="bg-red-900/10 border-red-500/20" />}
                {isHRConnected && (
                  mode === 'SESSION' ?
                    <SessionGridMetric label="Avg FC Block" value={currentBlockAvgHr > 0 ? currentBlockAvgHr : '--'} unit="BPM" color="#ef4444" className="bg-red-900/10 border-red-500/20" /> :
                    <SessionGridMetric label="Avg FC" value={sessionAvgHr > 0 ? sessionAvgHr : '--'} unit="BPM" color="#ef4444" className="bg-red-900/10 border-red-500/20" />
                )}
                <SessionGridMetric label="Cadence" value={trainerData.cadence} unit="RPM" color="#06b6d4" />
                <SessionGridMetric label="Work" value={Math.round(kilojoules)} unit="kCal" color="#f59e0b" />

                {/* Row 3: Time */}
                {isIntervalSession && currentStep && <SessionGridMetric label="Step Time" value={formatTime(currentStep.duration - session.elapsedTimeInStep)} unit="" className="lg:col-span-2" />}
                <SessionGridMetric label="Total Time" value={formatTime(session.totalElapsedTime)} unit="" className={isIntervalSession ? "lg:col-span-2" : "col-span-2 lg:col-span-4"} />
              </div>
            ) : (<div></div>)}
            <Button onClick={() => setIsGridCollapsed(!isGridCollapsed)} variant="secondary" size="icon" className="absolute top-2 right-2 z-20 !w-8 !h-8 bg-black/30 backdrop-blur-sm md:hidden">
              {isGridCollapsed ? <PanelRightClose size={16} /> : <PanelLeftClose size={16} />}
            </Button>
          </div>
        </div>

        <ControlsFooter mode={mode} />
      </div>
    );
  };

  // --- Main Layout ---

  if (!currentProfile) {
    return <ProfileSelector onProfileSelected={(p) => setCurrentProfile(p)} />;
  }

  return (
    <div className="min-h-screen selection:bg-neon-blue selection:text-white flex flex-col relative text-gray-200 overflow-x-hidden">
      {/* Global Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-neon-blue/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] bg-neon-purple/5 blur-[100px] rounded-full" />
      </div>

      {/* Header / Profile Info */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-8 flex justify-between items-center z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {view !== 'HOME' && !session.isActive && (
              <button
                onClick={() => setView('HOME')}
                className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all text-gray-400 hover:text-white"
                aria-label="Back to Home"
              >
                <Home size={22} />
              </button>
            )}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center p-[2px]">
              <div className="w-full h-full rounded-full bg-idx-bg flex items-center justify-center overflow-hidden">
                {currentProfile.avatar ? (
                  <img src={`/avatars/${currentProfile.avatar}.png`} alt={currentProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-neon-blue" />
                )}
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">{currentProfile.name}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest">
              <Zap className="w-3 h-3 text-neon-cyan" />
              <span>{ftp}W FTP</span>
            </div>
          </div>
        </div>
        {!session.isActive && (
          <button
            onClick={() => { setActiveProfileId(null); setCurrentProfile(null); }}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Switch Profile</span>
          </button>
        )}
      </div>


      <audio ref={audioRef} loop src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" style={{ display: 'none' }} />
      {renderIntervalCreator()}
      {renderSaveModal()}
      {renderWorkoutLibrary()}
      {renderFtpResultModal()}
      {renderAerobicDecouplingModal()}

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-[92vw] max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-2xl bg-idx-surface/95 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-white text-center flex items-center justify-center gap-3">
              <HelpCircle className="text-neon-cyan" size={28} /> Guida WattFlow
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-center pt-2">
              Tutto quello che devi sapere per usare l'app al meglio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 my-4 text-sm text-gray-300">
            {[
              {
                title: '🔌 Connessione Trainer',
                desc: 'Premi "Connect" per collegare il tuo smart trainer via Bluetooth. L\'app supporta il protocollo FTMS. Puoi anche collegare una fascia cardio separatamente.',
              },
              {
                title: '🚴 Free Ride',
                desc: 'Modalità pedalata libera. Imposti una pendenza simulata (0-100%) e pedali senza target di potenza. Puoi modificare la resistenza anche durante la sessione.',
              },
              {
                title: '⚡ ERG Mode',
                desc: 'Modalità a potenza costante. Imposti un target in Watt e il trainer si adatta automaticamente alla tua cadenza per mantenere la potenza fissa.',
              },
              {
                title: '📋 Workout Editor',
                desc: 'Crea allenamenti strutturati con intervalli. Puoi aggiungere zone di potenza, riscaldamento, defaticamento e serie di intervalli personalizzati. Salva i tuoi workout per riutilizzarli.',
              },
              {
                title: '📚 Libreria Workout',
                desc: 'Una raccolta di allenamenti pre-costruiti organizzati per categoria (endurance, soglia, VO2max, FTP test). Puoi anche caricare i tuoi workout salvati.',
              },
              {
                title: '📊 Sessione Live',
                desc: 'Durante ogni allenamento vedi in tempo reale: potenza, potenza media 3s, cadenza, velocità, W/kg, frequenza cardiaca, kCal e tempo. Puoi mettere in pausa, saltare intervalli e regolare la difficoltà.',
              },
              {
                title: '🎯 Bias Difficoltà',
                desc: 'Durante una sessione intervalli, puoi regolare la % di intensità in tempo reale con i tasti +/- per rendere il workout più facile o più difficile.',
              },
              {
                title: '📈 Profilo & Metriche',
                desc: 'Nella sezione Profilo trovi le metriche avanzate calcolate dal tuo storico: Critical Power (CP), W\' anaerobico, VO2max stimato, e il grafico PMC (Fitness/Fatica/Forma).',
              },
              {
                title: '📂 Archivio Workout',
                desc: 'Tutti i tuoi allenamenti sono salvati localmente. Puoi cercarli, ordinarli e scaricare il file .tcx per caricarli su Strava o altri servizi.',
              },
              {
                title: '⏱️ Auto ERG Off',
                desc: 'Durante gli intervalli, se la cadenza scende sotto 30 RPM per 5 secondi, l\'ERG mode si disattiva automaticamente per sicurezza. Si riattiva quando riprendi a pedalare.',
              },
              {
                title: '🔗 Sincronizzazione Strava',
                desc: 'Collega il tuo account Strava nella sezione Profilo. L\'app caricherà automaticamente i tuoi allenamenti in background non appena avrai una connessione ad internet attiva. Non c\'è bisogno di esportare manualmente.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h4 className="font-bold text-white text-base mb-2">{item.title}</h4>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <DialogFooter className="sm:justify-center">
            <button
              onClick={() => setIsHelpOpen(false)}
              className="px-8 py-3 bg-gradient-to-r from-neon-cyan to-neon-blue text-white font-bold rounded-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all"
            >
              Ho capito!
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <main className={cn(
        "flex-1 w-full relative z-0",
        !session.isActive && 'overflow-y-auto'
      )}>
        {view === 'HOME' && renderHome()}
        {view === 'FREE_RIDE' && renderFreeRide()}
        {view === 'ERG_MODE' && renderErgMode()}
        {view === 'EDITOR' && renderEditor()}
        {view === 'SESSION' && renderSession()}
        {view === 'HISTORY' && renderHistory()}
        {view === 'PROFILE' && renderProfile()}
      </main>

      {renderSaveModal()}
      {renderCompletionModal()}

      <Dialog open={isInstallHelpOpen} onOpenChange={setIsInstallHelpOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-[90vw] rounded-lg sm:max-w-md bg-idx-surface/90 backdrop-blur-xl border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white text-center">Installazione Manuale</DialogTitle>
            <DialogDescription className="text-gray-400 text-center pt-2">
              Il tuo browser non ha ancora abilitato l'installazione automatica. Puoi comunque installare WattFlow seguendo questi passaggi:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-6 text-sm text-gray-300">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center font-bold shrink-0">1</div>
              <p>Clicca l'icona <span className="text-white font-bold">Installa</span> (un piccolo computer con una freccia) nella barra degli indirizzi.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center font-bold shrink-0">2</div>
              <p>Oppure apri il menu dei <span className="text-white font-bold">tre puntini</span> in alto a destra e seleziona <span className="text-white font-bold">Salva e condividi &gt; Installa pagina come app</span>.</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setIsInstallHelpOpen(false)} variant="primary" className="px-8 py-3 from-neon-cyan to-neon-blue">Ho capito</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      {['HOME', 'HISTORY', 'EDITOR', 'PROFILE'].includes(view) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 z-50 pointer-events-none">
          <div className="max-w-md mx-auto relative pointer-events-auto">
            <div className="flex items-center justify-between bg-idx-surface/80 backdrop-blur-2xl px-6 py-4 rounded-full border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              {[
                { id: 'HOME', icon: Home, label: 'Home', activeColor: 'text-neon-cyan' },
                { id: 'HISTORY', icon: Clock, label: 'Storico', activeColor: 'text-neon-purple' },
                { id: 'EDITOR', icon: BookOpen, label: 'Workouts', activeColor: 'text-neon-green' },
                { id: 'PROFILE', icon: User, label: 'Profilo', activeColor: 'text-neon-blue' },
              ].map(item => {
                const isActive = view === item.id || (view === 'HOME' && item.id === 'HOME' && !['EDITOR', 'HISTORY'].includes(view));
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView(item.id as ViewState);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${isActive ? item.activeColor : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <item.icon size={22} className={isActive ? 'drop-shadow-[0_0_10px_currentColor]' : ''} />
                    {isActive && (
                      <span className="absolute -bottom-4 w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

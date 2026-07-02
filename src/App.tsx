/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TerminalHeader } from './components/TerminalHeader';
import { GrabZone } from './components/GrabZone';
import { MatrixOverlay } from './components/MatrixOverlay';
import { SystemStats, LogLine } from './types';
import { 
  Terminal, 
  Shield, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Bug, 
  Newspaper, 
  Lock, 
  Download, 
  LogOut, 
  FileText 
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { generateAsciiArt, LUL_ASCII_BANNER, WELCOME_ASCII_BANNER } from './utils/ascii';

export default function App() {
  // Navigation active tab matching the design HTML options
  const [activeTab, setActiveTab] = useState<'news' | 'accounts' | 'downloads' | 'fun' | 'changelog'>('changelog');

  // Cursor coordinate tracking (relative to viewport)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorGrabbed, setCursorGrabbed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  // Real-time server and visitor counters
  const [stats, setStats] = useState<SystemStats>({ online: 12, hits: 1405, unique: 382 });
  
  // Custom terminal console interactive command
  const [commandInput, setCommandInput] = useState('');
  const [commandLogs, setCommandLogs] = useState<LogLine[]>(() => {
    const time = '08:14:04';
    return [
      { id: 'w1', time, message: '╔══════════════════════════════════════════════════════════╗', type: 'success' },
      { id: 'w2', time, message: '║       WELCOME TO LUL TERMINAL OS v2.0.1 ALPHA            ║', type: 'success' },
      { id: 'w3', time, message: '╚══════════════════════════════════════════════════════════╝', type: 'success' },
      { id: 'w4', time, message: '  Click any highlighted command below to instantly run it.', type: 'warn' },
      { id: 'w4b', time, message: '', type: 'info' },
      { id: 's1', time, message: '━━━━━━━━━  🖥️  SYSTEM & SESSION  ━━━━━━━━━', type: 'success' },
      { id: 'c1', time, message: '  help            - Full command reference & documentation', type: 'info', commandToRun: 'help' },
      { id: 'c2', time, message: '  stats           - Live visitor hits, unique & online count', type: 'info', commandToRun: 'stats' },
      { id: 'c3', time, message: '  reboot          - Cold OS kernel restart & boot sequence', type: 'info', commandToRun: 'reboot' },
      { id: 'c4', time, message: '  clean           - Flush the terminal console screen buffer', type: 'info', commandToRun: 'clean' },
      { id: 'c5', time, message: '  history         - Last 10 executed commands (clickable)', type: 'info', commandToRun: 'history' },
      { id: 's2b', time, message: '', type: 'info' },
      { id: 's2', time, message: '━━━━━━━━━  🎨  UI & VISUAL EFFECTS  ━━━━━━━━━', type: 'success' },
      { id: 'c6', time, message: '  theme           - Toggle CRT phosphor scanline filter', type: 'info', commandToRun: 'theme' },
      { id: 'c7', time, message: '  color <accent>  - Accent: indigo emerald amber cyan rose', type: 'info', commandToRun: 'color emerald' },
      { id: 'c8', time, message: '  matrix          - Fullscreen Matrix green digit rain overlay', type: 'info', commandToRun: 'matrix' },
      { id: 'c9', time, message: '  ascii <text>    - Convert text into giant block ASCII art', type: 'info', commandToRun: 'ascii LUL' },
      { id: 's3b', time, message: '', type: 'info' },
      { id: 's3', time, message: '━━━━━━━━━  🔊  AUDIO & SYNTHESIZER  ━━━━━━━━━', type: 'success' },
      { id: 'c10', time, message: '  beep            - Play synthesized 880Hz audio tone', type: 'info', commandToRun: 'beep' },
      { id: 's4b', time, message: '', type: 'info' },
      { id: 's4', time, message: '━━━━━━━━━  🌐  NETWORKING & DIAGNOSTICS  ━━━━━', type: 'success' },
      { id: 'c11', time, message: '  ping <host>     - Simulate ICMP packets with latency stats', type: 'info', commandToRun: 'ping google.com' },
      { id: 'c12', time, message: '  weather <city>  - ASCII weather report for any city', type: 'info', commandToRun: 'weather Hamburg' },
      { id: 's5b', time, message: '', type: 'info' },
      { id: 's5', time, message: '━━━━━━━━━  🔒  SECURITY & CREDENTIALS  ━━━━━━━', type: 'success' },
      { id: 'c13', time, message: '  hack            - Elevate to superuser mainframe access', type: 'info', commandToRun: 'hack' },
      { id: 'c14', time, message: '  keygen          - Generate high-entropy API key / token', type: 'info', commandToRun: 'keygen' },
      { id: 'c15', time, message: '  colorconv <hex> - Translate #HEX color to rgb() notation', type: 'info', commandToRun: 'colorconv #6366f1' },
      { id: 's6b', time, message: '', type: 'info' },
      { id: 's6', time, message: '━━━━━━━━━  🎭  FUN & EASTER EGGS  ━━━━━━━━━━━', type: 'success' },
      { id: 'c16', time, message: '  cowsay <text>   - Classic Unix ASCII talking cow', type: 'info', commandToRun: 'cowsay Moo!' },
      { id: 'c17', time, message: '  joke            - Random developer-themed joke', type: 'info', commandToRun: 'joke' },
      { id: 'c18', time, message: '  fortune         - Random developer fortune cookie', type: 'info', commandToRun: 'fortune' },
      { id: 'c19', time, message: '  self-destruct   - 10s countdown with abort override', type: 'info', commandToRun: 'self-destruct' },
      { id: 'c20', time, message: '  bsod            - Blue Screen of Death crash overlay', type: 'info', commandToRun: 'bsod' },
      { id: 'c21', time, message: '  loader          - Animated ASCII progress bar demo', type: 'info', commandToRun: 'loader' },
      { id: 's7b', time, message: '', type: 'info' },
      { id: 's7', time, message: '━━━━━━━━━  ⚙️  TERMINAL SETTINGS  ━━━━━━━━━━━━', type: 'success' },
      { id: 'c22', time, message: '  baudrate <rate> - Typewriter speed (0=instant, 80=retro)', type: 'info', commandToRun: 'baudrate 80' },
      { id: 'sep', time, message: '', type: 'info' },
      { id: 'w6', time, message: '  💡 Type any command below and press ENTER to execute.', type: 'warn' },
    ];
  });

  // Unrecognized command shake animation trigger state
  const [isShaking, setIsShaking] = useState(false);

  // Live ASCII generator input state
  const [asciiGenInput, setAsciiGenInput] = useState('LUL');

  // Interactive CLI custom theme color accent state
  const [themeColor, setThemeColor] = useState<'indigo' | 'emerald' | 'amber' | 'cyan' | 'rose'>('indigo');

  // Developer Humorous Jokes List
  const JOKES = [
    "Why do programmers wear glasses? Because they can't C#!",
    "There are 10 types of people in the world: those who understand binary, and those who don't.",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
    "A SQL query goes into a bar, walks up to two tables and asks, 'Can I join you?'",
    "['hip', 'hip'] (hip hip array!)",
    "Why did the programmer quit his job? Because he didn't get arrays.",
    "To understand what recursion is, you must first understand recursion.",
    "Hardware: The parts of a computer system that can be kicked.",
    "An optimist says: 'The glass is half-full.' A pessimist says: 'The glass is half-empty.' A programmer says: 'The glass is twice as large as necessary.'",
    "Why was the computer cold? It left its Windows open."
  ];

  // Developer Retro Fortunes List
  const FORTUNES = [
    "Your code will compile on the first try today. (Very high luck!)",
    "Beware of a missing semicolon in line 42.",
    "An unexpected prompt will bring you great laughter.",
    "You will find a bug that has been hiding since 2024.",
    "Great speed is in your future. Your algorithms will run in O(1) time.",
    "A clean compile is worth a thousand lines of documentation.",
    "The entity under your cursor is hungrier than usual today. Tread lightly.",
    "You will soon receive a pull request with zero merge conflicts.",
    "A coffee spill is imminent. Secure your perimeter.",
    "Your password hashes are secure, but you should still eat lasagna."
  ];

  // Audio output state toggle
  const [isMuted, setIsMuted] = useState(false);

  // Synthesizer custom audio themes state
  const [synthTheme, setSynthTheme] = useState<'clean-sine' | 'retro-8bit' | 'bit-crushed'>('clean-sine');

  // Virtual battery level management states
  const [hasWarnedBattery, setHasWarnedBattery] = useState(false);
  const [batteryDrainOffset, setBatteryDrainOffset] = useState(0);

  // Matrix stream full screen overlay visibility state
  const [isMatrixOverlayActive, setIsMatrixOverlayActive] = useState(false);

  // System load tracker simulating background workload
  const [systemLoad, setSystemLoad] = useState(14.8);

  // Additional telemetry states
  const [ramUsage, setRamUsage] = useState(4.24); // GB
  const [cpuTemp, setCpuTemp] = useState(48.5); // °C
  const [networkPing, setNetworkPing] = useState(24); // ms
  const [networkTraffic, setNetworkTraffic] = useState({ rx: 3.4, tx: 0.8 }); // MB/s / MB/s

  // New UI & command state variables
  const [baudRate, setBaudRate] = useState(0); // 0 = unlimited/instant
  const [bsodActive, setBsodActive] = useState(false);
  const [selfDestructCountdown, setSelfDestructCountdown] = useState(-1);
  const [processes, setProcesses] = useState([
    { name: 'grabzone-arm.exe', cpu: 1.2, ram: 142 },
    { name: 'scanline-render.sys', cpu: 8.4, ram: 284 },
    { name: 'lasagna-auth.dll', cpu: 0.1, ram: 12 }
  ]);
  const [lastGcTime, setLastGcTime] = useState(0);
  const [coffeeCount, setCoffeeCount] = useState(3.5);
  const [monsterHunger, setMonsterHunger] = useState(45);
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    logs: true,
    telemetry: true,
    processes: false,
    vulnerabilities: false,
    selfcare: false
  });

  // HUD tracking state for the Sidebar display
  const [hudState, setHudState] = useState<{
    state: string;
    rotation: number;
    isExtended: boolean;
  }>({
    state: 'waiting',
    rotation: 0,
    isExtended: false
  });

  // CRT scanlines active state
  const [isCrtEnabled, setIsCrtEnabled] = useState(true);

  // Number of times user is caught by cursor-grabbing monster
  const [caughtCount, setCaughtCount] = useState(() => {
    const stored = localStorage.getItem('lul_caught_count');
    return stored ? parseInt(stored, 10) : 0;
  });

  // CLI history commands and active selection pointer
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState('');

  // 60-second real-time system load history (30 intervals of 2 seconds)
  const [loadHistory, setLoadHistory] = useState<{ time: string; load: number }[]>(() => {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 2000);
      const randomLoad = 5 + Math.random() * 40;
      data.push({
        time: time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        load: parseFloat(randomLoad.toFixed(1))
      });
    }
    return data;
  });

  // Session duration timer
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  // Dynamic tailwind class maps for customized CLI themes
  const themeText = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    rose: 'text-rose-400'
  }[themeColor];

  const themeBorder = {
    indigo: 'border-indigo-500/30',
    emerald: 'border-emerald-500/30',
    amber: 'border-amber-500/30',
    cyan: 'border-cyan-500/30',
    rose: 'border-rose-500/30'
  }[themeColor];

  const themeBg = {
    indigo: 'bg-indigo-500/10',
    emerald: 'bg-emerald-500/10',
    amber: 'bg-amber-500/10',
    cyan: 'bg-cyan-500/10',
    rose: 'bg-rose-500/10'
  }[themeColor];

  const themeHexColor = {
    indigo: '#6366f1',
    emerald: '#10b981',
    amber: '#f59e0b',
    cyan: '#06b6d4',
    rose: '#f43f5e'
  }[themeColor];

  // Layout fitting scaling factor
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Web Audio Synth buzzer with custom audio themes
  const playBeep = (freq: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (synthTheme === 'clean-sine') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      } else if (synthTheme === 'retro-8bit') {
        // High fidelity retro 8-bit pulse with arpeggio effect
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.setValueAtTime(freq * 1.25, ctx.currentTime + duration * 0.25);
        osc.frequency.setValueAtTime(freq * 1.5, ctx.currentTime + duration * 0.5);
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.setValueAtTime(0.14, ctx.currentTime + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      } else if (synthTheme === 'bit-crushed') {
        // Bit-crushed feel using rigid staircase frequency modulation
        osc.type = 'sawtooth';
        const steps = 6;
        for (let i = 0; i < steps; i++) {
          const stepTime = ctx.currentTime + (duration / steps) * i;
          const stepFreq = Math.floor(freq * (1 + (i % 2 === 0 ? 0.2 : -0.15)) / 30) * 30;
          osc.frequency.setValueAtTime(stepFreq, stepTime);
        }
        gain.gain.setValueAtTime(0.16, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      } else {
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      }
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  };

  // Battery level depletes over 3600 seconds (1 hour). 100% to 0%.
  const batteryLevel = Math.max(
    0, 
    parseFloat((100 - (sessionSeconds / 36.0) - batteryDrainOffset).toFixed(1))
  );

  // Trigger low-battery alert log when crossing 20%
  useEffect(() => {
    if (batteryLevel <= 20 && !hasWarnedBattery) {
      appendLog(`⚠️ CRITICAL: Auxiliary battery low (${batteryLevel}% remaining). Mainframe grid power recommended.`, 'alert');
      playBeep(330, 0.5, 'square');
      setHasWarnedBattery(true);
    }
  }, [batteryLevel, hasWarnedBattery]);

  // Clickable battery level helper to cycle charge level for instant testing
  const cycleBatteryLevel = () => {
    if (batteryLevel > 25) {
      // Discharge directly to 15% (trigger warning)
      const neededOffset = 100 - (sessionSeconds / 36.0) - 15;
      setBatteryDrainOffset(neededOffset);
      appendLog('⚡ Discharge trigger: Forced system battery down to 15%.', 'warn');
      playBeep(450, 0.15, 'sawtooth');
    } else if (batteryLevel > 5) {
      // Discharge further to 5%
      const neededOffset = 100 - (sessionSeconds / 36.0) - 5;
      setBatteryDrainOffset(neededOffset);
      appendLog('⚡ Discharge trigger: Forced system battery down to 5%.', 'warn');
      playBeep(350, 0.15, 'sawtooth');
    } else {
      // Charge back to 100%
      setBatteryDrainOffset(0);
      setHasWarnedBattery(false);
      appendLog('🔌 Grid connected: Battery power level restored to 100%.', 'success');
      playBeep(880, 0.25, 'sine');
    }
  };

  // Enforce scroll-free adaptive fitting using ResizeObserver
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const vWidth = 1920;
        const vHeight = 1080;
        const scaleX = width / vWidth;
        const scaleY = height / vHeight;
        const currentScale = Math.min(scaleX, scaleY);
        // Allow dynamic fitting with standard minimum bounds
        setScale(currentScale > 0.05 ? currentScale : 0.05);
      }
    });

    resizeObserver.observe(el);
    return () => {
      resizeObserver.unobserve(el);
      resizeObserver.disconnect();
    };
  }, []);

  // Tracking real-time globally triggered mouse events
  useEffect(() => {
    const setFromEvent = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', setFromEvent);
    return () => window.removeEventListener('mousemove', setFromEvent);
  }, []);

  // Local storage visitor metrics simulator
  useEffect(() => {
    const storedHits = localStorage.getItem('lul_hits');
    const storedUnique = localStorage.getItem('lul_unique');
    const hasVisited = localStorage.getItem('lul_visited');

    let currentHits = storedHits ? parseInt(storedHits, 10) : 1445;
    let currentUnique = storedUnique ? parseInt(storedUnique, 10) : 382;

    currentHits += 1;
    if (!hasVisited) {
      currentUnique += 1;
      localStorage.setItem('lul_visited', '1');
    }

    localStorage.setItem('lul_hits', currentHits.toString());
    localStorage.setItem('lul_unique', currentUnique.toString());

    setStats({
      online: Math.floor(Math.random() * 5) + 10, // fluctuating nicely to hover around 12
      hits: currentHits,
      unique: currentUnique,
    });

    // Simulate safe random visitor fluctuations to make layout look alive
    const statsTimer = setInterval(() => {
      setStats((prev) => {
        const deltaOnline = Math.random() > 0.5 ? 1 : -1;
        const newOnline = Math.max(6, Math.min(24, prev.online + deltaOnline));
        const deltaHits = Math.random() > 0.6 ? 1 : 0;
        const newHits = prev.hits + deltaHits;
        
        if (deltaHits > 0) {
          localStorage.setItem('lul_hits', newHits.toString());
        }

        return {
          online: newOnline,
          hits: newHits,
          unique: prev.unique,
        };
      });
    }, 5000);

    return () => clearInterval(statsTimer);
  }, []);

  // Self-destruct countdown tick timer
  useEffect(() => {
    if (selfDestructCountdown < 0) return;
    
    const cdTimer = setTimeout(() => {
      if (selfDestructCountdown > 1) {
        setSelfDestructCountdown(prev => prev - 1);
        appendLog(`🚨 SELF-DESTRUCT IN T-MINUS ${selfDestructCountdown - 1} SECONDS...`, 'alert');
        playBeep(440, 0.25, 'sawtooth');
      } else if (selfDestructCountdown === 1) {
        setSelfDestructCountdown(-1);
        appendLog('❌ SELF-DESTRUCT ABORTED: Runtime exception in self_destruct.sh line 42: "operator is too cool to die". System cooling down...', 'success');
        playBeep(880, 0.6, 'sine');
      }
    }, 1000);

    return () => clearTimeout(cdTimer);
  }, [selfDestructCountdown]);

  // Simulating random background compilation and metric fluctuation
  useEffect(() => {
    const timer = setInterval(() => {
      // Generate a random load value between 5 and 45
      const randomLoad = 5 + Math.random() * 40;
      const formattedLoad = parseFloat(randomLoad.toFixed(1));
      setSystemLoad(formattedLoad);

      // Fluctuate other metrics
      setRamUsage(4.1 + Math.random() * 0.8);
      setCpuTemp(40 + (randomLoad * 0.4) + Math.random() * 3);
      setNetworkPing(18 + Math.floor(Math.random() * 12));
      setNetworkTraffic({
        rx: 0.5 + Math.random() * 15.0,
        tx: 0.1 + Math.random() * 2.0
      });

      // GC timer increments and triggers
      setLastGcTime((prev) => {
        const next = prev + 2;
        if (next >= 40) {
          appendLog(`♻️ [SYSTEM GC] Flushing temporary heap registries. Reclaimed ${(15 + Math.random() * 20).toFixed(2)} MB memory buffer.`, 'success');
          return 0;
        }
        return next;
      });

      // Update monster hunger
      setMonsterHunger((prev) => {
        const next = prev + Math.floor(Math.random() * 3);
        if (next >= 100) {
          appendLog('🚨 [CLAW CORE] Monster appetite critical (100%). Warning: Please lure cursor into the Danger Zone to feed.', 'alert');
          return 75;
        }
        return next;
      });

      // Fluctuate process stats
      setProcesses([
        { name: 'grabzone-arm.exe', cpu: cursorGrabbed ? 12.4 : 0.8 + Math.random() * 2.0, ram: 142 + Math.floor(Math.random() * 10) },
        { name: 'scanline-render.sys', cpu: isCrtEnabled ? 6.2 + Math.random() * 3.0 : 0.2, ram: 284 + Math.floor(Math.random() * 15) },
        { name: 'lasagna-auth.dll', cpu: 0.0 + Math.random() * 0.3, ram: 12 }
      ]);

      // Periodic sarcastic logs
      if (Math.random() < 0.1) {
        const sarcasticLogs = [
          '🕵️ [OPERATOR DETECT] Mouse inactivity detected. Operator might be studying lasagna recipe.',
          '🔊 [AUDIO DIAG] High typing keystroke velocity. operator coffee levels highly operational.',
          '🛡️ [FIREWALL] Intercepted 0 hack packages from local fridge device.',
          '⚙️ [KERNEL] Optimizing Fred/Bls/Bea legacy memory registers. Done.',
          '🧬 [BIOMETRIC] Scanning cursor friction rate. Operator is currently scrolling slowly.',
          '📈 [METRICS] Sarcasm buffer registers are currently operating at 98.4% capacity.',
          '💾 [STORAGE] Analyzing redundant files. found 0 issues, but 12 incomplete script concepts.'
        ];
        const logMsg = sarcasticLogs[Math.floor(Math.random() * sarcasticLogs.length)];
        appendLog(logMsg, 'info');
      }

      setLoadHistory((prev) => {
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const nextHistory = [...prev, { time: timeStr, load: formattedLoad }];
        return nextHistory.slice(-30); // Keep last 30 intervals (60 seconds)
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [cursorGrabbed, isCrtEnabled]);

  // Post system logs programmatically based on action triggers
  const appendLog = (msg: string, type: 'info' | 'warn' | 'success' | 'alert' = 'info', commandToRun?: string) => {
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const logId = Math.random().toString();
    
    // If baudRate is 0, print instantly. Also do so for multiline blocks (ASCII art) to avoid layout breaks.
    if (baudRate === 0 || msg.length < 5 || msg.includes('\n')) {
      const newLog: LogLine = {
        id: logId,
        time: timeStr,
        message: msg,
        type,
        commandToRun
      };
      setCommandLogs((prev) => [...prev.slice(-100), newLog]);
      return;
    }

    // Typewriter effect
    const newLog: LogLine = {
      id: logId,
      time: timeStr,
      message: '',
      type,
      commandToRun
    };
    setCommandLogs((prev) => [...prev.slice(-100), newLog]);

    let currentIdx = 0;
    const intervalTime = Math.max(5, Math.floor(1000 / baudRate));
    
    const typeWriter = setInterval(() => {
      currentIdx++;
      if (currentIdx <= msg.length) {
        const text = msg.slice(0, currentIdx);
        setCommandLogs((prev) => 
          prev.map((log) => log.id === logId ? { ...log, message: text } : log)
        );
      } else {
        clearInterval(typeWriter);
      }
    }, intervalTime);
  };

  const handleCursorGrabbed = () => {
    setCursorGrabbed(true);
    setCaughtCount((prev) => {
      const next = prev + 1;
      localStorage.setItem('lul_caught_count', next.toString());
      return next;
    });
    appendLog('🎯 CURSOR SNATCHED! Gravity core localized.', 'alert');
    playBeep(440, 0.4, 'triangle');
    setTimeout(() => {
      playBeep(220, 0.4, 'sawtooth');
    }, 150);

    // Release mouse session automatically
    setTimeout(() => {
      setCursorGrabbed(false);
      appendLog('💨 Quantum leakage: Cursor connection established.', 'success');
      playBeep(600, 0.25, 'sine');
    }, 2500);
  };

  const handleButtonClicked = () => {
    if (cursorGrabbed) return;
    setGameOver(true);
    appendLog('🎉 TRAP BUTTON clicked! System over-excitation triggered!', 'success');
    playBeep(520, 0.15, 'sine');
    setTimeout(() => playBeep(650, 0.15, 'sine'), 100);
    setTimeout(() => playBeep(780, 0.3, 'sine'), 200);

    setTimeout(() => {
      setGameOver(false);
      appendLog('⚙️ System cooled down. Gravity grids restored.', 'info');
    }, 4000);
  };

  const handleTabClick = (tab: 'news' | 'accounts' | 'downloads' | 'fun' | 'changelog') => {
    setActiveTab(tab);
    appendLog(`Switched tab module: ${tab.toUpperCase()} loaded.`, 'success');
    playBeep(740, 0.08, 'sine');
  };

  const clickAbmelden = () => {
    appendLog('🔴 ABMELDEN triggered. Session ended.', 'warn');
    playBeep(330, 0.2, 'sawtooth');
    alert('Abmeldung erfolgreich! Terminal wird neu synchronisiert.');
    // Trigger reboot log sequence
    setTimeout(() => {
      setCommandLogs([
        { id: '1', time: '08:14:04', message: 'LUL OS Kernel v2.0.1 bootstrap complete.', type: 'success' },
        { id: '2', time: '08:14:05', message: 'Security Core: Firewall status SECURE.', type: 'info' }
      ]);
    }, 400);
  };

  // Handle CLI history keyboard traversal
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;

      let newIndex = historyIndex;
      if (historyIndex === -1) {
        // Save contemporary partial user input
        setTempInput(commandInput);
        newIndex = commandHistory.length - 1;
      } else if (historyIndex > 0) {
        newIndex = historyIndex - 1;
      }

      setHistoryIndex(newIndex);
      setCommandInput(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;

      if (historyIndex === commandHistory.length - 1) {
        setHistoryIndex(-1);
        setCommandInput(tempInput);
      } else {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      }
    }
  };

  // Run a terminal command (typed or clicked)
  const processCommand = (cmdText: string) => {
    if (!cmdText.trim()) return;
    const query = cmdText.toLowerCase().trim();

    // Check if it's not the clear screen command so we log what was typed
    if (query !== 'clean') {
      appendLog(`$ ${cmdText}`, 'info');
      playBeep(900, 0.05, 'sine');
    }

    // Save to CLI history (exclude consecutive duplicate entries for clean retrieval)
    setCommandHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === cmdText) {
        return prev;
      }
      return [...prev, cmdText];
    });
    setHistoryIndex(-1);
    setTempInput('');

    if (query === 'help') {
      appendLog('', 'info');
      appendLog('╔══════════════════════════════════════════════════════════╗', 'success');
      appendLog('║       LUL TERMINAL OS v2.0.1  —  COMMAND REFERENCE      ║', 'success');
      appendLog('╚══════════════════════════════════════════════════════════╝', 'success');
      appendLog('  Click any command in blue to instantly execute it.', 'info');
      appendLog('', 'info');
      appendLog('━━━━━━━━━━━━━━━  🖥️  SYSTEM & SESSION  ━━━━━━━━━━━━━━━', 'success');
      appendLog('', 'info');
      appendLog('  help', 'info', 'help');
      appendLog('    → Show this full command reference directory.', 'info');
      appendLog('', 'info');
      appendLog('  stats', 'info', 'stats');
      appendLog('    → Display live visitor stats: total hits, unique visitors,', 'info');
      appendLog('      and currently online users from the session tracker.', 'info');
      appendLog('', 'info');
      appendLog('  reboot', 'info', 'reboot');
      appendLog('    → Perform a cold OS kernel restart. Clears the console and', 'info');
      appendLog('      reloads the LUL boot sequence with the ASCII banner.', 'info');
      appendLog('', 'info');
      appendLog('  clean', 'info', 'clean');
      appendLog('    → Flush the terminal console screen buffer. Clears all', 'info');
      appendLog('      visible log output instantly.', 'info');
      appendLog('', 'info');
      appendLog('  history', 'info', 'history');
      appendLog('    → Display the last 10 commands you executed this session.', 'info');
      appendLog('      Each entry is clickable to re-run it immediately.', 'info');
      appendLog('      Tip: Use ↑ / ↓ arrow keys to scroll through history.', 'info');
      appendLog('', 'info');
      appendLog('━━━━━━━━━━━━━━━  🎨  UI & VISUAL EFFECTS  ━━━━━━━━━━━━━━━', 'success');
      appendLog('', 'info');
      appendLog('  theme', 'info', 'theme');
      appendLog('    → Toggle the CRT phosphor scanline filter ON / OFF.', 'info');
      appendLog('      Gives the terminal an authentic retro monitor aesthetic.', 'info');
      appendLog('', 'info');
      appendLog('  color <accent>', 'info', 'color indigo');
      appendLog('    → Change the terminal accent color. Available options:', 'info');
      appendLog('      indigo  emerald  amber  cyan  rose', 'info');
      appendLog('      Example: color emerald', 'info', 'color emerald');
      appendLog('', 'info');
      appendLog('  matrix', 'info', 'matrix');
      appendLog('    → Trigger a fullscreen Matrix-style green digit rain', 'info');
      appendLog('      overlay. Closes automatically after 8 seconds,', 'info');
      appendLog('      or click [DISMISS] to close immediately.', 'info');
      appendLog('', 'info');
      appendLog('  ascii <text>', 'info', 'ascii LUL');
      appendLog('    → Render any text in giant block ASCII art letters.', 'info');
      appendLog('      Supports A-Z, 0-9 and basic symbols. Max ~15 chars.', 'info');
      appendLog('      Example: ascii HELLO', 'info', 'ascii HELLO');
      appendLog('', 'info');
      appendLog('━━━━━━━━━━━━━━━  🔊  AUDIO & SYNTHESIZER  ━━━━━━━━━━━━━━━', 'success');
      appendLog('', 'info');
      appendLog('  beep', 'info', 'beep');
      appendLog('    → Play a synthesized audio tone at 880 Hz using the', 'info');
      appendLog('      Web Audio API. Use the SYNTH button in the header', 'info');
      appendLog('      to switch between: SINE, 8-BIT and BIT-CRUSHED modes.', 'info');
      appendLog('', 'info');
      appendLog('━━━━━━━━━━━━━━━  🌐  NETWORKING & DIAGNOSTICS  ━━━━━━━━━━━', 'success');
      appendLog('', 'info');
      appendLog('  ping <host>', 'info', 'ping google.com');
      appendLog('    → Send 4 simulated ICMP echo packets to a host and', 'info');
      appendLog('      report packet size, TTL, and latency per packet.', 'info');
      appendLog('      Prints a summary with packet loss stats at the end.', 'info');
      appendLog('      Example: ping google.com', 'info', 'ping google.com');
      appendLog('', 'info');
      appendLog('  weather <city>', 'info', 'weather Hamburg');
      appendLog('    → Display a retro ASCII weather report for any city.', 'info');
      appendLog('      Shows temperature, condition type, and wind speed.', 'info');
      appendLog('      Conditions: Clear / Acid Rain / Neon Thunderstorm.', 'info');
      appendLog('      Example: weather Berlin', 'info', 'weather Berlin');
      appendLog('', 'info');
      appendLog('━━━━━━━━━━━━━━━  🔒  SECURITY & CREDENTIALS  ━━━━━━━━━━━━━', 'success');
      appendLog('', 'info');
      appendLog('  hack', 'info', 'hack');
      appendLog('    → Simulate a mainframe security bypass and elevate', 'info');
      appendLog('      operator grid permissions to SUPERUSER level.', 'info');
      appendLog('', 'info');
      appendLog('  keygen', 'info', 'keygen');
      appendLog('    → Generate a cryptographically-themed high-entropy', 'info');
      appendLog('      developer API key / access token prefixed with', 'info');
      appendLog('      "lul_sec_" and 24 random alphanumeric characters.', 'info');
      appendLog('      Output is selectable for copy-paste.', 'info');
      appendLog('', 'info');
      appendLog('  colorconv <#hex>', 'info', 'colorconv #6366f1');
      appendLog('    → Convert a 6-digit hex color code into its RGB', 'info');
      appendLog('      equivalent notation for use in CSS or code.', 'info');
      appendLog('      Example: colorconv #ff6347  →  rgb(255, 99, 71)', 'info', 'colorconv #ff6347');
      appendLog('', 'info');
      appendLog('━━━━━━━━━━━━━━━  🎭  FUN & EASTER EGGS  ━━━━━━━━━━━━━━━━━', 'success');
      appendLog('', 'info');
      appendLog('  cowsay <text>', 'info', 'cowsay Moo!');
      appendLog('    → Print a classic Unix-style ASCII cow with a speech', 'info');
      appendLog('      bubble containing your custom message.', 'info');
      appendLog('      Example: cowsay Hello World!', 'info', 'cowsay Hello World!');
      appendLog('', 'info');
      appendLog('  joke', 'info', 'joke');
      appendLog('    → Retrieve a random developer-themed joke from the', 'info');
      appendLog('      internal joke database. 10+ unique jokes available.', 'info');
      appendLog('', 'info');
      appendLog('  fortune', 'info', 'fortune');
      appendLog('    → Reveal a random fortune cookie message for developers.', 'info');
      appendLog('      Wisdom ranges from insightful to deeply sarcastic.', 'info');
      appendLog('', 'info');
      appendLog('  self-destruct', 'info', 'self-destruct');
      appendLog('    → ⚠️  Initiate the system self-destruct sequence.', 'info');
      appendLog('      A dramatic 10-second countdown with full-screen red', 'info');
      appendLog('      warning overlay and pulsing alarm sound will begin.', 'info');
      appendLog('      Click [ENGAGE OVERRIDE] at any time to abort safely.', 'info');
      appendLog('      Note: The system always aborts at T-1 due to a', 'info');
      appendLog('      well-known bug in lasagna_auth.dll line 42.', 'info');
      appendLog('', 'info');
      appendLog('  bsod', 'info', 'bsod');
      appendLog('    → Trigger a full-screen Blue Screen of Death (BSOD)', 'info');
      appendLog('      diagnostic crash overlay in authentic Windows style.', 'info');
      appendLog('      Features a fatal error from lasagna_auth.dll.', 'info');
      appendLog('      Click anywhere on the screen to execute warm reboot.', 'info');
      appendLog('', 'info');
      appendLog('  loader', 'info', 'loader');
      appendLog('    → Run an animated ASCII progress bar simulation across', 'info');
      appendLog('      5 incremental steps from 0% to 100%. Useful for', 'info');
      appendLog('      testing baud rate effects (try: baudrate 80 first).', 'info');
      appendLog('', 'info');
      appendLog('━━━━━━━━━━━━━━━  ⚙️  TERMINAL SETTINGS  ━━━━━━━━━━━━━━━━━', 'success');
      appendLog('', 'info');
      appendLog('  baudrate <rate>', 'info', 'baudrate 120');
      appendLog('    → Set the terminal character printing speed in chars/sec.', 'info');
      appendLog('      This creates a classic modem-style typewriter effect.', 'info');
      appendLog('      Set to 0 to disable and restore instant output.', 'info');
      appendLog('      Presets to try:  300 (fast)  80 (retro)  20 (ancient)', 'info');
      appendLog('      Example: baudrate 80', 'info', 'baudrate 80');
      appendLog('      Reset:   baudrate 0', 'info', 'baudrate 0');
      appendLog('', 'info');
      appendLog('╔══════════════════════════════════════════════════════════╗', 'info');
      appendLog('║  🔋 Battery    Click footer battery to cycle charge level ║', 'info');
      appendLog('║  ☕ Coffee     Click [DRINK COFFEE] in Self-Care panel    ║', 'info');
      appendLog('║  😈 Claw       Move cursor to Fun tab → Danger Zone      ║', 'info');
      appendLog('║  📟 Synth      Header button cycles: SINE / 8-BIT / CRUSH ║', 'info');
      appendLog('║  📺 CRT        Header [CRT: ON/OFF] toggles scanlines     ║', 'info');
      appendLog('╚══════════════════════════════════════════════════════════╝', 'info');
      appendLog('  Total: 25 commands available. Have fun! 🚀', 'success');
      appendLog('', 'info');
    } else if (query === 'stats') {

      appendLog(`📊 Live Context stats: Hits=${stats.hits} | Unique=${stats.unique} | Online=${stats.online}`, 'success');
    } else if (query === 'beep') {
      playBeep(880, 0.3, 'sawtooth');
      appendLog('🎵 Synthesizer beep played successfully at 880Hz.', 'success');
    } else if (query === 'clean') {
      setCommandLogs([]);
      // Put a subtle clear notification
      appendLog('🧹 Screen buffer cleared.', 'info');
    } else if (query === 'reboot') {
      appendLog('🔄 Initiating cold OS terminal restart...', 'warn');
      setTimeout(() => {
        setCommandLogs([
          { id: 'logo', time: '08:14:04', message: LUL_ASCII_BANNER, type: 'success' },
          { id: 'w1', time: '08:14:04', message: '=======================================================', type: 'info' },
          { id: 'w2', time: '08:14:04', message: '    LUL OS Kernel v2.0.1 bootstrap complete.', type: 'success' },
          { id: 'w3', time: '08:14:04', message: '=======================================================', type: 'info' }
        ]);
        playBeep(1200, 0.4, 'sine');
      }, 800);
    } else if (query === 'hack') {
      appendLog('💀 CRITICAL: Elevating grid permissions... access GRANTED.', 'alert');
      playBeep(150, 0.5, 'square');
    } else if (query === 'history') {
      appendLog('⏳ --- INTERACTIVE COMMAND HISTORY (LAST 10) ---', 'success');
      if (commandHistory.length === 0) {
        appendLog('No commands in history yet. Execute some first!', 'warn');
      } else {
        const last10 = commandHistory.slice(-10);
        last10.forEach((cmd, idx) => {
          appendLog(`[${idx + 1}] ${cmd} (Click to re-run)`, 'success', cmd);
        });
      }
    } else if (query.startsWith('ascii ')) {
      const arg = cmdText.slice(6);
      if (!arg.trim()) {
        appendLog('❌ Error: Please specify text to convert. (e.g. "ascii HELLO")', 'warn');
      } else {
        const art = generateAsciiArt(arg);
        appendLog(`Generated ASCII Art for "${arg}":`, 'success');
        appendLog(art, 'success');
      }
    } else if (query === 'joke') {
      const idx = Math.floor(Math.random() * JOKES.length);
      appendLog(`💬 Joke of the session:`, 'success');
      appendLog(`"${JOKES[idx]}"`, 'info');
    } else if (query === 'fortune') {
      const idx = Math.floor(Math.random() * FORTUNES.length);
      appendLog(`🔮 Retro Fortune cookie says:`, 'success');
      appendLog(`"${FORTUNES[idx]}"`, 'info');
    } else if (query.startsWith('color ')) {
      const arg = query.replace('color ', '').trim();
      if (['indigo', 'emerald', 'amber', 'cyan', 'rose'].includes(arg)) {
        setThemeColor(arg as any);
        appendLog(`🎨 Accent color updated to ${arg.toUpperCase()}.`, 'success');
        playBeep(600, 0.15, 'sine');
      } else {
        appendLog('❌ Error: Allowed colors are: indigo, emerald, amber, cyan, rose', 'warn');
      }
    } else if (query === 'matrix') {
      appendLog('🟢 INITIALIZING MATRIX PROTOCOL CODES...', 'success');
      setIsMatrixOverlayActive(true);
      playBeep(400, 0.1, 'sawtooth');
      setTimeout(() => {
        appendLog('0 1 0 1 1 0 0 1 0 1 1 0 1 0 1 0 0 1 1 0', 'success');
        appendLog('1 0 0 1 1 0 1 0 0 1 0 1 1 0 1 0 0 1 1 0', 'success');
        appendLog('0 1 1 0 1 0 0 1 1 0 1 0 0 1 0 1 1 0 0 1', 'success');
        appendLog('ACCESS COMPLETED. GRID IS STREAMING.', 'success');
        playBeep(800, 0.2, 'sine');
      }, 300);
      // Automatically close overlay after 8 seconds
      setTimeout(() => {
        setIsMatrixOverlayActive(false);
      }, 8000);
    } else if (query === 'theme') {
      setIsCrtEnabled(prev => !prev);
      appendLog(`📺 Scanlines filter ${!isCrtEnabled ? 'ENABLED' : 'DISABLED'}.`, 'success');
    } else if (query === 'cowsay') {
      const cow = `
  < Moo! >
  --------
         \\   ^__^
          \\  (oo)\\_______
             (__)\\       )\\/\\
                 ||----w |
                 ||     ||
      `.trim();
      appendLog(cow, 'success');
    } else if (query.startsWith('cowsay ')) {
      const arg = cmdText.slice(7).trim() || 'Moo!';
      const bubbleLine = '-'.repeat(arg.length + 2);
      const cow = `
  < ${arg} >
  ${bubbleLine}
         \\   ^__^
          \\  (oo)\\_______
             (__)\\       )\\/\\
                 ||----w |
                 ||     ||
      `.trim();
      appendLog(cow, 'success');
    } else if (query.startsWith('ping ')) {
      const host = cmdText.slice(5).trim();
      if (!host) {
        appendLog('❌ Error: Specify a host to ping.', 'warn');
      } else {
        appendLog(`PING ${host} (10.0.0.42) 56(84) bytes of data.`, 'info');
        let seq = 1;
        const pingInterval = setInterval(() => {
          if (seq <= 4) {
            const time = (15 + Math.random() * 15).toFixed(1);
            appendLog(`64 bytes from ${host}: icmp_seq=${seq} ttl=64 time=${time} ms`, 'success');
            seq++;
          } else {
            clearInterval(pingInterval);
            appendLog(`--- ${host} ping statistics ---`, 'info');
            appendLog(`4 packets transmitted, 4 received, 0% packet loss, time 1500ms`, 'success');
          }
        }, 600);
      }
    } else if (query.startsWith('weather ') || query === 'weather') {
      const city = query === 'weather' ? 'Hamburg' : cmdText.slice(8).trim();
      const temp = Math.floor(10 + Math.random() * 20);
      const conditions = [
        { desc: 'Clear / Cyber-Sunny', ascii: '   \\ _ /   \n  - ( ) -  \n   /   \\   ' },
        { desc: 'Acid Rain / Overcast', ascii: '  __   __  \n (  ) (  ) \n  / / / /  ' },
        { desc: 'Neon Thunderstorm', ascii: '  __   __  \n (  ) (  ) \n   /_ /    \n    /      ' }
      ];
      const selected = conditions[Math.floor(Math.random() * conditions.length)];
      appendLog(`☁️ ASCII weather report for ${city.toUpperCase()}:`, 'success');
      appendLog(selected.ascii, 'info');
      appendLog(`Temp: ${temp}°C | Condition: ${selected.desc} | Wind: 14 km/h North-Grid`, 'success');
    } else if (query === 'keygen') {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
      let key = 'lul_sec_';
      for (let i = 0; i < 24; i++) {
        key += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      appendLog('🔑 SECURE CREDENTIAL GENERATED:', 'success');
      appendLog(key, 'success');
    } else if (query.startsWith('colorconv ')) {
      const hex = cmdText.slice(10).trim().replace('#', '');
      const num = parseInt(hex, 16);
      if (hex.length !== 6 || isNaN(num)) {
        appendLog('❌ Error: Please specify a valid 6-character hex color (e.g. "colorconv #6366f1").', 'warn');
      } else {
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        appendLog(`🎨 HEX #${hex.toUpperCase()} converts to RGB: rgb(${r}, ${g}, ${b})`, 'success');
      }
    } else if (query.startsWith('baudrate ')) {
      const rate = parseInt(query.replace('baudrate ', '').trim(), 10);
      if (isNaN(rate) || rate < 0) {
        appendLog('❌ Error: Specify a valid numeric speed or 0 for instant print (e.g. "baudrate 300").', 'warn');
      } else if (rate === 0) {
        setBaudRate(0);
        appendLog('⚡ Baud rate disabled. Instant print speed engaged.', 'success');
      } else {
        setBaudRate(rate);
        appendLog(`📟 Baud rate set to ${rate} characters/second. Enjoy the retro speed!`, 'success');
      }
    } else if (query === 'self-destruct' || query === 'reboot self-destruct') {
      if (selfDestructCountdown > 0) {
        appendLog('🚨 Self-destruct sequence is already active!', 'warn');
      } else {
        setSelfDestructCountdown(10);
        appendLog('🚨 WARNING: SELF-DESTRUCT INITIATED BY OPERATOR! T-MINUS 10 SECONDS...', 'alert');
        playBeep(440, 0.4, 'sawtooth');
      }
    } else if (query === '/bsod' || query === 'bsod') {
      setBsodActive(true);
      playBeep(120, 1.0, 'sawtooth');
    } else if (query === 'loader' || query === 'loading') {
      appendLog('⏳ Starting grid buffer download process...', 'info');
      let progress = 0;
      const loadTimer = setInterval(() => {
        if (progress <= 100) {
          const filled = Math.floor(progress / 10);
          const bar = '='.repeat(filled) + '>'.repeat(progress < 100 ? 1 : 0) + ' '.repeat(10 - filled - (progress < 100 ? 1 : 0));
          appendLog(`[${bar}] Loading grid files: ${progress}%`, 'success');
          progress += 20;
        } else {
          clearInterval(loadTimer);
          appendLog('✅ Download completed. Container files initialized.', 'success');
        }
      }, 400);
    } else {
      appendLog(`❓ Error: Unrecognized command "${cmdText}". Type "help"`, 'warn');
      setIsShaking(true);
      playBeep(220, 0.35, 'sawtooth');
      setTimeout(() => setIsShaking(false), 410);
    }
  };

  // Dynamic console command prompt execution
  const executeCommand = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(commandInput);
    setCommandInput('');
  };

  return (
    <div 
      className={`crt-screen ${isCrtEnabled ? 'crt-effect' : ''} flex flex-col h-screen w-full bg-[#1b1f2b] text-slate-300 font-mono overflow-hidden select-none ${cursorGrabbed ? 'custom-cursor-grabbed' : ''} ${isShaking ? 'screen-shake-effect' : ''}`}
      id="main-crt-wrapper"
    >
      <div className="crt-flicker flex flex-col h-full w-full" id="flicker-wrapper">
        
        {/* TOP TERMINAL HEADER - Fully aligned with Professional Polish template style */}
        <TerminalHeader 
          stats={stats} 
          isCrtEnabled={isCrtEnabled} 
          onToggleCrt={() => setIsCrtEnabled(prev => !prev)} 
          synthTheme={synthTheme}
          onChangeSynthTheme={(theme) => {
            setSynthTheme(theme);
            // Temporarily use a raw Web Audio sound so that even if muted/unmuted we can verify theme transition
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx && !isMuted) {
              try {
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = theme === 'clean-sine' ? 'sine' : theme === 'retro-8bit' ? 'square' : 'sawtooth';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.1);
              } catch (_) {}
            }
            appendLog(`🔊 Audio Synthesizer Theme set to ${theme.toUpperCase()}.`, 'success');
          }}
          isMuted={isMuted}
          onToggleMute={() => {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            if (!nextMuted) {
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioCtx) {
                try {
                  const ctx = new AudioCtx();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.frequency.setValueAtTime(580, ctx.currentTime);
                  gain.gain.setValueAtTime(0.08, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.15);
                } catch (_) {}
              }
            }
            appendLog(`🔊 Audio output stream ${nextMuted ? 'MUTED' : 'UNMUTED'}.`, 'info');
          }}
        />

        {/* Dynamic and responsive window center content area */}
        <main ref={viewportRef} className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#11131b]" id="applet-viewport">
          
          <div 
            ref={containerRef}
            className="terminal-window w-[1920px] h-[1080px] flex overflow-hidden border border-slate-800/40 shadow-2xl relative bg-[#0b0c10] shrink-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              transition: 'transform 0.05s ease-out',
            }}
            id="scaled-terminal-sandbox"
          >
            {/* Ambient visual tech decor dots */}
            <div className="absolute inset-0 bg-[radial-gradient(#4f5060_0.4px,transparent_0.4px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

            {/* THE SIDEBAR RAIL - Sourced directly from Professional Polish Design HTML */}
            <nav className="w-[220px] bg-[#0a0c10] border-r border-slate-800/50 flex flex-col p-4 shrink-0 z-10" id="sidebar-rail">
              <div className="text-[10px] text-slate-500 uppercase tracking-[2px] font-bold mb-6 px-2">
                Mitglieder-Menü
              </div>
              
              <div className="flex flex-col gap-1.5" id="sidebar-main-controls">
                <button 
                  onClick={() => handleTabClick('news')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-400 hover:bg-slate-800/30 text-xs transition-all text-left ${activeTab === 'news' ? 'border border-slate-700 bg-slate-800/20 text-slate-200' : ''}`}
                >
                  <span>📰</span> News
                </button>
                
                <button 
                  onClick={() => handleTabClick('accounts')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-400 hover:bg-slate-800/30 text-xs transition-all text-left ${activeTab === 'accounts' ? 'border border-slate-700 bg-slate-800/20 text-slate-200' : ''}`}
                >
                  <span>🔐</span> Accounts
                </button>
                
                <button 
                  onClick={() => handleTabClick('downloads')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-400 hover:bg-slate-800/30 text-xs transition-all text-left ${activeTab === 'downloads' ? 'border border-slate-700 bg-slate-800/20 text-slate-200' : ''}`}
                >
                  <span>💾</span> Downloads
                </button>
                
                <button 
                  onClick={() => handleTabClick('fun')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all text-xs ${
                    activeTab === 'fun'
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                      : 'text-slate-400 hover:bg-slate-800/30'
                  }`}
                >
                  <span>🎮</span> Fun & Trap
                </button>
                
                <button 
                  onClick={() => handleTabClick('changelog')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all text-xs ${
                    activeTab === 'changelog' 
                      ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                      : 'text-slate-400 hover:bg-slate-800/30'
                  }`}
                >
                  <span>📜</span> Change Log
                </button>
              </div>

              {/* TARGET TRACKING HUD - Embedded perfectly in the sidebar */}
              {activeTab === 'fun' && (
                <div
                  className="mt-6 mb-4 mx-1 bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-lg font-mono text-[10px] leading-relaxed select-none text-slate-400 shadow-md"
                  id="debug-hud-panel"
                >
                  <span className="text-emerald-400 font-bold block mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block"></span>
                    ■ TARGET TRACKING HUD
                  </span>
                  <div className="space-y-1">
                    <div>STATE: <span className="text-blue-400 font-bold uppercase">{hudState.state}</span></div>
                    <div>VECTOR ROTATION: <span className="text-yellow-400">{hudState.rotation}°</span></div>
                    <div>ARM REACH: <span className="text-pink-400">{hudState.isExtended ? 'MAX' : 'NORMAL'}</span></div>
                    <div>CAUGHT COUNT: <span className="text-red-400 font-bold">{caughtCount}</span></div>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2 font-sans italic leading-tight">
                    Hover custom trigger below to lure entity
                  </div>
                </div>
              )}

              <button 
                onClick={clickAbmelden}
                className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-md text-red-400/80 hover:bg-red-500/10 border border-red-900/20 text-xs transition text-left"
              >
                <span>↩️</span> Abmelden
              </button>
            </nav>

            {/* DYNAMIC CONTENT AREA (Fluid Middle Column) */}
            <section className="flex-1 p-6 flex flex-col justify-between bg-[#11131b] text-slate-300 relative border-r border-slate-800/40" id="editorial-left-pane">
              
              {/* TAB CONTAINER 1: Change Log Chronology View */}
              {activeTab === 'changelog' && (
                <div className="flex-1 flex flex-col" id="changelog-module">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold text-white mb-1.5 flex items-center gap-2 font-sans">
                      <span className="text-indigo-400">📜</span> System Change Log
                    </h2>
                    <p className="text-[11px] text-slate-500">Chronologische Übersicht aller implementierten Updates und Modifikationen.</p>
                  </div>

                  {/* TIMELINE LIST */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-5 pl-4 border-l-2 border-indigo-500/20 relative" id="timeline-flow">
                    
                    {/* ENTRY 1 */}
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                      <div className="bg-[#1e293b]/70 border border-slate-700/30 rounded-lg p-4 font-mono">
                        <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-slate-700/50">
                          <span className="text-indigo-300 font-bold text-[11px]">🚀 v2.0.1 - Sicherheitsupdate & Mitgliederbereich</span>
                          <span className="text-[9px] text-slate-500">05.06.2026 - 08:20 UHR</span>
                        </div>
                        <ul className="text-[10px] text-slate-400 space-y-1.5 leading-relaxed">
                          <li className="flex gap-2"><span>🔒</span> Unsichtbares Login-Fenster implementiert [Taste L].</li>
                          <li className="flex gap-2"><span>💾</span> Echtes Passwort-Verifikationssystem eingebaut ('Lasanga').</li>
                          <li className="flex gap-2"><span>🚨</span> 'Alarmstufe Rot' ausgelöst bei Fehleingabe: Rotes Blinken & Sirene.</li>
                          <li className="flex gap-2"><span>📋</span> IP-Logger & Daten-Tracker im Admin-Panel integriert.</li>
                          <li className="flex gap-2"><span>👤</span> Neuer geschützter Mitgliederbereich aufgebaut.</li>
                        </ul>
                      </div>
                    </div>

                    {/* ENTRY 2 */}
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-700" />
                      <div className="bg-[#1e293b]/40 border border-slate-700/20 rounded-lg p-4 font-mono">
                        <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-slate-700/50">
                          <span className="text-slate-300 font-bold text-[11px] opacity-80">⚡ v1.8.0 - Terminal-Integration</span>
                          <span className="text-[9px] text-slate-600">29.05.2026 - 15:30 UHR</span>
                        </div>
                        <ul className="text-[10px] text-slate-500 space-y-1.5 leading-relaxed">
                          <li className="flex gap-2"><span>🎨</span> 'LUL TERMINAL' Header im Linux-Stil am oberen Rand.</li>
                          <li className="flex gap-2"><span>⏱️</span> Integrierte hochpräzise Systemzeit und grüne Statusleuchte.</li>
                          <li className="flex gap-2"><span>🗑️</span> Entfernung alter Systemquellen (FRED/BLS/BEA...).</li>
                        </ul>
                      </div>
                    </div>

                    {/* ENTRY 3 */}
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-700" />
                      <div className="bg-[#1e293b]/20 border border-slate-700/10 rounded-lg p-4 font-mono">
                        <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-slate-700/50">
                          <span className="text-slate-400 font-bold text-[11px] opacity-60">📈 v1.5.0 - Besucherzähler</span>
                          <span className="text-[9px] text-slate-600">24.05.2026 - 11:20 UHR</span>
                        </div>
                        <p className="text-[10px] text-slate-600">📊 Besucherstatistiken direkt in die Statusleiste verschoben.</p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB CONTAINER 2: Fun & Trap View (Preserving your interactive Hello layout with coordinates & trap button!) */}
              {activeTab === 'fun' && (
                <div className="flex-1 flex flex-col justify-between" id="fun-module">
                  
                  <div id="greeting-text-block">
                    <div className="flex items-center gap-3 mb-4" id="greeting-header">
                      <span className="bg-amber-500/10 text-amber-400 p-2 rounded-lg border border-amber-500/20">
                        <Terminal className="w-5 h-5 animate-pulse" />
                      </span>
                      <div>
                        <h1 className="text-xl font-bold text-slate-100 font-sans" id="main-greeting">
                          Hello! 👋
                        </h1>
                        <p className="text-[11px] text-amber-400/80 font-mono mt-0.5">user@lul_terminal:~$ ./welcome.sh</p>
                      </div>
                    </div>

                    <div className="space-y-3.5 text-slate-400 text-xs pr-2" id="welcome-message-content">
                      <h2 className="text-sm font-semibold text-slate-300 font-sans">
                        Welcome to the internet.
                      </h2>
                      <p className="leading-relaxed">
                        This is a classic website. There are absolutely <strong>no tricky traps</strong>, 
                        artificial tracking gravity, or weird physics anomalies here!
                      </p>
                      <p className="leading-relaxed">
                        Feel free to explore other columns, check diagnostic pings, or click that big polished button down there?
                      </p>
                    </div>

                    {/* Proximity field tracer warn card */}
                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3.5 mt-5 flex items-start gap-2.5" id="warning-notice">
                      <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">SENSOR WARN LOG</span>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                          Quantum field anomalies are detected localized under the cursor. Please manipulate indices with absolute caution.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reaction key triggers */}
                  <div className="flex items-center gap-5 pt-4 border-t border-slate-800/40" id="interact-action-row">
                    <button
                      className="trap-button"
                      onClick={handleButtonClicked}
                      disabled={cursorGrabbed}
                      id="action-trap-button"
                    >
                      {gameOver && "Nice one! 🎉"}
                      {cursorGrabbed && "GOTCHA! 😈"}
                      {!gameOver && !cursorGrabbed && "Button! 🖲️"}
                    </button>

                    <div className="flex flex-col font-mono" id="button-helper-tooltip">
                      <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> TRAP STATUS
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        {gameOver ? 'COOLDOWN: 4.0s' : cursorGrabbed ? 'TRAPPED' : 'AWAITING TRIGGER'}
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTAINER 3: News List */}
              {activeTab === 'news' && (
                <div className="flex-1 flex flex-col animate-fade-in" id="news-module">
                  <div className="mb-5 flex justify-between items-end">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-1.5 flex items-center gap-2 font-sans">
                        <span className="text-indigo-400">📰</span> Terminal Bulletins & Graphics
                      </h2>
                      <p className="text-[11px] text-slate-500 font-mono">Live Nachrichten-Feed, System-Ereignisse und Echtzeit-ASCII-Generierung.</p>
                    </div>
                  </div>

                  {/* Interactive Integrated System Banner & ASCII Art Generator */}
                  <div className="mb-5 p-4 bg-[#161a24] rounded-lg border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.08)]" id="ascii-art-generator-container">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3 pb-2 border-b border-slate-800/80">
                      <span className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse shrink-0" />
                        ■ INTERACTIVE ASCII ART GENERATOR
                      </span>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[10px] text-slate-500 font-mono">ASCII Input:</span>
                        <input 
                          type="text" 
                          value={asciiGenInput}
                          onChange={(e) => setAsciiGenInput(e.target.value.slice(0, 15))}
                          placeholder="Type text..."
                          className="bg-[#0b0c10] border border-slate-800 text-[10px] font-mono rounded px-2 py-1 text-emerald-400 w-36 focus:outline-none focus:border-indigo-500/60 transition-all font-bold tracking-wider"
                          maxLength={15}
                          id="ascii-live-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="p-3 bg-[#090a0f] rounded border border-slate-900 flex flex-col justify-between overflow-hidden">
                        <span className="text-[9px] font-mono text-slate-500 block mb-1.5 uppercase tracking-widest">STABLE LUL SYSTEM LOGO BANNER:</span>
                        <pre className="text-indigo-400 font-mono text-[8px] leading-tight select-all overflow-x-auto whitespace-pre py-1.5 bg-black/20 rounded pl-2">
                          {LUL_ASCII_BANNER}
                        </pre>
                      </div>
                      <div className="p-3 bg-[#090a0f] rounded border border-slate-900 flex flex-col justify-between overflow-hidden">
                        <span className="text-[9px] font-mono text-slate-500 block mb-1.5 uppercase tracking-widest">LIVE GENERATED OUTPUT:</span>
                        <pre className="text-emerald-400 font-mono text-[8px] leading-tight select-all overflow-x-auto whitespace-pre py-1.5 bg-black/20 rounded pl-2">
                          {generateAsciiArt(asciiGenInput || 'LUL')}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-1 space-y-4" id="news-list">
                    <div className="p-4 bg-slate-900/60 rounded-md border border-slate-800">
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                        <span>CRITICAL EMERGENCY BULLETIN</span>
                        <span>08:14:04</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase mb-1">Anomaly localized in sector 14</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        A dynamic gravity-folding entities have breached primary sandbox buffers. System alert code orange is active.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-900/60 rounded-md border border-slate-800">
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                        <span>NETWORK SYS ANNOUNCEMENT</span>
                        <span>Yesterday</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase mb-1">Passwort "Lasanga" verified</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Secure database hashes updated. Members must provide 'Lasanga' values to gain dashboard grid authority.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTAINER 4: Accounts secure state list */}
              {activeTab === 'accounts' && (
                <div className="flex-1 flex flex-col" id="accounts-module">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold text-white mb-1.5 flex items-center gap-2 font-sans">
                      <span className="text-green-400">🔐</span> Authority Credentials
                    </h2>
                    <p className="text-[11px] text-slate-500">Übersicht registrierter Konten und Zugriffsrechte.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 font-mono text-[11px]" id="accounts-list">
                    <div className="bg-black/35 p-3 rounded border border-slate-800/80 flex justify-between items-center">
                      <span className="text-slate-400">admin@lul_terminal</span>
                      <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[9px] border border-green-500/20 uppercase font-bold">Secure</span>
                    </div>
                    <div className="bg-black/35 p-3 rounded border border-slate-800/80 flex justify-between items-center">
                      <span className="text-slate-400">guest_session_user</span>
                      <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[9px] border border-amber-500/20 uppercase font-bold">Unshielded</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTAINER 5: System Downloads list */}
              {activeTab === 'downloads' && (
                <div className="flex-1 flex flex-col" id="downloads-module">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold text-white mb-1.5 flex items-center gap-2 font-sans">
                      <span className="text-teal-400">💾</span> Client Packages
                    </h2>
                    <p className="text-[11px] text-slate-500">Lokale Treiberdateien und Binärpakete.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 gap-3" id="downloads-list">
                    <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
                      <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-slate-300">
                        <span>⚙️</span> shell_core.sh
                      </div>
                      <span className="text-[9px] text-slate-500 uppercase block font-mono">Size: 4.8 KB</span>
                      <button 
                        onClick={() => {
                          appendLog('Initiated download request: shell_core.sh. Executing mock fetch.', 'info');
                          playBeep(400, 0.25, 'sine');
                        }}
                        className="mt-2 text-[9px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded transition w-full"
                      >
                        Download Client
                      </button>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
                      <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-slate-300">
                        <span>📦</span> visual_rig.bin
                      </div>
                      <span className="text-[9px] text-slate-500 uppercase block font-mono">Size: 224 KB</span>
                      <button 
                        onClick={() => {
                          appendLog('Initiated download request: visual_rig.bin.', 'info');
                          playBeep(450, 0.2, 'sine');
                        }}
                        className="mt-2 text-[9px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded transition w-full"
                      >
                        Download Client
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </section>

            {/* DIAGNOSTICS & TELEMETRY LIVE PANEL (Rightmost w-[36%] bg-[#0c0d12]) */}
            <div className="w-[36%] h-full flex flex-col bg-[#0c0d12] p-5 justify-between shrink-0" id="dashboard-right-pane">
              
              <div className="flex flex-col h-full overflow-hidden" id="terminal-diagnostics">
                {/* Visual Head Elements */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-2 shrink-0" id="terminal-pane-topbar">
                  <div className="flex items-center gap-2" id="logs-title-header">
                    <Bug className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#a5b4fc] uppercase">
                      DIAGNOSTICS terminal
                    </span>
                  </div>
                  
                  {/* Speaker Muter Toggle */}
                  <button 
                    onClick={() => {
                      setIsMuted(!isMuted);
                      appendLog(`Audio output ${!isMuted ? 'MUTED' : 'ENABLED'}.`, 'info');
                    }}
                    className="p-1 px-2 rounded border border-slate-850 hover:border-indigo-500/20 transition text-slate-400 text-xs flex items-center gap-1.5 font-mono bg-black/20"
                    title="Toggle sound fx"
                    id="audio-toggle-button"
                  >
                    {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-indigo-400 animate-pulse" />}
                    <span className="text-[9px] font-bold">FX SURND</span>
                  </button>
                </div>

                {/* Collapsible Accordion Group Container */}
                <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1" id="diagnostics-accordion-group">
                  
                  {/* PANEL 1: CONSOLE LOGS & STREAM */}
                  <div className={`flex flex-col transition-all duration-150 ${expandedPanels.logs ? 'flex-1 min-h-[220px]' : 'shrink-0'}`}>
                    <button
                      type="button"
                      onClick={() => setExpandedPanels(p => ({ ...p, logs: !p.logs }))}
                      className="w-full text-left py-1.5 px-2 bg-[#11131c]/80 hover:bg-[#161a25]/80 border border-slate-800/80 text-[9px] font-mono font-bold tracking-widest text-[#a5b4fc] flex justify-between items-center rounded select-none shrink-0"
                    >
                      <span>📟 CONSOLE LOGS & STREAM</span>
                      <span className="text-[7px] text-slate-500">{expandedPanels.logs ? '▼' : '▶'}</span>
                    </button>
                    {expandedPanels.logs && (
                      <div 
                        className="flex-1 mt-1 bg-black/50 rounded p-3 font-mono text-[10px] leading-relaxed overflow-y-auto border border-slate-800/60 shadow-inner flex flex-col gap-2 relative animate-fade-in"
                        id="logs-terminal-stream"
                      >
                        {isMatrixOverlayActive && (
                          <MatrixOverlay onClose={() => setIsMatrixOverlayActive(false)} />
                        )}
                        {commandLogs.map((log) => {
                          const isClickable = !!log.commandToRun;
                          return (
                            <div 
                              key={log.id} 
                              className={`flex gap-2 items-start ${isClickable ? 'group cursor-pointer' : ''}`} 
                              id={`log-item-${log.id}`}
                              onClick={isClickable ? () => processCommand(log.commandToRun!) : undefined}
                            >
                              <span className="text-slate-600 font-semibold shrink-0 select-none">[{log.time}]</span>
                              <span 
                                className={`whitespace-pre-wrap leading-tight break-all ${
                                  isClickable 
                                    ? `${themeText} hover:brightness-125 hover:underline decoration-dashed font-semibold transition-all duration-150`
                                    : log.type === 'success' 
                                      ? 'text-green-400 font-semibold' 
                                      : log.type === 'warn' 
                                        ? 'text-amber-400' 
                                        : log.type === 'alert' 
                                          ? 'text-red-500 font-extrabold animate-pulse' 
                                          : 'text-indigo-300'
                                }`}
                              >
                                {log.message}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* PANEL 2: TELEMETRY & CPU CHART */}
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedPanels(p => ({ ...p, telemetry: !p.telemetry }))}
                      className="w-full text-left py-1.5 px-2 bg-[#11131c]/80 hover:bg-[#161a25]/80 border border-slate-800/80 text-[9px] font-mono font-bold tracking-widest text-[#a5b4fc] flex justify-between items-center rounded select-none animate-fade-in"
                    >
                      <span>📊 SYSTEM TELEMETRY & CPU</span>
                      <span className="text-[7px] text-slate-500">{expandedPanels.telemetry ? '▼' : '▶'}</span>
                    </button>
                    {expandedPanels.telemetry && (
                      <div className="mt-1 flex flex-col gap-2">
                        {/* System Load Realtime Line Chart */}
                        <div className="bg-black/40 p-2.5 rounded border border-slate-800/80" id="system-load-chart-container">
                          <div className="flex justify-between items-center mb-1 text-[8px] font-mono tracking-wider text-indigo-400 font-bold select-none">
                            <span className="flex items-center gap-1">
                              <span className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse"></span>
                              ■ CPU SYSTEM LOAD TELEMETRY (60S)
                            </span>
                            <span className="text-emerald-400">{systemLoad}%</span>
                          </div>
                          <div className="h-[55px] w-full" id="telemetry-chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={loadHistory} margin={{ top: 2, right: 2, left: -20, bottom: 2 }}>
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 50]} hide />
                                <Tooltip 
                                  contentStyle={{ background: '#090a0f', borderColor: '#312e81', fontSize: '9px', fontFamily: 'monospace' }}
                                  labelStyle={{ color: '#818cf8' }}
                                  itemStyle={{ color: '#a5b4fc', padding: 0 }}
                                  cursor={{ stroke: '#312e81', strokeWidth: 1 }}
                                />
                                <Line type="monotone" dataKey="load" stroke={themeHexColor} strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Additional Telemetry Grid */}
                        <div className="grid grid-cols-2 gap-1.5" id="telemetry-grid">
                          {/* RAM USAGE */}
                          <div className="bg-black/45 p-2 rounded border border-slate-800/60 font-mono text-[8px] leading-tight flex flex-col justify-between" id="telemetry-ram-card">
                            <div className="flex justify-between text-slate-500 mb-1">
                              <span>■ RAM WORKLOAD</span>
                              <span className="text-indigo-400 font-bold">{ramUsage.toFixed(2)} GB</span>
                            </div>
                            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900/40">
                              <div 
                                className="bg-indigo-500 h-full transition-all duration-500" 
                                style={{ width: `${(ramUsage / 8.0) * 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[7px] text-slate-600 mt-0.5">
                              <span>LIMIT: 8.00 GB</span>
                              <span>{((ramUsage / 8.0) * 100).toFixed(0)}%</span>
                            </div>
                          </div>

                          {/* CPU TEMPERATURE */}
                          <div className="bg-black/45 p-2 rounded border border-slate-800/60 font-mono text-[8px] leading-tight flex flex-col justify-between" id="telemetry-temp-card">
                            <div className="flex justify-between text-slate-500 mb-1">
                              <span>■ THERMAL CORE</span>
                              <span className={`${cpuTemp > 60 ? 'text-rose-400 animate-pulse' : 'text-amber-400'} font-bold`}>{cpuTemp.toFixed(1)}°C</span>
                            </div>
                            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900/40">
                              <div 
                                className={`h-full transition-all duration-500 ${cpuTemp > 60 ? 'bg-rose-500' : 'bg-amber-500'}`}
                                style={{ width: `${(cpuTemp / 100) * 100}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[7px] text-slate-600 mt-0.5">
                              <span>MAX: 100°C</span>
                              <span>{cpuTemp > 60 ? 'HOT' : 'NOMINAL'}</span>
                            </div>
                          </div>

                          {/* NETWORK SPEED & PING */}
                          <div className="bg-black/45 p-2 rounded border border-slate-800/60 font-mono text-[8px] leading-tight flex flex-col justify-between" id="telemetry-network-card">
                            <div className="flex justify-between text-slate-500 mb-1">
                              <span>■ NET PING</span>
                              <span className="text-cyan-400 font-bold">{networkPing} ms</span>
                            </div>
                            <div className="flex justify-between items-center text-[7px] text-slate-400 mt-0.5">
                              <span>RX: <span className="text-emerald-400 font-semibold">{networkTraffic.rx.toFixed(1)}MB/s</span></span>
                              <span>TX: <span className="text-cyan-455 font-semibold">{networkTraffic.tx.toFixed(1)}MB/s</span></span>
                            </div>
                          </div>

                          {/* SANDBOX SECURITY CORE */}
                          <div className="bg-black/45 p-2 rounded border border-slate-800/60 font-mono text-[8px] leading-tight flex flex-col justify-between" id="telemetry-sandbox-card">
                            <div className="flex justify-between text-slate-500 mb-1">
                              <span>■ SANDBOX GRID</span>
                              <span className="text-emerald-400 font-bold">SECURE</span>
                            </div>
                            <div className="flex items-center gap-1 text-[7px] text-slate-500 mt-1">
                              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                              <span>SHIELD ACTIVE</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* PANEL 3: ACTIVE WORKER PROCESSES */}
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedPanels(p => ({ ...p, processes: !p.processes }))}
                      className="w-full text-left py-1.5 px-2 bg-[#11131c]/80 hover:bg-[#161a25]/80 border border-slate-800/80 text-[9px] font-mono font-bold tracking-widest text-[#a5b4fc] flex justify-between items-center rounded select-none"
                    >
                      <span>⚙️ ACTIVE WORKER PROCESSES</span>
                      <span className="text-[7px] text-slate-500">{expandedPanels.processes ? '▼' : '▶'}</span>
                    </button>
                    {expandedPanels.processes && (
                      <div className="mt-1 p-2 bg-black/40 border border-slate-800/60 rounded flex flex-col gap-1.5">
                        {processes.map((proc, idx) => (
                          <div key={idx} className="flex flex-col text-[8px] font-mono">
                            <div className="flex justify-between text-slate-400 mb-0.5">
                              <span className="font-bold text-slate-300">{proc.name}</span>
                              <span>CPU: <span className="text-indigo-400 font-bold">{proc.cpu.toFixed(1)}%</span> | RAM: <span className="text-slate-400">{proc.ram}MB</span></span>
                            </div>
                            <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${Math.min(proc.cpu * 4, 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PANEL 4: SECURITY VULNERABILITY SCANNER */}
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedPanels(p => ({ ...p, vulnerabilities: !p.vulnerabilities }))}
                      className="w-full text-left py-1.5 px-2 bg-[#11131c]/80 hover:bg-[#161a25]/80 border border-slate-800/80 text-[9px] font-mono font-bold tracking-widest text-[#a5b4fc] flex justify-between items-center rounded select-none"
                    >
                      <span>🛡️ SECURITY VULNERABILITY SCANNER</span>
                      <span className="text-[7px] text-slate-500">{expandedPanels.vulnerabilities ? '▼' : '▶'}</span>
                    </button>
                    {expandedPanels.vulnerabilities && (
                      <div className="mt-1 p-2 bg-black/40 border border-slate-800/60 rounded flex flex-col gap-1.5 text-[8px] font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">🛡️ SQL INJECTION FILTER</span>
                          <span className="text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1 rounded border border-emerald-500/20 text-[7px]">SHIELDED</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">🔒 XSS BUFFER EXPLOITS</span>
                          <span className="text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1 rounded border border-emerald-500/20 text-[7px]">PROTECTED</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">🌀 GRAVITY CONTAINMENT GRID</span>
                          <span className="text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-1 rounded border border-indigo-500/20 text-[7px]">STABLE (100%)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PANEL 5: OPERATOR SELF-CARE & CLAW APPETITE */}
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedPanels(p => ({ ...p, selfcare: !p.selfcare }))}
                      className="w-full text-left py-1.5 px-2 bg-[#11131c]/80 hover:bg-[#161a25]/80 border border-slate-800/80 text-[9px] font-mono font-bold tracking-widest text-[#a5b4fc] flex justify-between items-center rounded select-none"
                    >
                      <span>☕ OPERATOR SELF-CARE & CLAW APPETITE</span>
                      <span className="text-[7px] text-slate-500">{expandedPanels.selfcare ? '▼' : '▶'}</span>
                    </button>
                    {expandedPanels.selfcare && (
                      <div className="mt-1 p-2 bg-black/40 border border-slate-800/60 rounded grid grid-cols-2 gap-2 text-[8px] font-mono animate-fade-in">
                        <div className="flex flex-col justify-between border-r border-slate-800/40 pr-2">
                          <div className="flex justify-between items-center mb-1 text-slate-400">
                            <span>☕ COFFEE</span>
                            <span className="text-amber-400 font-bold">{coffeeCount.toFixed(1)} CUPS</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setCoffeeCount(prev => prev + 1);
                              appendLog('☕ [COFFEE BREW] Operator ingested coffee. Productivity levels temporarily boosted (jitter index high).', 'success');
                              playBeep(660, 0.1, 'sine');
                            }}
                            className="text-[7px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 py-0.5 rounded transition-all font-bold cursor-pointer animate-pulse"
                          >
                            DRINK COFFEE
                          </button>
                        </div>
                        <div className="flex flex-col justify-between pl-1">
                          <div className="flex justify-between items-center text-slate-400">
                            <span>😈 CLAW HUNGER</span>
                            <span className={`${monsterHunger > 75 ? 'text-red-400 animate-pulse font-extrabold' : 'text-pink-400'} font-bold`}>{monsterHunger}%</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1 mb-1 border border-slate-900/40">
                            <div className={`h-full transition-all duration-500 ${monsterHunger > 75 ? 'bg-red-500 animate-pulse' : 'bg-pink-500'}`} style={{ width: `${monsterHunger}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hardware tachometer & storage capacity */}
                  <div className="mt-2 p-2 bg-black/30 border border-slate-800/40 rounded flex justify-between items-center font-mono text-[7px] text-slate-500 shrink-0">
                    <span className="flex items-center gap-1 animate-pulse">
                      <span>🔄 SYSTEM COOLING FAN:</span>
                      <span className="text-emerald-400 font-bold">
                        {Math.floor(2000 + (systemLoad * 40))} RPM {['|', '/', '-', '\\'][Math.floor(sessionSeconds) % 4]}
                      </span>
                    </span>
                    <span>GC BUFFER: INACTIVE (LAST: {lastGcTime}s)</span>
                  </div>

                </div>

                {/* Interactive CLI Input forms */}
                <form onSubmit={executeCommand} className="mt-2 flex items-center gap-2 bg-black/40 border border-slate-800/80 rounded p-1.5 shrink-0" id="diagnostic-cmd-form">
                  <span className={`${themeText} font-mono text-[11px] pl-1 select-none font-bold`}>[$]</span>
                  <input
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type commands (e.g. 'help', 'stats')..."
                    className="flex-1 bg-transparent border-0 text-slate-100 font-mono text-[11px] focus:ring-0 focus:outline-none placeholder-slate-700"
                    maxLength={36}
                    id="cli-input-field"
                  />
                  <button
                    type="button"
                    disabled={commandHistory.length === 0}
                    onClick={() => {
                      const lastCmd = commandHistory[commandHistory.length - 1];
                      if (lastCmd) {
                        processCommand(lastCmd);
                      }
                    }}
                    className={`text-[9px] font-semibold font-mono px-2.5 py-1.5 rounded transition border flex items-center gap-1.5 shrink-0 ${
                      commandHistory.length > 0
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 cursor-pointer shadow-[0_0_5px_rgba(245,158,11,0.1)]'
                        : 'bg-slate-900/30 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-45'
                    }`}
                    id="repeat-shortcut-btn"
                    title={commandHistory.length > 0 ? `Run last command: "${commandHistory[commandHistory.length - 1]}"` : "No command history yet"}
                  >
                    <span>⚡ RE-RUN</span>
                    {commandHistory.length > 0 && (
                      <span className="text-[7px] px-1 bg-amber-500/20 rounded font-bold text-amber-200 max-w-[70px] truncate">
                        {commandHistory[commandHistory.length - 1]}
                      </span>
                    )}
                  </button>
                  <button 
                    type="submit"
                    className={`${themeBg} hover:bg-white/5 text-slate-200 text-[9px] font-medium font-mono px-2.5 py-1.5 rounded transition border ${themeBorder}`}
                    id="execute-btn"
                  >
                    EXECUTE
                  </button>
                </form>
              </div>

            </div>

            {/* Mount custom tracking physical claw inside sandbox bounds! */}
            {activeTab === 'fun' && (
              <div className="grab-zone-wrapper">
                <GrabZone 
                  cursorGrabbed={cursorGrabbed}
                  gameOver={gameOver}
                  onCursorGrabbed={handleCursorGrabbed}
                  mousePos={mousePos}
                  onMetricsUpdate={(state, rotation, isExtended) => {
                    setHudState({ state, rotation, isExtended });
                  }}
                />
              </div>
            )}

          </div>

        </main>

        {/* REPRODUCING SYSTEM FOOTER MATCHING THE PROFESSIONAL POLISH THEME EXACTLY */}
        <footer className="h-6 bg-[#020617] border-t border-slate-800/50 px-4 flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest font-mono select-none" id="system-footer-rail">
          <div className="flex items-center gap-3" id="system-footer-left">
            <span className="text-indigo-400">SYSTEM LOAD: {systemLoad}%</span>
            <span className="text-slate-800">|</span>
            <button 
              onClick={cycleBatteryLevel}
              className={`flex items-center gap-1 hover:text-white transition-all font-bold cursor-pointer ${
                batteryLevel <= 20 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
              }`}
              title="Virtual battery level (Click to manually discharge/recharge for testing!)"
              id="system-battery-btn"
            >
              🔋 {batteryLevel}% {batteryLevel <= 20 ? 'LOW' : 'OK'}
            </button>
            <span className="text-slate-800">|</span>
            <span>Status: {batteryLevel <= 20 ? 'Warning' : 'Optimal'}</span>
          </div>
          <span>Keine Scrollbalken sichtbar • Gesamter Inhalt passt sich automatisch an</span>
          <div className="flex items-center gap-4" id="system-footer-right">
            <span className="text-[#a5b4fc] font-bold">SESSION: {formatSessionTime(sessionSeconds)}</span>
            <span className="text-slate-800">|</span>
            <span className="flex items-center gap-1.5" id="footer-connection-laser">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Link Established
            </span>
          </div>
        </footer>

      </div>

      {/* Decorative Custom overlay showing captured monster action alert on full screen */}
      {cursorGrabbed && (
        <div 
          className="absolute inset-0 bg-red-950/20 backdrop-blur-[2px] z-[100] flex items-center justify-center animate-fade-in select-none pointer-events-none"
          id="grabbed-screen-overlay"
        >
          <div className="bg-[#0b0c10]/95 border border-red-500/40 p-7 rounded-xl shadow-2xl max-w-sm text-center flex flex-col items-center gap-3.5 animate-scale-up">
            <span className="text-3xl">😈</span>
            <span className="text-red-400 font-mono text-base font-extrabold tracking-widest animate-pulse">
              GOTCHA! CURSOR CAPTURED
            </span>
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-w-xs">
              Primary cursor signals are currently held secure in organic carbon claw mesh. Stabilizing...
            </p>
            <div className="w-16 h-1 w-full bg-slate-900 rounded-full overflow-hidden mt-0.5">
              <div className="h-full bg-red-500 animate-[loading_2.5s_linear_infinite]" />
            </div>
          </div>
        </div>
      )}

      {/* Full screen red pulse warning overlay for self-destruct */}
      {selfDestructCountdown > 0 && (
        <div className="absolute inset-0 bg-red-950/25 border-4 border-red-600 animate-[pulse_1s_infinite] pointer-events-none z-[200] flex items-center justify-center">
          <div className="bg-[#0b0c10]/95 border border-red-500 p-8 rounded-xl shadow-2xl text-center flex flex-col items-center gap-4 select-none pointer-events-auto">
            <span className="text-5xl animate-bounce">🚨</span>
            <span className="text-red-500 font-mono text-xl font-black tracking-widest animate-pulse">
              SYSTEM SELF-DESTRUCT ACTIVE
            </span>
            <span className="text-slate-100 font-mono text-4xl font-extrabold bg-red-950/50 px-6 py-2 rounded-lg border border-red-900 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
              T-MINUS {selfDestructCountdown}s
            </span>
            <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-w-xs mt-1">
              Core containment field decoupling. Complete system grid collapse imminent. Operator authorization required to abort.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelfDestructCountdown(-1);
                appendLog('❌ SELF-DESTRUCT ABORTED: Operator manually engaged the override failsafe switch.', 'success');
                playBeep(880, 0.4, 'sine');
              }}
              className="px-5 py-2.5 bg-red-950 hover:bg-red-900 border border-red-600 text-red-200 text-xs font-bold font-mono tracking-widest rounded transition-all mt-1 cursor-pointer"
            >
              ENGAGE OVERRIDE [ABORT]
            </button>
          </div>
        </div>
      )}

      {/* Full screen Blue Screen of Death (BSOD) diagnostic crash overlay */}
      {bsodActive && (
        <div 
          className="absolute inset-0 bg-[#0000aa] text-white p-12 font-mono text-sm leading-relaxed z-[1000] flex flex-col justify-between select-text"
          onClick={() => {
            setBsodActive(false);
            appendLog('🔄 Warm reboot complete. CRT scanlines re-synchronized.', 'success');
            playBeep(880, 0.3, 'sine');
          }}
        >
          <div className="space-y-4 max-w-3xl">
            <div className="bg-white text-[#0000aa] px-4 py-1.5 font-bold uppercase tracking-widest inline-block select-none">
              LUL OS System Failure
            </div>
            <p className="text-[#00ffff] font-bold">*** STOP: 0x000000D1 (0x0000000C, 0x00000002, 0x00000000, 0xF86B5A89)</p>
            <p className="text-[#a5b4fc] font-bold">DRIVER_IRQL_NOT_LESS_OR_EQUAL (lasagna_auth.dll)</p>
            <p className="text-slate-200">
              A fatal exception has occurred at memory index 0x7FFF32C0. The grid system was over-caffeinated and could not verify the lasagna database integrity constraints.
            </p>
            <div className="border-t border-slate-500/50 pt-4 space-y-2">
              <p>* Check to make sure any new hardware or lasagna recipes are properly cooked.</p>
              <p>* If this is a new installation, ask your AI pair programmer why they wrote this code.</p>
              <p>* Disable memory caching for Fred/Bls/Bea modules in UEFI setup.</p>
            </div>
            <p className="text-slate-300 text-xs animate-pulse select-none mt-2">
              Technical Information:
              <br />
              Address 0xF86B5A89 base at 0xF86B0000, DateStamp 60a4f89d - lasagna_auth.dll
            </p>
          </div>
          <div className="text-[#00ffff] text-xs font-bold tracking-widest animate-pulse text-center uppercase select-none mt-4 cursor-pointer">
            Click anywhere on screen to execute reboot and restore grid...
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SystemStats } from '../types';

interface TerminalHeaderProps {
  stats: SystemStats;
  isCrtEnabled: boolean;
  onToggleCrt: () => void;
  synthTheme: 'clean-sine' | 'retro-8bit' | 'bit-crushed';
  onChangeSynthTheme: (theme: 'clean-sine' | 'retro-8bit' | 'bit-crushed') => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function TerminalHeader({ 
  stats, 
  isCrtEnabled, 
  onToggleCrt,
  synthTheme,
  onChangeSynthTheme,
  isMuted,
  onToggleMute
}: TerminalHeaderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatNumber = (val: number) => {
    return val.toLocaleString('de-DE');
  };

  return (
    <header 
      className="flex items-center justify-between h-[42px] px-5 bg-gradient-to-br from-[#111827] to-[#020617] border-b border-slate-700/50 shadow-2xl z-50 font-mono w-full select-none" 
      id="terminal-header"
    >
      {/* Upper Left Info Window Indicators */}
      <div className="flex items-center gap-3" id="header-system-info">
        <div className="flex gap-1.5" id="control-dots">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" id="dot-red" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]" id="dot-yellow" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" id="dot-green" />
        </div>
        <span className="text-[#a5b4fc] font-bold tracking-widest text-[11px] ml-2" id="terminal-brand-title">LUL TERMINAL</span>
        <span className="text-slate-500 text-[10px]" id="terminal-version-tag">v2.0.1</span>
      </div>

      {/* Visitor Counter Area - Centered Inline Elements */}
      <div className="flex items-center gap-6 bg-black/40 px-4 py-1 rounded border border-slate-800/50" id="header-visitors-badge">
        <div className="text-[10px] tracking-tighter" id="stats-online-container">
          <span className="text-slate-500 uppercase">ONLINE:</span>
          <span className="text-green-400 font-bold ml-1 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" id="stats-online-count">
            {formatNumber(stats.online)}
          </span>
        </div>
        <div className="text-[10px] tracking-tighter" id="stats-hits-container">
          <span className="text-slate-500 uppercase">HITS:</span>
          <span className="text-slate-100 font-bold ml-1" id="stats-hits-count">
            {formatNumber(stats.hits)}
          </span>
        </div>
        <div className="text-[10px] tracking-tighter" id="stats-unique-container">
          <span className="text-slate-500 uppercase">UNIQUE:</span>
          <span className="text-slate-100 font-bold ml-1" id="stats-unique-count">
            {formatNumber(stats.unique)}
          </span>
        </div>
      </div>

      {/* Upper Right System Live Clock */}
      <div className="flex items-center gap-4" id="header-system-clock">
        <button
          onClick={onToggleCrt}
          className={`p-1 px-2.5 rounded text-[9px] font-bold font-mono border tracking-widest transition-all ${
            isCrtEnabled
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
              : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-800'
          }`}
          id="crt-toggle-button"
        >
          CRT: {isCrtEnabled ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => {
            const nextTheme = synthTheme === 'clean-sine' ? 'retro-8bit' : synthTheme === 'retro-8bit' ? 'bit-crushed' : 'clean-sine';
            onChangeSynthTheme(nextTheme);
          }}
          className="p-1 px-2.5 rounded text-[9px] font-bold font-mono border tracking-widest transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)] uppercase"
          id="synth-theme-button"
          title="Cycle Synthesizer sound themes"
        >
          SYNTH: {synthTheme === 'clean-sine' ? 'SINE' : synthTheme === 'retro-8bit' ? '8-BIT' : 'CRUSH'}
        </button>

        <button
          onClick={onToggleMute}
          className={`p-1 px-2 rounded text-[9px] font-mono border tracking-widest transition-all ${
            !isMuted 
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]'
              : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]'
          }`}
          id="audio-mute-button"
          title={isMuted ? "Unmute sound effects" : "Mute sound effects"}
        >
          {isMuted ? '🔇 MUTE' : '🔊 LIVE'}
        </button>

        <span className="text-green-500 font-bold text-[10px] tracking-tight drop-shadow-[0_0_5px_rgba(34,197,94,0.4)] uppercase" id="live-time-ticker">
          {formatDateTime(now)}
        </span>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" id="live-status-laser-bulb" />
      </div>
    </header>
  );
}

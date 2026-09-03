'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Camera,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  Sun,
  Layers,
  HelpCircle,
  Trophy,
  ArrowRight,
  Shuffle,
  Compass,
  Palette,
} from 'lucide-react';
import { MazeData, getCuratedPresets } from '@/lib/maze-generator';
import { soundManager } from '@/lib/sound-effects';
import { VirtualJoystick } from '@/components/controls/VirtualJoystick';
import { MarblePaletteId, MARBLE_PALETTES } from '@/lib/marble-palettes';

interface HUDProps {
  controlMode: 'board' | 'marble';
  onToggleControlMode: (mode: 'board' | 'marble') => void;
  onResetMarble: () => void;
  onResetCamera: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  slowMo: boolean;
  onToggleSlowMo: () => void;
  lightingPreset: 'workshop' | 'studio' | 'sunset';
  onChangeLighting: (preset: 'workshop' | 'studio' | 'sunset') => void;
  colliderMode?: 'trimesh' | 'convex-hull';
  onToggleColliderMode?: (mode: 'trimesh' | 'convex-hull') => void;
  marblePalette: MarblePaletteId;
  onChangeMarblePalette: (palette: MarblePaletteId) => void;
  currentMaze: MazeData;
  onSelectMaze: (maze: MazeData) => void;
  onGenerateNewMaze: () => void;
  gameStatus: 'playing' | 'completed';
  completionTime: number;
  mazeStartTime: number;
  onPlayAgain: () => void;
  onVirtualTiltChange: (tilt: { x: number; z: number }) => void;
  onVirtualKeySimulate: (keys: { forward: boolean; backward: boolean; left: boolean; right: boolean }) => void;
}

export const HUD: React.FC<HUDProps> = ({
  controlMode,
  onToggleControlMode,
  onResetMarble,
  onResetCamera,
  autoRotate,
  onToggleAutoRotate,
  slowMo,
  onToggleSlowMo,
  lightingPreset,
  onChangeLighting,
  colliderMode = 'trimesh',
  onToggleColliderMode,
  marblePalette,
  onChangeMarblePalette,
  currentMaze,
  onSelectMaze,
  onGenerateNewMaze,
  gameStatus,
  completionTime,
  mazeStartTime,
  onPlayAgain,
  onVirtualTiltChange,
  onVirtualKeySimulate,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const presets = getCuratedPresets();

  // Elapsed timer while playing
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [gameStatus]);

  const timer = Math.max(0, Math.floor((currentTime - mazeStartTime) / 1000));

  // Trigger celebration confetti when goal reached
  useEffect(() => {
    if (gameStatus === 'completed') {
      soundManager.playGoalCelebration();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#d4af37', '#bb1528', '#1446a0', '#22c55e', '#ffffff'],
        });
      } catch {
        // Fallback
      }
    }
  }, [gameStatus]);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-4 text-stone-100 select-none font-sans">
      {/* ================= TOP BAR ================= */}
      <header className="flex items-center justify-between w-full">
        {/* Title & Stats */}
        <div
          id="brand-header"
          className="pointer-events-auto flex items-center gap-3 bg-stone-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-stone-700/50 shadow-lg"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <div>
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-amber-100 flex items-center gap-2">
              <span>Marble Labyrinth</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-600/40 text-amber-300">
                {currentMaze.difficulty}
              </span>
            </h1>
            <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
              <span>{currentMaze.name}</span>
              <span>•</span>
              <span className="font-mono text-amber-200">
                {formatTime(gameStatus === 'completed' ? completionTime : timer)}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right Quick Toggles */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-stone-900/80 backdrop-blur-md px-2 py-1.5 rounded-xl border border-stone-700/50 shadow-lg">
          {/* Marble Color Palette Selector */}
          <div className="flex items-center bg-stone-800/80 rounded-lg p-0.5 text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 text-stone-300 select-none">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline text-[11px] text-stone-400 font-medium">Marble:</span>
            </div>
            {/* Quick Palette Swatch Buttons on XL screens */}
            <div className="hidden xl:flex items-center gap-1 pr-1">
              {MARBLE_PALETTES.map((p) => {
                const isSelected = marblePalette === p.id;
                return (
                  <button
                    key={p.id}
                    id={`btn-palette-${p.id}`}
                    onClick={() => onChangeMarblePalette(p.id)}
                    title={`${p.name} — ${p.tagline}`}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all ${
                      isSelected
                        ? 'bg-amber-700 text-amber-100 font-semibold shadow-sm ring-1 ring-amber-400/50'
                        : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: p.primary }}
                    />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
            {/* Dropdown Selector for smaller screens */}
            <div className="xl:hidden">
              <select
                id="select-marble-palette"
                value={marblePalette}
                onChange={(e) => onChangeMarblePalette(e.target.value as MarblePaletteId)}
                title="Select Marble Internal Color Palette"
                className="bg-stone-900/90 text-amber-200 text-xs rounded-md border border-stone-700/80 px-2 py-1 outline-none cursor-pointer"
              >
                {MARBLE_PALETTES.map((p) => (
                  <option key={p.id} value={p.id} className="bg-stone-900 text-stone-200">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lighting Presets */}
          <div className="flex items-center bg-stone-800/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-lighting-workshop"
              onClick={() => onChangeLighting('workshop')}
              title="Warm Workshop Light"
              className={`px-2 py-1 rounded-md transition-colors ${
                lightingPreset === 'workshop'
                  ? 'bg-amber-700/80 text-amber-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Warm
            </button>
            <button
              id="btn-lighting-studio"
              onClick={() => onChangeLighting('studio')}
              title="Studio Softbox Light"
              className={`px-2 py-1 rounded-md transition-colors ${
                lightingPreset === 'studio'
                  ? 'bg-amber-700/80 text-amber-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Studio
            </button>
            <button
              id="btn-lighting-sunset"
              onClick={() => onChangeLighting('sunset')}
              title="Golden Sunset Light"
              className={`px-2 py-1 rounded-md transition-colors ${
                lightingPreset === 'sunset'
                  ? 'bg-amber-700/80 text-amber-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Sunset
            </button>
          </div>

          {/* Recalculated Collision Geometry Selector */}
          <div className="hidden md:flex items-center bg-stone-800/80 rounded-lg p-0.5 text-xs">
            <button
              id="btn-collider-trimesh"
              onClick={() => onToggleColliderMode?.('trimesh')}
              title="Precision Welded Trimesh (Eliminates Seams & Jitter)"
              className={`px-2 py-1 rounded-md transition-colors ${
                colliderMode === 'trimesh'
                  ? 'bg-amber-700/80 text-amber-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Trimesh
            </button>
            <button
              id="btn-collider-convexhull"
              onClick={() => onToggleColliderMode?.('convex-hull')}
              title="Continuous Convex Hull Colliders"
              className={`px-2 py-1 rounded-md transition-colors ${
                colliderMode === 'convex-hull'
                  ? 'bg-amber-700/80 text-amber-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Convex Hull
            </button>
          </div>

          <div className="w-[1px] h-5 bg-stone-700/60 mx-1" />

          {/* Sound Mute */}
          <button
            id="btn-toggle-sound"
            onClick={toggleSound}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-1.5 rounded-lg text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
          </button>

          {/* Help modal toggle */}
          <button
            id="btn-toggle-help"
            onClick={() => setShowHelp(!showHelp)}
            title="Controls & Instructions"
            className={`p-1.5 rounded-lg transition-colors ${
              showHelp ? 'bg-amber-800 text-amber-100' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ================= HELP & INSTRUCTIONS OVERLAY ================= */}
      {showHelp && (
        <div className="pointer-events-auto max-w-sm mx-auto my-auto bg-stone-900/95 backdrop-blur-lg border border-amber-700/40 rounded-2xl p-5 shadow-2xl text-stone-200">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h3 className="font-semibold text-amber-200 text-sm flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              Game Guide & Controls
            </h3>
            <button
              onClick={() => setShowHelp(false)}
              className="text-stone-400 hover:text-stone-100 text-xs px-2 py-0.5 rounded bg-stone-800"
            >
              Close
            </button>
          </div>

          <div className="text-xs space-y-3 pt-3">
            <div>
              <div className="font-medium text-amber-300 mb-1">🕹️ Board Mode (Default)</div>
              <p className="text-stone-300">
                Use <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700">WASD</kbd> or <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700">Arrow Keys</kbd> to tilt the wooden maze board. The glass marble accelerates downhill due to gravity and collisions.
              </p>
            </div>
            <div>
              <div className="font-medium text-amber-300 mb-1">🔮 Marble Mode</div>
              <p className="text-stone-300">
                WASD / Arrows apply direct physics rolling forces and torque to the marble without tilting the board.
              </p>
            </div>
            <div>
              <div className="font-medium text-amber-300 mb-1">🎥 3D Camera Controls</div>
              <ul className="list-disc list-inside text-stone-400 space-y-0.5">
                <li>Drag empty space with Left Mouse to orbit 360°</li>
                <li>Scroll mouse wheel / pinch to zoom into the glass marble</li>
                <li>Right-click drag to pan the camera</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-amber-300 mb-1">🎨 Marble Internal Color Palettes</div>
              <p className="text-stone-300">
                Switch between handcrafted artisan glass palettes (Ocean Blue, Ruby Fire, Emerald Forest, Amethyst Twilight, and Classic Venetian). The Three.js custom shader uniforms and physical transmission refraction dynamically interpolate in real-time.
              </p>
            </div>
            <div>
              <div className="font-medium text-amber-300 mb-1">📐 Precision Collision Geometry</div>
              <p className="text-stone-300">
                Calculated using unified Trimesh and Convex Hull collision manifolds with continuous collinear wall runs. This completely prevents the glass marble from sinking or suffering seam jitter when rolling over wooden wall and floor intersections.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= MOBILE / TOUCH VIRTUAL JOYSTICK (BOTTOM-RIGHT) ================= */}
      <div className="pointer-events-auto flex justify-between items-end w-full">
        {/* Help Tip Bar */}
        <div className="hidden sm:flex items-center gap-3 bg-stone-900/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-stone-800 text-[11px] text-stone-300">
          <span className="text-amber-400 font-medium">Tip:</span>
          {controlMode === 'board' ? (
            <span>WASD / Arrows tilt board • Space or Double-click centers view</span>
          ) : (
            <span>WASD / Arrows roll marble directly • Collide through maze corridors</span>
          )}
        </div>

        {/* On-screen Tilt Pad for mobile/tablet or quick mouse drag */}
        <div className="pointer-events-auto ml-auto">
          <VirtualJoystick
            mode={controlMode}
            onTiltChange={onVirtualTiltChange}
            onKeySimulate={onVirtualKeySimulate}
          />
        </div>
      </div>

      {/* ================= BOTTOM TOOLBAR ================= */}
      <footer className="pointer-events-auto w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-stone-900/85 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-stone-700/60 shadow-2xl">
        {/* Mode Toggle: Board vs Marble */}
        <div className="flex items-center bg-stone-950/80 p-1 rounded-xl border border-stone-800 w-full sm:w-auto justify-center">
          <button
            id="btn-mode-board"
            onClick={() => onToggleControlMode('board')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              controlMode === 'board'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Board Mode
          </button>
          <button
            id="btn-mode-marble"
            onClick={() => onToggleControlMode('marble')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              controlMode === 'marble'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Marble Mode
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {/* Reset Marble */}
          <button
            id="btn-reset-marble"
            onClick={onResetMarble}
            title="Reset Marble to Start Position"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 text-xs font-medium rounded-xl border border-stone-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Marble</span>
          </button>

          {/* Reset Camera */}
          <button
            id="btn-reset-camera"
            onClick={onResetCamera}
            title="Reset Camera Angle"
            className="p-2 bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-200 text-xs rounded-xl border border-stone-700 transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-stone-300" />
          </button>

          {/* Auto-Rotate Turntable Toggle */}
          <button
            id="btn-auto-rotate"
            onClick={onToggleAutoRotate}
            title="Toggle Turntable Auto-Rotate"
            className={`p-2 text-xs rounded-xl border transition-colors ${
              autoRotate
                ? 'bg-amber-700/80 border-amber-500 text-white'
                : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Slow Motion (0.5x) Toggle */}
          <button
            id="btn-slow-mo"
            onClick={onToggleSlowMo}
            title="Slow Motion (0.5x)"
            className={`p-2 text-xs rounded-xl border transition-colors ${
              slowMo
                ? 'bg-indigo-700/80 border-indigo-500 text-white'
                : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
          </button>

          {/* Maze Selector Dropdown / New Maze */}
          <select
            id="select-maze-preset"
            value={currentMaze.name}
            onChange={(e) => {
              const found = presets.find((p) => p.name === e.target.value);
              if (found) onSelectMaze(found);
            }}
            className="bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs rounded-xl border border-stone-700 px-2.5 py-1.5 outline-none cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.difficulty})
              </option>
            ))}
          </select>

          {/* New Random Solvable Maze */}
          <button
            id="btn-generate-maze"
            onClick={onGenerateNewMaze}
            title="Generate New Solvable Maze"
            className="flex items-center gap-1 p-2 bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-xs rounded-xl border border-amber-600/40 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* ================= GOAL COMPLETION CELEBRATION MODAL ================= */}
      {gameStatus === 'completed' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-500/50 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Trophy className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-amber-100">Maze Completed!</h2>
              <p className="text-xs text-stone-300 mt-1">
                The glass marble successfully navigated the labyrinth!
              </p>
            </div>

            <div className="bg-stone-800/80 rounded-xl p-3 flex justify-around text-xs border border-stone-700">
              <div>
                <div className="text-stone-400 text-[10px] uppercase">Labyrinth</div>
                <div className="font-semibold text-amber-200 mt-0.5">{currentMaze.name}</div>
              </div>
              <div className="w-[1px] bg-stone-700" />
              <div>
                <div className="text-stone-400 text-[10px] uppercase">Time</div>
                <div className="font-semibold font-mono text-emerald-300 mt-0.5">
                  {formatTime(completionTime)}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                id="btn-completion-retry"
                onClick={onPlayAgain}
                className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-600 transition-colors"
              >
                Replay Maze
              </button>
              <button
                id="btn-completion-next"
                onClick={() => {
                  onGenerateNewMaze();
                  onPlayAgain();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Next Labyrinth</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

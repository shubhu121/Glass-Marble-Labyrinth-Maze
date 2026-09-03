'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getCuratedPresets, generateMazeData, MazeData } from '@/lib/maze-generator';
import { HUD } from '@/components/ui/HUD';
import { Loader2 } from 'lucide-react';

// Dynamically import LabyrinthScene with SSR disabled for WebGL & Rapier Wasm
const LabyrinthScene = dynamic(
  () => import('@/components/scene/LabyrinthScene').then((mod) => mod.LabyrinthScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-950 text-amber-100 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs uppercase tracking-widest text-stone-400 font-medium">
          Crafting Wooden Maze & Glass Marble...
        </p>
      </div>
    ),
  }
);

const INITIAL_PRESETS = getCuratedPresets();

export default function LabyrinthApp() {
  const [currentMaze, setCurrentMaze] = useState<MazeData>(INITIAL_PRESETS[0]);
  const [controlMode, setControlMode] = useState<'board' | 'marble'>('board');
  const [resetMarbleCount, setResetMarbleCount] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [slowMo, setSlowMo] = useState<boolean>(false);
  const [lightingPreset, setLightingPreset] = useState<'workshop' | 'studio' | 'sunset'>('workshop');
  const [colliderMode, setColliderMode] = useState<'trimesh' | 'convex-hull'>('trimesh');
  const [gameStatus, setGameStatus] = useState<'playing' | 'completed'>('playing');
  const [completionTime, setCompletionTime] = useState<number>(0);
  const [mazeStartTime, setMazeStartTime] = useState<number>(() => Date.now());

  // Input state
  const [keyboardKeys, setKeyboardKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const [virtualKeys, setVirtualKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const [virtualTilt, setVirtualTilt] = useState<{ x: number; z: number }>({ x: 0, z: 0 });

  // Combined input keys (keyboard + virtual on-screen joystick)
  const combinedKeys = {
    forward: keyboardKeys.forward || virtualKeys.forward,
    backward: keyboardKeys.backward || virtualKeys.backward,
    left: keyboardKeys.left || virtualKeys.left,
    right: keyboardKeys.right || virtualKeys.right,
  };

  const resetCameraFnRef = useRef<(() => void) | null>(null);

  const handleResetMarble = useCallback(() => {
    setResetMarbleCount((c) => c + 1);
    setGameStatus('playing');
    setMazeStartTime(Date.now());
  }, []);

  const handleResetCamera = useCallback(() => {
    if (resetCameraFnRef.current) {
      resetCameraFnRef.current();
    }
  }, []);

  const handleGoalReached = useCallback(() => {
    if (gameStatus === 'completed') return;
    const now = Date.now();
    const elapsed = Math.max(1, Math.round((now - (mazeStartTime || now)) / 1000));
    setCompletionTime(elapsed);
    setGameStatus('completed');
  }, [gameStatus, mazeStartTime]);

  const handleSelectMaze = useCallback((maze: MazeData) => {
    setCurrentMaze(maze);
    setGameStatus('playing');
    setMazeStartTime(Date.now());
    setResetMarbleCount((c) => c + 1);
  }, []);

  const handleGenerateNewMaze = useCallback(() => {
    // Generate new solvable random labyrinth with 9x9 or 11x11
    const size = Math.random() > 0.5 ? 11 : 9;
    const newMaze = generateMazeData(size, size, 1.0, 0.16, 0.52);
    setCurrentMaze(newMaze);
    setGameStatus('playing');
    setMazeStartTime(Date.now());
    setResetMarbleCount((c) => c + 1);
  }, []);

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        setKeyboardKeys((k) => ({ ...k, forward: true }));
      }
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        setKeyboardKeys((k) => ({ ...k, backward: true }));
      }
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        setKeyboardKeys((k) => ({ ...k, left: true }));
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        setKeyboardKeys((k) => ({ ...k, right: true }));
      }

      // Quick shortcut to reset marble: 'r' or 'R' or Space
      if (e.key === 'r' || e.key === 'R') {
        handleResetMarble();
      }
      // Quick shortcut to reset camera: 'c' or 'C'
      if (e.key === 'c' || e.key === 'C') {
        handleResetCamera();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        setKeyboardKeys((k) => ({ ...k, forward: false }));
      }
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        setKeyboardKeys((k) => ({ ...k, backward: false }));
      }
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        setKeyboardKeys((k) => ({ ...k, left: false }));
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        setKeyboardKeys((k) => ({ ...k, right: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleResetCamera, handleResetMarble]);

  return (
    <main
      id="labyrinth-app-container"
      className="relative w-screen h-screen overflow-hidden bg-[#120f0d] text-stone-100"
      onDoubleClick={handleResetCamera}
    >
      {/* 3D WebGL Canvas Scene */}
      <LabyrinthScene
        maze={currentMaze}
        controlMode={controlMode}
        keys={combinedKeys}
        virtualTilt={virtualTilt}
        resetMarbleCount={resetMarbleCount}
        autoRotate={autoRotate}
        slowMo={slowMo}
        lightingPreset={lightingPreset}
        colliderMode={colliderMode}
        onGoalReached={handleGoalReached}
        gameStatus={gameStatus}
        onResetCameraTrigger={(fn) => {
          resetCameraFnRef.current = fn;
        }}
      />

      {/* Interactive HUD Overlay */}
      <HUD
        controlMode={controlMode}
        onToggleControlMode={setControlMode}
        onResetMarble={handleResetMarble}
        onResetCamera={handleResetCamera}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((a) => !a)}
        slowMo={slowMo}
        onToggleSlowMo={() => setSlowMo((s) => !s)}
        lightingPreset={lightingPreset}
        onChangeLighting={setLightingPreset}
        colliderMode={colliderMode}
        onToggleColliderMode={setColliderMode}
        currentMaze={currentMaze}
        onSelectMaze={handleSelectMaze}
        onGenerateNewMaze={handleGenerateNewMaze}
        gameStatus={gameStatus}
        completionTime={completionTime}
        mazeStartTime={mazeStartTime}
        onPlayAgain={handleResetMarble}
        onVirtualTiltChange={setVirtualTilt}
        onVirtualKeySimulate={setVirtualKeys}
      />
    </main>
  );
}

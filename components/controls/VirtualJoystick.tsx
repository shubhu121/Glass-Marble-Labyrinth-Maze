'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualJoystickProps {
  onTiltChange: (tilt: { x: number; z: number }) => void;
  onKeySimulate: (keys: { forward: boolean; backward: boolean; left: boolean; right: boolean }) => void;
  mode: 'board' | 'marble';
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onTiltChange,
  onKeySimulate,
  mode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const activeTouchId = useRef<number | null>(null);

  const radius = 46; // max joystick drag radius

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }

      setKnobPos({ x: dx, y: dy });

      // Normalized vector (-1 to 1)
      const normX = dx / radius;
      const normY = dy / radius;

      onTiltChange({ x: normX, z: normY });

      // Also simulate discrete directional keys for marble mode
      const threshold = 0.25;
      onKeySimulate({
        forward: normY < -threshold,
        backward: normY > threshold,
        left: normX < -threshold,
        right: normX > threshold,
      });
    },
    [onTiltChange, onKeySimulate]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updatePosition(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setKnobPos({ x: 0, y: 0 });
    onTiltChange({ x: 0, z: 0 });
    onKeySimulate({ forward: false, backward: false, left: false, right: false });
  };

  // Keyboard button presses helper for on-screen D-pad buttons
  const triggerDir = (dir: 'forward' | 'backward' | 'left' | 'right', active: boolean) => {
    onKeySimulate({
      forward: dir === 'forward' ? active : false,
      backward: dir === 'backward' ? active : false,
      left: dir === 'left' ? active : false,
      right: dir === 'right' ? active : false,
    });
    if (active) {
      const tx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const tz = dir === 'forward' ? -1 : dir === 'backward' ? 1 : 0;
      onTiltChange({ x: tx, z: tz });
      setKnobPos({ x: tx * (radius * 0.7), y: tz * (radius * 0.7) });
    } else {
      onTiltChange({ x: 0, z: 0 });
      setKnobPos({ x: 0, y: 0 });
    }
  };

  return (
    <div
      id="virtual-tilt-controller"
      className="flex flex-col items-center select-none touch-none"
    >
      <div className="text-[11px] font-medium tracking-wide uppercase text-amber-200/70 mb-1.5 flex items-center gap-1.5">
        <span>{mode === 'board' ? 'Tilt Pad' : 'Roll Pad'}</span>
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-28 h-28 rounded-full bg-stone-900/80 backdrop-blur-md border border-amber-900/40 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing p-1"
        style={{ touchAction: 'none' }}
      >
        {/* Subtle grid indicators */}
        <div className="absolute inset-0 rounded-full border border-stone-700/30" />
        <div className="absolute w-full h-[1px] bg-stone-700/20 top-1/2 -translate-y-1/2" />
        <div className="absolute h-full w-[1px] bg-stone-700/20 left-1/2 -translate-x-1/2" />

        {/* Direction labels */}
        <ChevronUp className="absolute top-1 text-stone-400/50 w-3.5 h-3.5" />
        <ChevronDown className="absolute bottom-1 text-stone-400/50 w-3.5 h-3.5" />
        <ChevronLeft className="absolute left-1 text-stone-400/50 w-3.5 h-3.5" />
        <ChevronRight className="absolute right-1 text-stone-400/50 w-3.5 h-3.5" />

        {/* Dynamic Knob */}
        <div
          className="w-11 h-11 rounded-full bg-gradient-to-b from-amber-600 to-amber-800 shadow-md border border-amber-400/40 flex items-center justify-center transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-amber-200/40 shadow-inner" />
        </div>
      </div>
    </div>
  );
};

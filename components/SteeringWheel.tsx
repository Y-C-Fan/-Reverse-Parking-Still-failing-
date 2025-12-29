import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftToLine, ArrowRightToLine, Circle, RotateCcw } from 'lucide-react';

interface SteeringWheelProps {
  angle: number; // Current steering angle in radians (Physics angle)
  maxAngle: number; // Max physics angle
  onChange: (angle: number) => void;
}

const SteeringWheel: React.FC<SteeringWheelProps> = ({ angle, maxAngle, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const startAngleRef = useRef(0);

  // Configuration
  const MAX_TURNS = 1.5; // 1.5 turns left, 1.5 turns right (Total 3 turns lock-to-lock)
  const MAX_VISUAL_DEG = MAX_TURNS * 360; 
  
  // Mapping: Max Physics Angle <-> Max Visual Angle
  const currentPhysicsDeg = (angle * 180) / Math.PI;
  const maxPhysicsDeg = (maxAngle * 180) / Math.PI;
  
  // Calculate visual rotation based on physics ratio
  const currentVisualRotation = (currentPhysicsDeg / maxPhysicsDeg) * MAX_VISUAL_DEG;

  const displayTurns = (currentVisualRotation / 360).toFixed(1);
  const isMaxRight = currentVisualRotation >= MAX_VISUAL_DEG - 1; // Tolerance
  const isMaxLeft = currentVisualRotation <= -MAX_VISUAL_DEG + 1;

  const handleStart = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return;
    setIsDragging(true);
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    startAngleRef.current = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !wheelRef.current) return;
    
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const currentMouseAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    let delta = currentMouseAngle - startAngleRef.current;
    
    // Handle wrap around for continuity
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    startAngleRef.current = currentMouseAngle;

    // Apply delta to current rotation
    let newVisual = currentVisualRotation + delta;
    
    // Clamp visual rotation to simulate physical lock
    newVisual = Math.max(-MAX_VISUAL_DEG, Math.min(MAX_VISUAL_DEG, newVisual));
    
    // Convert back to physics angle
    const newPhysics = (newVisual / MAX_VISUAL_DEG) * maxAngle;
    
    onChange(newPhysics);
  };

  const handleEnd = () => setIsDragging(false);

  // Quick Actions
  const setTurns = (t: number) => {
    const newVisual = t * 360;
    const clamped = Math.max(-MAX_VISUAL_DEG, Math.min(MAX_VISUAL_DEG, newVisual));
    const newPhysics = (clamped / MAX_VISUAL_DEG) * maxAngle;
    onChange(newPhysics);
  }

  // Effect for global events
  useEffect(() => {
    const onMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    
    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, currentVisualRotation]); // Depend on rotation to keep calculation fresh

  return (
    <div className="flex flex-col items-center gap-1 md:gap-2 select-none">
        {/* Status Text */}
        <div className="text-center font-mono text-sm mb-0.5 md:mb-1">
             <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-0.5">方向盘 (Steering)</div>
             <div className={`text-base md:text-lg font-bold transition-colors duration-200 
                ${Math.abs(Number(displayTurns)) < 0.1 ? 'text-blue-400' : 
                  isMaxLeft || isMaxRight ? 'text-red-500' : 'text-white'}`}>
                {Number(displayTurns) > 0.05 ? "右打 (R) " : Number(displayTurns) < -0.05 ? "左打 (L) " : "回正 (Center)"} 
                {Math.abs(Number(displayTurns))} 圈
             </div>
        </div>

        {/* Wheel Container */}
        <div className="relative">
            <div 
                ref={wheelRef}
                className={`w-36 h-36 md:w-48 md:h-48 rounded-full border-[6px] md:border-[8px] shadow-2xl relative touch-none transition-transform duration-75 ease-out
                    ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}
                    ${isMaxLeft || isMaxRight ? 'border-red-600/60' : 'border-gray-700'}
                    bg-gray-800
                `}
                style={{ transform: `rotate(${currentVisualRotation}deg)` }}
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            >
                {/* Rim Texture */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-600/30 opacity-30 pointer-events-none"></div>

                {/* Center Hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 bg-gray-700 rounded-full shadow-inner flex items-center justify-center z-10">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center">
                        <div className="w-6 h-1 md:w-8 md:h-1.5 bg-blue-600/50 rounded-full"></div>
                    </div>
                </div>

                {/* Spokes */}
                <div className="absolute top-1/2 left-0 w-full h-3 md:h-4 bg-gray-700 -translate-y-1/2 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 w-3 md:w-4 h-1/2 bg-gray-700 -translate-x-1/2 rounded-b-lg origin-top"></div>

                {/* Top Dead Center Marker (Tape) */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3 md:w-4 h-6 md:h-8 rounded-b shadow-md z-20 transition-colors
                    ${Math.abs(Number(displayTurns)) < 0.1 ? 'bg-blue-500' : 'bg-yellow-500'}
                `}></div>
            </div>
            
             {/* Limit Indicators */}
             {isMaxLeft && <div className="absolute left-[-10px] md:left-[-20px] top-1/2 -translate-y-1/2 text-red-500 font-bold text-[10px] md:text-xs animate-pulse">LOCK</div>}
             {isMaxRight && <div className="absolute right-[-10px] md:right-[-20px] top-1/2 -translate-y-1/2 text-red-500 font-bold text-[10px] md:text-xs animate-pulse">LOCK</div>}
        </div>

        {/* Quick Controls */}
        <div className="flex gap-3 md:gap-4 w-full justify-center mt-1 md:mt-2">
            <button 
                onClick={() => setTurns(-MAX_TURNS)} 
                className="flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gray-800 hover:bg-gray-700 rounded-lg md:rounded-xl border border-gray-700 text-gray-400 hover:text-white active:bg-red-900/50 active:border-red-700 transition-all" 
                title="左打死 (Full Left)"
            >
                <ArrowLeftToLine size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="text-[9px] md:text-[10px] mt-0.5 scale-90 md:scale-100">左死</span>
            </button>
            <button 
                onClick={() => setTurns(0)} 
                className="flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gray-800 hover:bg-gray-700 rounded-lg md:rounded-xl border border-gray-700 text-gray-400 hover:text-white active:bg-blue-900/50 active:border-blue-700 transition-all" 
                title="回正 (Center)"
            >
                <Circle size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="text-[9px] md:text-[10px] mt-0.5 scale-90 md:scale-100">回正</span>
            </button>
            <button 
                onClick={() => setTurns(MAX_TURNS)} 
                className="flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gray-800 hover:bg-gray-700 rounded-lg md:rounded-xl border border-gray-700 text-gray-400 hover:text-white active:bg-red-900/50 active:border-red-700 transition-all" 
                title="右打死 (Full Right)"
            >
                <ArrowRightToLine size={16} className="md:w-[18px] md:h-[18px]" />
                <span className="text-[9px] md:text-[10px] mt-0.5 scale-90 md:scale-100">右死</span>
            </button>
        </div>
        <div className="text-[9px] md:text-[10px] text-gray-600">
           拖动方向盘或使用下方按钮
        </div>
    </div>
  );
};

export default SteeringWheel;
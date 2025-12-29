import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SteeringWheel from './components/SteeringWheel';
import { 
  WORLD_SIZE, INITIAL_CAR_STATE, DEFAULT_CAR_SIZE, DEFAULT_WHEEL_BASE, MAX_SPEED, MAX_STEERING_ANGLE,
  getEnvironment, updateCarPhysics, checkCollision, checkSuccess, getCarCorners, getPredictivePath 
} from './simulationUtils';
import { CarState, GameStatus } from './types';
import { getDrivingAdvice } from './services/geminiService';
import { RotateCcw, MessageSquare, Info, Car, Sliders, Eye, Map, Gauge } from 'lucide-react';

const App: React.FC = () => {
  // Settings State
  const [carWidth, setCarWidth] = useState(DEFAULT_CAR_SIZE.width);
  const [spotWidth, setSpotWidth] = useState(65);
  
  // View State: '2D' (Top Down Fixed) or '3D' (Follow Cam Tilted)
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');

  // Derived Environment
  const { parkingSpot, walls } = useMemo(() => getEnvironment(spotWidth), [spotWidth]);
  const currentCarSize = useMemo(() => ({ width: carWidth, height: DEFAULT_CAR_SIZE.height }), [carWidth]);

  // Game State
  const [carState, setCarState] = useState<CarState>(INITIAL_CAR_STATE);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING);
  
  // Realistic Controls State
  const [gear, setGear] = useState<'P' | 'R' | 'N' | 'D'>('P');
  const [isGasPressed, setIsGasPressed] = useState(false);
  const [isBrakePressed, setIsBrakePressed] = useState(false);
  
  const [aiAdvice, setAiAdvice] = useState<string>("你好！我是你的老司机教练。现在车辆在 P 档 (驻车)。请先挂入倒挡 (R)，然后轻踩油门开始倒车入库！");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showPredictivePath, setShowPredictivePath] = useState(true);

  // Refs
  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const carStateRef = useRef<CarState>(INITIAL_CAR_STATE);

  useEffect(() => {
    carStateRef.current = carState;
  }, [carState]);

  // Loop
  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      
      if (gameStatus === GameStatus.PLAYING) {
        const currentSpeed = carStateRef.current.speed;
        let targetSpeed = 0;
        let physicsResponse = 0.05; // How fast speed changes (inertia/friction)

        // Realistic Transmission Logic
        if (gear === 'P') {
            // Parking brake engaged - stop immediately
            targetSpeed = 0;
            physicsResponse = 0.5;
        } else if (isBrakePressed) {
            // Brakes applied - stop quickly
            targetSpeed = 0;
            physicsResponse = 0.2; 
        } else if (gear === 'N') {
            // Neutral - coasting (low friction)
            targetSpeed = 0;
            physicsResponse = 0.01;
        } else if (isGasPressed) {
            // Accelerating
            physicsResponse = 0.05; // Acceleration curve
            if (gear === 'D') targetSpeed = MAX_SPEED;
            if (gear === 'R') targetSpeed = -MAX_SPEED;
        } else {
            // In gear but no pedals - Engine braking / Creep (optional, simplified here to drag)
            targetSpeed = 0;
            physicsResponse = 0.02;
        }

        // Apply physics
        const newSpeed = currentSpeed + (targetSpeed - currentSpeed) * (physicsResponse * deltaTime * 60);

        const nextState = updateCarPhysics({
          ...carStateRef.current,
          speed: newSpeed
        }, deltaTime, DEFAULT_WHEEL_BASE);

        if (checkCollision(nextState, currentCarSize, walls)) {
          setGameStatus(GameStatus.CRASHED);
          handleAiAdvice(nextState, GameStatus.CRASHED, "撞车了");
        } else if (checkSuccess(nextState, currentCarSize, parkingSpot)) {
          // Only count as parked if almost stopped and in P (optional, but let's just say stopped is enough)
          if (Math.abs(newSpeed) < 0.1) {
             setGameStatus(GameStatus.PARKED);
             handleAiAdvice(nextState, GameStatus.PARKED, "停好了");
          }
        }

        if (gameStatus === GameStatus.PLAYING) {
            setCarState(nextState);
            carStateRef.current = nextState;
        }
      }
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [gameStatus, gear, isGasPressed, isBrakePressed, walls, currentCarSize, parkingSpot]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const handleReset = () => {
    setCarState(INITIAL_CAR_STATE);
    carStateRef.current = INITIAL_CAR_STATE;
    setGameStatus(GameStatus.PLAYING);
    setGear('P');
    setIsGasPressed(false);
    setIsBrakePressed(false);
    setAiAdvice("重新开始！请先挂挡。");
  };

  const handleSteeringChange = (angle: number) => {
    if (gameStatus !== GameStatus.PLAYING) return;
    const newState = { ...carStateRef.current, steeringAngle: angle };
    setCarState(newState);
    carStateRef.current = newState;
  };

  const handleAiAdvice = async (state: CarState, status: GameStatus, action: string) => {
    setIsLoadingAi(true);
    const advice = await getDrivingAdvice(state, parkingSpot, status, action);
    setAiAdvice(advice);
    setIsLoadingAi(false);
  };

  const manualAskAi = () => {
    handleAiAdvice(carStateRef.current, gameStatus, "用户主动询问");
  };

  // Rendering Helper: Xiaomi SU7 Ultra Model
  const renderCar = (isShadow: boolean = false) => {
    const colorBody = gameStatus === GameStatus.CRASHED ? "#EF4444" : "#FACC15"; // Lightning Yellow
    const colorStroke = gameStatus === GameStatus.CRASHED ? "#991B1B" : "#CA8A04";
    const yOffset = isShadow ? 4 : 0; // "Thickness"
    const fillColor = isShadow ? "#854D0E" : colorBody; // Darker yellow for side/shadow
    
    if (isShadow && viewMode === '2D') return null;

    return (
        <g transform={`translate(0, ${yOffset})`}>
            {/* Wheels (Thicker in 3D) */}
            <rect x={DEFAULT_WHEEL_BASE/2 - 4} y={-currentCarSize.height/2} width="12" height="6" fill="#111" rx="2" 
                transform={`rotate(${(carState.steeringAngle * 180) / Math.PI}, ${DEFAULT_WHEEL_BASE/2}, ${-currentCarSize.height/2 + 3})`}
            />
            <rect x={DEFAULT_WHEEL_BASE/2 - 4} y={currentCarSize.height/2 - 6} width="12" height="6" fill="#111" rx="2" 
                transform={`rotate(${(carState.steeringAngle * 180) / Math.PI}, ${DEFAULT_WHEEL_BASE/2}, ${currentCarSize.height/2 - 3})`}
            />
            <rect x={-DEFAULT_WHEEL_BASE/2 - 4} y={-currentCarSize.height/2} width="12" height="6" fill="#111" rx="2" />
            <rect x={-DEFAULT_WHEEL_BASE/2 - 4} y={currentCarSize.height/2 - 6} width="12" height="6" fill="#111" rx="2" />

             {/* Main Body Chassis */}
             <path 
                d={`
                M ${-currentCarSize.width/2} ${-currentCarSize.height/2 + 2}
                Q ${-currentCarSize.width/2} ${-currentCarSize.height/2} ${-currentCarSize.width/2 + 2} ${-currentCarSize.height/2}
                L ${currentCarSize.width/2 - 4} ${-currentCarSize.height/2 + 1}
                Q ${currentCarSize.width/2} ${-currentCarSize.height/2 + 2} ${currentCarSize.width/2} 0
                Q ${currentCarSize.width/2} ${currentCarSize.height/2 - 2} ${currentCarSize.width/2 - 4} ${currentCarSize.height/2 - 1}
                L ${-currentCarSize.width/2 + 2} ${currentCarSize.height/2}
                Q ${-currentCarSize.width/2} ${currentCarSize.height/2} ${-currentCarSize.width/2} ${currentCarSize.height/2 - 2}
                Z
                `}
                fill={fillColor}
                stroke={isShadow ? "none" : colorStroke}
                strokeWidth="1"
            />

            {/* Top Details (Only on main layer) */}
            {!isShadow && (
                <>
                     {/* Racing Stripes */}
                     {gameStatus !== GameStatus.CRASHED && (
                        <g opacity="0.9">
                            <rect x={-currentCarSize.width/2 + 2} y={-4} width={currentCarSize.width - 4} height={2} fill="#111827" />
                            <rect x={-currentCarSize.width/2 + 2} y={2} width={currentCarSize.width - 4} height={2} fill="#111827" />
                        </g>
                    )}

                    {/* Cabin */}
                    <path d={`M ${-currentCarSize.width/2 + 10} ${-currentCarSize.height/2 + 3} L ${currentCarSize.width/2 - 12} ${-currentCarSize.height/2 + 4} Q ${currentCarSize.width/2 - 10} 0 ${currentCarSize.width/2 - 12} ${currentCarSize.height/2 - 4} L ${-currentCarSize.width/2 + 10} ${currentCarSize.height/2 - 3} Z`} fill="#1F2937" />
                    {/* Glass */}
                    <path d={`M ${currentCarSize.width/2 - 12} ${-currentCarSize.height/2 + 4} L ${currentCarSize.width/2 - 8} ${-currentCarSize.height/2 + 3} Q ${currentCarSize.width/2 - 6} 0 ${currentCarSize.width/2 - 8} ${currentCarSize.height/2 - 3} L ${currentCarSize.width/2 - 12} ${currentCarSize.height/2 - 4} Z`} fill="#374151" />
                    <path d={`M ${-currentCarSize.width/2 + 10} ${-currentCarSize.height/2 + 3} L ${-currentCarSize.width/2 + 6} ${-currentCarSize.height/2 + 4} Q ${-currentCarSize.width/2 + 4} 0 ${-currentCarSize.width/2 + 6} ${currentCarSize.height/2 - 4} L ${-currentCarSize.width/2 + 10} ${currentCarSize.height/2 - 3} Z`} fill="#374151" />

                    {/* Spoiler */}
                    <path d={`M ${-currentCarSize.width/2 - 5} ${-currentCarSize.height/2 - 4} L ${-currentCarSize.width/2 - 1} ${-currentCarSize.height/2 - 4} L ${-currentCarSize.width/2 - 1} ${currentCarSize.height/2 + 4} L ${-currentCarSize.width/2 - 5} ${currentCarSize.height/2 + 4} Z`} fill="#111827" />
                    <rect x={-currentCarSize.width/2 - 2} y={-currentCarSize.height/2 + 4} width={3} height={currentCarSize.height - 8} fill="#374151" />

                    {/* Lights */}
                    <path d={`M ${currentCarSize.width/2 - 2} ${-currentCarSize.height/2 + 2} L ${currentCarSize.width/2} ${-currentCarSize.height/2 + 5} L ${currentCarSize.width/2 - 1} ${-currentCarSize.height/2 + 1} Z`} fill="#E5E7EB" />
                    <path d={`M ${currentCarSize.width/2 - 2} ${currentCarSize.height/2 - 2} L ${currentCarSize.width/2} ${currentCarSize.height/2 - 5} L ${currentCarSize.width/2 - 1} ${currentCarSize.height/2 - 1} Z`} fill="#E5E7EB" />
                    {/* Brake Lights - Active when braking */}
                    <rect x={-currentCarSize.width/2} y={-currentCarSize.height/2 + 2} width={1.5} height={currentCarSize.height - 4} fill={isBrakePressed ? "#FF0000" : "#991B1B"} opacity="0.9" style={{ filter: isBrakePressed ? 'drop-shadow(0 0 4px red)' : 'none' }} />
                </>
            )}
        </g>
    )
  }

  // Calculate predictive path based on GEAR (intent)
  const predictivePath = useMemo(() => {
     if (!showPredictivePath || gear === 'P' || gear === 'N') return [];
     return getPredictivePath(carState, DEFAULT_WHEEL_BASE, gear === 'D' ? 1 : -1);
  }, [showPredictivePath, gear, carState]);


  // View Calculation
  const worldTransform = useMemo(() => {
    if (viewMode === '2D') return '';
    const carDeg = (carState.rotation * 180) / Math.PI;
    const rotationAdjustment = -carDeg - 90; 
    return `rotate(${rotationAdjustment}, ${carState.x}, ${carState.y})`;
  }, [viewMode, carState]);

  const viewBox = useMemo(() => {
      if (viewMode === '2D') return `0 0 ${WORLD_SIZE.width} ${WORLD_SIZE.height}`;
      const range = 500;
      return `${carState.x - range/2} ${carState.y - range/2} ${range} ${range}`;
  }, [viewMode, carState.x, carState.y]);


  return (
    // Use dvh (Dynamic Viewport Height) for mobile browser support
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-gray-900 text-white overflow-hidden touch-none">
      
      {/* LEFT: Simulation Area */}
      <div className="relative flex-grow h-[55dvh] md:h-full bg-gray-900 overflow-hidden flex items-center justify-center border-b md:border-r border-gray-700">
        
        {/* Top Bar Controls */}
        <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap max-w-[80%]">
            <div className={`px-4 py-2 rounded-lg font-bold shadow-lg backdrop-blur-md flex items-center gap-2 ${
                gameStatus === GameStatus.PLAYING ? 'bg-blue-600/80' :
                gameStatus === GameStatus.CRASHED ? 'bg-red-600/90' : 'bg-green-600/90'
            }`}>
                {gameStatus === GameStatus.PLAYING && "练习中"}
                {gameStatus === GameStatus.CRASHED && "发生碰撞!"}
                {gameStatus === GameStatus.PARKED && "完美入库!"}
            </div>
             <button onClick={handleReset} className="p-2 bg-gray-700/80 rounded-lg hover:bg-gray-600/80 transition shadow-lg" title="重置">
                <RotateCcw size={20} />
             </button>
             
             {/* View Toggle */}
             <button 
                onClick={() => setViewMode(prev => prev === '2D' ? '3D' : '2D')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold shadow-lg transition-all ${
                    viewMode === '3D' ? 'bg-yellow-500 text-black' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                }`}
                title="切换视角"
             >
                {viewMode === '2D' ? <Map size={20} /> : <Eye size={20} />}
                <span className="text-xs">{viewMode === '2D' ? '2D 俯视' : '3D 追尾'}</span>
             </button>
        </div>

        {/* 3D Scene Container */}
        <div className={`w-full h-full transition-all duration-700 ease-in-out ${viewMode === '3D' ? 'perspective-[600px]' : ''}`}>
             <div className={`w-full h-full transition-transform duration-500 ease-out transform-style-3d ${viewMode === '3D' ? 'rotate-x-50 origin-center' : ''}`}>
                <svg 
                    viewBox={viewBox}
                    className={`w-full h-full object-contain ${viewMode === '2D' ? 'bg-gray-900/50' : 'bg-gray-800'}`} 
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                        </pattern>
                        <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="0" x2="0" y2="10" style={{stroke:'rgba(255,255,255,0.1)', strokeWidth:2}} />
                        </pattern>
                    </defs>

                    {/* World Group that rotates in 3D Mode */}
                    <g 
                        transform={worldTransform} 
                        style={{ transition: 'transform 0.1s linear' }} 
                    >
                        {/* Background Grid - Infinite feel */}
                        <rect x={-2000} y={-2000} width={4000} height={4000} fill="url(#grid)" />

                        {/* Render Walls */}
                        {walls.map((wall, i) => {
                            const isCar = wall.y > 0 && wall.y < WORLD_SIZE.height - 50 && wall.width > 50;
                            // Fake 3D Extrusion for walls in 3D mode
                            const wallHeight = viewMode === '3D' ? 15 : 0;

                            return (
                                <g key={`wall-${i}`}>
                                    {/* Wall Side (Extrusion) */}
                                    {viewMode === '3D' && (
                                        <rect 
                                            x={wall.x} y={wall.y + wall.height} 
                                            width={wall.width} height={wallHeight} 
                                            fill="#111827" 
                                        />
                                    )}
                                    {/* Wall Top */}
                                    <rect 
                                        x={wall.x} y={wall.y} width={wall.width} height={wall.height} 
                                        fill={isCar ? "#374151" : "#1F2937"} 
                                        stroke={isCar ? "#4B5563" : "#374151"} 
                                    />
                                    {isCar && (
                                        <>
                                            <rect x={wall.x} y={wall.y} width={wall.width} height={wall.height} fill="url(#diagonalHatch)" />
                                            <text 
                                                x={wall.x + wall.width/2} 
                                                y={wall.y + wall.height/2} 
                                                textAnchor="middle" 
                                                dominantBaseline="middle" 
                                                fill="rgba(255,255,255,0.2)" 
                                                fontSize="12"
                                                className="select-none pointer-events-none"
                                                transform={`rotate(${viewMode === '3D' ? 180 : 0}, ${wall.x + wall.width/2}, ${wall.y + wall.height/2})`}
                                            >
                                                别人的车
                                            </text>
                                        </>
                                    )}
                                </g>
                            );
                        })}

                        {/* Parking Spot */}
                        <g transform={`translate(${parkingSpot.x}, ${parkingSpot.y})`}>
                            <rect width={parkingSpot.width} height={parkingSpot.height} fill="rgba(59, 130, 246, 0.15)" stroke="#3B82F6" strokeWidth="2" strokeDasharray="5,5" />
                            <text x={parkingSpot.width/2} y={parkingSpot.height/2} textAnchor="middle" dominantBaseline="middle" fill="#3B82F6" fontSize="24" opacity="0.6" fontWeight="bold">P</text>
                        </g>

                        {/* Predictive Path - Dynamic Color based on Gear */}
                        {gameStatus === GameStatus.PLAYING && (
                            <polyline 
                                points={predictivePath.map(p => `${p.x},${p.y}`).join(' ')} 
                                fill="none" 
                                stroke={gear === 'D' ? "#38bdf8" : "#fbbf24"} // Blue for Drive, Yellow for Reverse
                                strokeWidth="2" 
                                strokeDasharray="4,4" 
                                opacity="0.6" 
                            />
                        )}

                        {/* Player Car - Layered for 3D effect */}
                        <g transform={`translate(${carState.x}, ${carState.y}) rotate(${(carState.rotation * 180) / Math.PI})`}>
                             {/* 1. Shadow / Thickness Layer */}
                             {renderCar(true)}
                             {/* 2. Main Body Layer */}
                             {renderCar(false)}
                        </g>
                    </g>
                </svg>
             </div>
             
             {/* Horizon Gradient for 3D mode */}
             {viewMode === '3D' && (
                 <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-gray-900 to-transparent pointer-events-none z-0"></div>
             )}
        </div>

        <div className="absolute bottom-4 left-4 pointer-events-none opacity-50 text-xs hidden md:block z-20">
           <div className="flex items-center gap-2">
               <span className={`w-4 h-0.5 border-dashed border-b ${gear === 'D' ? 'bg-blue-400' : gear === 'R' ? 'bg-yellow-400' : 'border-gray-500'}`}></span> 
               <span>
                  预测轨迹 
                  {gear === 'D' && ' (前进)'}
                  {gear === 'R' && ' (倒车)'}
                  {(gear === 'P' || gear === 'N') && ' (无动力)'}
               </span>
           </div>
        </div>
      </div>

      {/* RIGHT: Controls */}
      <div className="w-full md:w-96 flex flex-col bg-gray-900 border-l border-gray-800 shadow-2xl z-20">
        
        {/* Advice Panel */}
        <div className="p-4 bg-gray-800 border-b border-gray-700 min-h-[140px] flex flex-col shrink-0">
            <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold">
                <Car size={20} />
                <span>老司机 (Old Driver)</span>
            </div>
            <div className="flex-grow bg-gray-900/50 rounded p-3 text-sm leading-relaxed border border-gray-700 text-gray-300 relative">
               {isLoadingAi ? (
                   <div className="flex items-center gap-2 text-gray-500 animate-pulse">
                       <MessageSquare size={16} />
                       思考中...
                   </div>
               ) : (
                   aiAdvice
               )}
            </div>
        </div>

        {/* Settings Panel */}
        <div className="px-6 py-2 border-b border-gray-800 bg-gray-800/30">
            <div className="flex items-center gap-2 text-gray-400 mb-2 text-xs uppercase font-bold tracking-wider">
                <Sliders size={12} />
                难度 (Difficulty)
            </div>
            <div className="grid grid-cols-2 gap-4">
                <input 
                    type="range" min="35" max="50" step="1"
                    value={carWidth} onChange={(e) => setCarWidth(Number(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-blue-500"
                    title="Car Size"
                />
                <input 
                    type="range" min="45" max="80" step="1"
                    value={spotWidth} onChange={(e) => setSpotWidth(Number(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-green-500"
                    title="Spot Size"
                />
            </div>
        </div>

        {/* Main Controls - Redesigned */}
        <div className="flex-grow p-4 flex flex-col gap-4 relative overflow-y-auto">
            
            {/* Gear Selector */}
            <div className="w-full bg-gray-800 p-2 rounded-xl border border-gray-700 flex justify-between gap-2 shadow-inner">
                {['P', 'R', 'N', 'D'].map((g) => (
                    <button
                        key={g}
                        onClick={() => setGear(g as any)}
                        className={`flex-1 aspect-square md:aspect-auto md:h-12 rounded-lg font-black text-xl flex items-center justify-center transition-all shadow-lg
                            ${gear === g 
                                ? (g === 'R' ? 'bg-red-600 text-white shadow-red-900/50' : g === 'D' ? 'bg-blue-600 text-white shadow-blue-900/50' : 'bg-green-600 text-white shadow-green-900/50') 
                                : 'bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-gray-300'
                            }
                            active:scale-95
                        `}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {/* Steering */}
            <div className="flex justify-center py-2">
                <div className="transform scale-90 origin-center">
                    <SteeringWheel 
                        angle={carState.steeringAngle} 
                        maxAngle={MAX_STEERING_ANGLE}
                        onChange={handleSteeringChange}
                    />
                </div>
            </div>

            {/* Pedals */}
            <div className="grid grid-cols-5 gap-4 mt-auto">
                {/* Brake Pedal (Wide) */}
                <button
                    className={`col-span-3 h-28 rounded-xl border-b-8 active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center justify-center gap-1
                        ${isBrakePressed 
                            ? 'bg-red-700 border-red-900 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)]' 
                            : 'bg-gray-700 border-gray-800 text-gray-400 hover:bg-gray-600'
                        }
                    `}
                    onMouseDown={() => setIsBrakePressed(true)}
                    onMouseUp={() => setIsBrakePressed(false)}
                    onMouseLeave={() => setIsBrakePressed(false)}
                    onTouchStart={(e) => { e.preventDefault(); setIsBrakePressed(true); }}
                    onTouchEnd={(e) => { e.preventDefault(); setIsBrakePressed(false); }}
                >
                    <div className="w-16 h-1 bg-gray-900/30 rounded-full mb-2"></div>
                    <div className="w-16 h-1 bg-gray-900/30 rounded-full mb-2"></div>
                    <span className="text-lg font-black uppercase tracking-wider">Brake</span>
                    <span className="text-[10px] text-gray-400">刹车</span>
                </button>

                {/* Gas Pedal (Tall) */}
                <button
                    className={`col-span-2 h-28 rounded-xl border-b-8 active:border-b-0 active:translate-y-2 transition-all flex flex-col items-center justify-center gap-1
                        ${isGasPressed 
                            ? 'bg-zinc-300 border-zinc-500 text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]' 
                            : 'bg-zinc-700 border-zinc-900 text-zinc-400 hover:bg-zinc-600'
                        }
                    `}
                    style={{ backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent)', backgroundSize: '10px 10px' }}
                    onMouseDown={() => setIsGasPressed(true)}
                    onMouseUp={() => setIsGasPressed(false)}
                    onMouseLeave={() => setIsGasPressed(false)}
                    onTouchStart={(e) => { e.preventDefault(); setIsGasPressed(true); }}
                    onTouchEnd={(e) => { e.preventDefault(); setIsGasPressed(false); }}
                >
                    <span className="text-3xl font-black rotate-90 md:rotate-0 mt-2">|||</span>
                    <span className="text-[10px] font-bold mt-auto mb-2">油门</span>
                </button>
            </div>

            <div className="w-full flex items-center justify-center mt-2">
                 <button 
                    onClick={() => setShowPredictivePath(!showPredictivePath)}
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition py-2"
                 >
                     <Info size={14} />
                     {showPredictivePath ? "隐藏辅助线" : "显示辅助线"}
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
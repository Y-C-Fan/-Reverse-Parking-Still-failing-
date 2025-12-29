import { CarState, SimulationConfig, Point, Size, Wall, ParkingSpot } from './types';

// Constants for defaults
export const DEFAULT_CAR_SIZE: Size = { width: 40, height: 22 };
export const DEFAULT_WHEEL_BASE = 26;
export const MAX_STEERING_ANGLE = Math.PI / 4; // 45 degrees
export const MAX_SPEED = 2;
export const WORLD_SIZE: Size = { width: 800, height: 600 };

export const INITIAL_CAR_STATE: CarState = {
  x: 200,
  y: 350, // Moved down slightly to give more approach room given the spot is now "flush"
  rotation: 0, // Facing East
  steeringAngle: 0,
  speed: 0,
};

// Generate environment based on settings
export const getEnvironment = (spotWidth: number) => {
  const spotHeight = 100;
  // Align everything to a "parking row" starting at Y=50
  // Top curb is 0-50. Parking spots occupy 50-150.
  const rowStartY = 50; 
  
  // Center the spot in the world
  const spotCenterX = WORLD_SIZE.width / 2;

  const parkingSpot: ParkingSpot = {
    x: spotCenterX - spotWidth / 2,
    y: rowStartY,
    width: spotWidth,
    height: spotHeight
  };

  const gap = 5; // Small gap between parking lines/cars
  const neighborWidth = 200; // Make neighbors wide enough to fill the sides effectively
  const neighborHeight = spotHeight;

  const walls: Wall[] = [
    // Top boundary (The Curb/Wall behind the spots)
    { x: 0, y: 0, width: WORLD_SIZE.width, height: 50 },
    // Bottom boundary
    { x: 0, y: WORLD_SIZE.height - 50, width: WORLD_SIZE.width, height: 50 },
    // Left boundary
    { x: 0, y: 0, width: 50, height: WORLD_SIZE.height },
    // Right boundary
    { x: WORLD_SIZE.width - 50, y: 0, width: 50, height: WORLD_SIZE.height },
    
    // Left Neighbor Car (Wall)
    { 
      x: parkingSpot.x - gap - neighborWidth, 
      y: rowStartY, 
      width: neighborWidth, 
      height: neighborHeight 
    },
    // Right Neighbor Car (Wall)
    { 
      x: parkingSpot.x + parkingSpot.width + gap, 
      y: rowStartY, 
      width: neighborWidth, 
      height: neighborHeight 
    },
  ];

  return { parkingSpot, walls };
};

// Get corners of a rotated rectangle
export const getCarCorners = (state: CarState, size: Size): Point[] => {
  const { x, y, rotation } = state;
  const { width, height } = size;
  
  const hw = width / 2;
  const hh = height / 2;
  
  const corners = [
    { x: hw, y: hh },   // Bottom Right
    { x: -hw, y: hh },  // Bottom Left
    { x: -hw, y: -hh }, // Top Left
    { x: hw, y: -hh },  // Top Right
  ];
  
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  return corners.map(p => ({
    x: x + (p.x * cos - p.y * sin),
    y: y + (p.x * sin + p.y * cos),
  }));
};

// Check if point is in rectangle
const isPointInRect = (p: Point, rect: Wall | ParkingSpot): boolean => {
  return p.x >= rect.x && p.x <= rect.x + rect.width &&
         p.y >= rect.y && p.y <= rect.y + rect.height;
};

export const checkCollision = (carState: CarState, carSize: Size, walls: Wall[]): boolean => {
  const corners = getCarCorners(carState, carSize);
  
  for (const corner of corners) {
    // Check walls
    for (const wall of walls) {
      if (isPointInRect(corner, wall)) return true;
    }
  }
  return false;
};

export const checkSuccess = (carState: CarState, carSize: Size, parkingSpot: ParkingSpot): boolean => {
  const corners = getCarCorners(carState, carSize);
  
  // Check if all corners are inside the parking spot
  // We use a slight margin for "success" visual feel, but strict for logic
  const isInside = corners.every(c => isPointInRect(c, parkingSpot));
  
  if (!isInside) return false;
  
  // Check alignment
  let angle = carState.rotation % (2 * Math.PI);
  if (angle < 0) angle += 2 * Math.PI;
  
  // Target is facing UP (-90deg / 270deg)
  const targetAngle = 1.5 * Math.PI; 
  const angleDiff = Math.abs(angle - targetAngle);
  const isAligned = angleDiff < 0.2 || Math.abs(angleDiff - 2 * Math.PI) < 0.2; 

  return isAligned;
};

export const updateCarPhysics = (state: CarState, dt: number, wheelBase: number): CarState => {
  const { speed, steeringAngle, rotation, x, y } = state;
  const L = wheelBase;

  // Prevent moving if speed is negligible
  if (Math.abs(speed) < 0.01) return state;

  const dist = speed * dt * 30; // Scale factor for pixel units
  
  const beta = dist / L * Math.tan(steeringAngle);
  
  let newRotation = rotation + beta;
  const newX = x + dist * Math.cos(newRotation);
  const newY = y + dist * Math.sin(newRotation);

  return {
    ...state,
    x: newX,
    y: newY,
    rotation: newRotation,
  };
};

// Calculate predictive path
export const getPredictivePath = (state: CarState, wheelBase: number, directionSign: number, steps: number = 30): Point[] => {
  const path: Point[] = [];
  
  // If the car is moving significantly, prioritize the actual physics speed direction.
  // If the car is stopped (or very slow), use the 'directionSign' (gear selection) to simulate the path.
  // directionSign: 1 for Drive, -1 for Reverse
  const simSpeed = Math.abs(state.speed) > 0.1 ? state.speed : directionSign * 1.5; 

  let tempState = { ...state, speed: simSpeed };

  for (let i = 0; i < steps; i++) {
    tempState = updateCarPhysics(tempState, 0.5, wheelBase); // 0.5s steps
    path.push({ x: tempState.x, y: tempState.y });
  }
  return path;
};

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CarState {
  x: number; // Center x
  y: number; // Center y
  rotation: number; // Radians, 0 points East (Right)
  steeringAngle: number; // Radians, positive is Right turn usually, but we'll map standard car logic
  speed: number;
}

export interface SimulationConfig {
  carSize: Size;
  wheelBase: number;
  maxSteeringAngle: number;
  maxSpeed: number;
}

export enum GameStatus {
  PLAYING = 'PLAYING',
  CRASHED = 'CRASHED',
  PARKED = 'PARKED',
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParkingSpot {
  x: number;
  y: number;
  width: number;
  height: number;
}

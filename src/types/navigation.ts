import { Incident } from './index';

export type TransportMode = 'walking' | 'driving';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
  maneuverModifier?: string;
  streetName?: string;
}

export interface PedestrianRoute {
  id: string;
  name: string;
  mode: TransportMode;
  distanceMeters: number;
  durationMinutes: number;
  formattedDuration: string;
  formattedDistance: string;
  estimatedArrival: string;
  coordinates: RouteCoordinate[];
  steps: RouteStep[];
  isSafe: boolean;
  hazardsAvoided: Incident[];
  hazardsOnRoute: Incident[];
  summary: string;
}

export type NavigationRoute = PedestrianRoute;

export interface NavigationState {
  isActive: boolean;
  destinationName: string;
  destinationCoord: RouteCoordinate;
  route: PedestrianRoute;
  mode: TransportMode;
  currentStepIndex: number;
  distanceRemainingMeters: number;
  timeRemainingMinutes: number;
}

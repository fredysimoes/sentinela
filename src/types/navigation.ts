import { Incident } from './index';

export type TransportMode = 'walking' | 'driving' | 'transit';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface TransitLegInfo {
  lineName?: string;
  lineShortName?: string;
  headsign?: string;
  vehicleType?: 'bus' | 'subway' | 'train' | 'tram' | 'ferry' | 'funicular' | 'transit';
  operator?: string;
  departureStop?: string;
  arrivalStop?: string;
  departureTime?: string;
  arrivalTime?: string;
  numStops?: number;
  color?: string;
  textColor?: string;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
  maneuverModifier?: string;
  streetName?: string;
  location?: RouteCoordinate;
  transitInfo?: TransitLegInfo;
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
  transitLegsCount?: number;
  transitLines?: string[];
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
  isSimulation?: boolean;
}

export interface RouteSimulationState {
  isActive: boolean;
  route: PedestrianRoute;
  currentStepIndex: number;
  isPlaying: boolean;
  originName: string;
  destinationName: string;
}

import { Incident } from './index';

export type TransportMode = 'walking' | 'driving' | 'transit';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface StopArrivalPrediction {
  routeShortName: string;
  headsign: string;
  arrivalMinutes: number;
  delayMinutes?: number;
  status?: string;
  color?: string;
  textColor?: string;
  estimatedArrivalTime?: string;
}

export interface TransitStop {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  operator?: string;
  distanceMeters?: number;
}

export interface TransitLegInfo {
  lineName?: string;
  lineShortName?: string;
  headsign?: string;
  vehicleType?: 'bus' | 'subway' | 'train' | 'tram' | 'ferry' | 'funicular' | 'transit';
  operator?: string;
  departureStop?: string;
  departureStopCode?: string;
  arrivalStop?: string;
  arrivalStopCode?: string;
  departureTime?: string;
  arrivalTime?: string;
  numStops?: number;
  color?: string;
  textColor?: string;
  waitingMinutes?: number;
  realtimeArrivalMinutes?: number;
  delayMinutes?: number;
  realtimeStatus?: string;
  upcomingArrivals?: StopArrivalPrediction[];
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
  maneuverModifier?: string;
  streetName?: string;
  location?: RouteCoordinate;
  fromLocation?: RouteCoordinate;
  toLocation?: RouteCoordinate;
  coordinates?: RouteCoordinate[];
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

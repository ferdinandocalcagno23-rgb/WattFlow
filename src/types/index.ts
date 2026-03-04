// Add Web Bluetooth API types to the global scope
declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }

  interface Bluetooth {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
    acceptAllDevices?: boolean;
  }

  interface BluetoothLEScanFilter {
    name?: string;
    namePrefix?: string;
    services?: BluetoothServiceUUID[];
  }

  type BluetoothServiceUUID = number | string;

  interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    watchAdvertisements(): Promise<void>;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    uuid: string;
    device: BluetoothDevice;
    isPrimary: boolean;
    getCharacteristic(characteristic: BluetoothServiceUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    service: BluetoothRemoteGATTService;
    uuid: string;
    properties: BluetoothCharacteristicProperties;
    value?: DataView;
    getDescriptor(descriptor: BluetoothServiceUUID): Promise<BluetoothRemoteGATTDescriptor>;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  }

  interface BluetoothCharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
    reliableWrite: boolean;
    writableAuxiliaries: boolean;
  }

  interface BluetoothRemoteGATTDescriptor {
    characteristic: BluetoothRemoteGATTCharacteristic;
    uuid: string;
    value?: DataView;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
  }

  interface WakeLock {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  }

  interface WakeLockSentinel extends EventTarget {
    readonly released: boolean;
    readonly type: 'screen';
    release(): Promise<void>;
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null;
  }
}

export interface BluetoothDeviceState {
  isConnected: boolean;
  name: string | null;
  device: BluetoothDevice | null;
}

export interface TrainerData {
  power: number;
  cadence: number;
  speed: number;
}

export interface HeartRateData {
  heartRate: number;
}

export enum ControlMode {
  MANUAL = 'MANUAL',
  ERG = 'ERG',
  WORKOUT = 'WORKOUT'
}

export type IntervalType = 'steady' | 'ramp';

export interface IntervalStep {
  id: string;
  type: IntervalType;
  duration: number; // seconds
  targetPower: number; // watts (end power for ramps)
  startPower?: number; // watts (only for ramps)
  description?: string;
  cadence?: number;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  steps: IntervalStep[];
  totalDuration: number;
}

export type RawDataPoint = {
  time: number;
  power: number;
  cadence: number;
  heartRate: number;
  speed: number;
};

export interface WorkoutSessionState {
  isActive: boolean;
  currentStepIndex: number;
  elapsedTimeInStep: number;
  totalElapsedTime: number;
  isPaused: boolean;
  rawData: RawDataPoint[];
  startTime: number;
}

export interface StravaTokenData {
  token_type: 'Bearer';
  expires_at: number; // Milliseconds from epoch
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: object;
}

// For Dexie
export interface WorkoutRecording {
  id?: number;
  profileId: number; // ID of the user who performed the workout
  name: string;
  date: Date;
  duration: number; // total seconds
  avgPower: number;
  status: 'pending' | 'synced';
  stravaId?: string;
  steps: IntervalStep[];
  rawData: RawDataPoint[];
}

export interface UserProfile {
  id?: number;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // kg
  height: number; // cm
  ftp: number; // watts
  experience: 'beginner' | 'intermediate' | 'advanced';
  trainingFrequency: number; // days per week
  trainingHours: number; // hours per week
  isDefault?: boolean;
}

export interface Metrics {
  power: number;
  cadence: number;
  heartRate: number;
}

export interface WorkoutBlock {
  id: string;
  zone: string;
  duration: number;
  targetPower: number;
}

export interface CalculatedPowerZone {
  percentage: [number, number];
  color: string;
  label: string;
  watts: [number, number];
}

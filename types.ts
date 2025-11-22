
export enum VehicleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  LATE_JUSTIFIED = 'LATE_JUSTIFIED',
  LATE_NOT_JUSTIFIED = 'LATE_NOT_JUSTIFIED',
  CANCELLED = 'CANCELLED', // Cancelado (Soft Delete)
}

export enum JustificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', // Procedente
  REJECTED = 'REJECTED', // Improcedente
}

export interface Unit {
  id: string;
  name: string;
  location: string;
  alarmIntervalMinutes: number;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'unit';
  unitId?: string; // Obrigatório se role === 'unit'
}

export interface Employee {
  id: string;
  name: string;
  unitId: string;
  active: boolean; // Soft Delete flag
  workSchedule?: {
    days: string[]; // ['Seg', 'Ter', 'Qua', ...]
    startTime: string; // "08:00"
    endTime: string;   // "18:00"
  };
}

export interface TripStop {
  unitId: string;
  type: 'ORIGIN' | 'INTERMEDIATE' | 'DESTINATION';
  eta: string; // ISO string date/time specific for this stop
  status: VehicleStatus;
  serviceTimestamp?: string;
  servicedByEmployeeId?: string;
  servicePhotos?: string[];
}

export interface Vehicle {
  id: string;
  number: string;
  route: string; // Nome da Viagem/Itinerário
  stops: TripStop[]; // Array of stops (Origin -> [Intermediate] -> Destination)
  status?: VehicleStatus; // Status geral da viagem (ex: CANCELLED)
}

export interface Justification {
  id: string;
  vehicleId: string;
  unitId: string; // Unidade onde ocorreu o atraso/justificativa
  category: string;
  text: string;
  timestamp: string;
  status: JustificationStatus;
  adminComment?: string;
  aiAnalysis?: string;
}

export interface AlarmLog {
  id: string;
  vehicleId: string;
  unitId: string;
  triggeredAt: string;
  silencedBy: string;
  silencedAt: string;
}

export interface AppState {
  currentUser: { role: 'admin' | 'unit'; unitId?: string; username: string } | null;
  users: UserAccount[];
  units: Unit[];
  employees: Employee[];
  vehicles: Vehicle[];
  justifications: Justification[];
  alarms: AlarmLog[];
  googleSheetsUrl?: string;
}

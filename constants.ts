
import { Unit, Employee, Vehicle, VehicleStatus, AppState, UserAccount } from './types';

// URL Fixa do Google Apps Script (Deixe vazio para configurar via UI)
export const GLOBAL_APPS_SCRIPT_URL = ""; 

export const INITIAL_UNITS: Unit[] = [
  { id: 'u1', name: 'DEC - MATRIZ', location: 'Matriz Administrativa', alarmIntervalMinutes: 60 },
  { id: 'u2', name: 'DEC - ARAGUAIA SHOPPING', location: 'Goiânia, GO', alarmIntervalMinutes: 60 },
  { id: 'u3', name: 'DEC - SANTA RITA', location: 'Santa Rita, GO', alarmIntervalMinutes: 60 },
  { id: 'u4', name: 'DEC - CUIABÁ', location: 'Cuiabá, MT', alarmIntervalMinutes: 60 },
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: '02965740155', // Senha Administrativa Padrão
    role: 'admin'
  },
  {
    id: 'user-u1',
    username: 'matriz',
    password: '123',
    role: 'unit',
    unitId: 'u1'
  },
  {
    id: 'user-u2',
    username: 'araguaia',
    password: '123',
    role: 'unit',
    unitId: 'u2'
  },
  {
    id: 'user-u3',
    username: 'santarita',
    password: '123',
    role: 'unit',
    unitId: 'u3'
  }
];

export const JUSTIFICATION_REASONS = [
  "Trânsito Intenso / Congestionamento",
  "Problema Mecânico / Manutenção",
  "Pneu Furado",
  "Acidente no Trajeto",
  "Condições Climáticas (Chuva/Neblina)",
  "Atraso na Liberação (Origem)",
  "Fiscalização / Parada Policial",
  "Erro de Rota / Desvio",
  "Outros"
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'e-init-1',
    name: 'Alexandre Carlos',
    unitId: 'u1', 
    active: true,
    workSchedule: { days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], startTime: '08:00', endTime: '18:00' }
  },
  {
    id: 'e-init-2',
    name: 'Carlos Silva (Motorista)',
    unitId: 'u1',
    active: true,
    workSchedule: { days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], startTime: '08:00', endTime: '18:00' }
  },
  {
    id: 'e-init-3',
    name: 'Roberto Souza (Ajudante)',
    unitId: 'u1',
    active: true,
    workSchedule: { days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], startTime: '08:00', endTime: '18:00' }
  }
];

// Generate some vehicles for "Today"
const today = new Date();
const getTime = (hour: number, minute: number) => {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const INITIAL_VEHICLES: Vehicle[] = [
  { 
    id: 'v1', 
    number: 'V-1023', 
    route: 'Rota Expressa Matriz', 
    stops: [
      { unitId: 'u3', type: 'ORIGIN', eta: getTime(today.getHours() - 4, 0), status: VehicleStatus.COMPLETED, serviceTimestamp: getTime(today.getHours() - 4, 5) },
      { unitId: 'u1', type: 'DESTINATION', eta: getTime(today.getHours() - 1, 0), status: VehicleStatus.PENDING } // Late at Matriz
    ]
  },
  { 
    id: 'v2', 
    number: 'V-4099', 
    route: 'Abastecimento Shopping', 
    stops: [
        { unitId: 'u1', type: 'ORIGIN', eta: getTime(today.getHours() - 1, 0), status: VehicleStatus.COMPLETED, serviceTimestamp: getTime(today.getHours() - 1, 0) },
        { unitId: 'u2', type: 'DESTINATION', eta: getTime(today.getHours() + 2, 30), status: VehicleStatus.PENDING }
    ]
  },
  { 
    id: 'v3', 
    number: 'V-2022', 
    route: 'Transferência Intermediária', 
    stops: [
        { unitId: 'u1', type: 'ORIGIN', eta: getTime(today.getHours() - 5, 0), status: VehicleStatus.COMPLETED, serviceTimestamp: getTime(today.getHours() - 5, 10) },
        { unitId: 'u3', type: 'INTERMEDIATE', eta: getTime(today.getHours() - 2, 0), status: VehicleStatus.PENDING }, // Pending at Santa Rita
        { unitId: 'u4', type: 'DESTINATION', eta: getTime(today.getHours() + 5, 0), status: VehicleStatus.PENDING }
    ]
  }
];

export const INITIAL_STATE: AppState = {
  currentUser: null,
  users: INITIAL_USERS,
  units: INITIAL_UNITS,
  employees: INITIAL_EMPLOYEES,
  vehicles: INITIAL_VEHICLES,
  justifications: [],
  alarms: [],
  googleSheetsUrl: GLOBAL_APPS_SCRIPT_URL || ''
};

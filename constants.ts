
import { Unit, Employee, Vehicle, VehicleStatus, AppState, UserAccount } from './types';

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
    unitId: 'u1', // Vinculado à Matriz
    active: true,
    workSchedule: { days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], startTime: '08:00', endTime: '18:00' }
  },
  {
    id: 'e-init-2',
    name: 'Carlos Silva (Motorista)',
    unitId: 'u1', // Vinculado à Matriz
    active: true,
    workSchedule: { days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], startTime: '08:00', endTime: '18:00' }
  },
  {
    id: 'e-init-3',
    name: 'Roberto Souza (Ajudante)',
    unitId: 'u1', // Vinculado à Matriz
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
    eta: getTime(today.getHours() - 1, 0), // 1 hour ago (LATE)
    unitId: 'u1', 
    status: VehicleStatus.PENDING 
  },
  { 
    id: 'v2', 
    number: 'V-4099', 
    route: 'Abastecimento Shopping', 
    eta: getTime(today.getHours() + 2, 30), // In 2 hours
    unitId: 'u2', 
    status: VehicleStatus.PENDING 
  },
  { 
    id: 'v3', 
    number: 'V-2022', 
    route: 'Transferência Santa Rita', 
    eta: getTime(today.getHours() - 2, 0), // 2 hours ago (LATE)
    unitId: 'u3', 
    status: VehicleStatus.PENDING 
  },
  { 
    id: 'v4', 
    number: 'V-3301', 
    route: 'Logística Reversa Cuiabá', 
    eta: getTime(today.getHours() + 1, 0), 
    unitId: 'u4', 
    status: VehicleStatus.PENDING 
  },
  { 
    id: 'v5', 
    number: 'V-5500', 
    route: 'Coleta Araguaia', 
    eta: getTime(today.getHours(), 15), 
    unitId: 'u2', 
    status: VehicleStatus.PENDING 
  },
];

export const INITIAL_STATE: AppState = {
  currentUser: null,
  users: INITIAL_USERS,
  units: INITIAL_UNITS,
  employees: INITIAL_EMPLOYEES,
  vehicles: INITIAL_VEHICLES,
  justifications: [],
  alarms: [],
  googleSheetsUrl: ''
};

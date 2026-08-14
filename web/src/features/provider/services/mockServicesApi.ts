import type { Service, ServiceInput } from './types';

// Backend has no per-provider services CRUD endpoints yet, and this task
// is explicitly mock-only. Kept as its own module (not scattered inline)
// so swapping in real apiClient calls later only touches this one file.

let services: Service[] = [
  {
    id: '1',
    name: 'Standard Oil Change',
    category: 'Oil Change',
    price: 25,
    durationMinutes: 30,
    available: true,
  },
  {
    id: '2',
    name: 'Synthetic Oil Change',
    category: 'Oil Change',
    price: 45,
    durationMinutes: 30,
    available: true,
  },
  {
    id: '3',
    name: 'Flat Tire Repair',
    category: 'Tire Repair',
    price: 15,
    durationMinutes: 20,
    available: true,
  },
  {
    id: '4',
    name: 'Tire Rotation',
    category: 'Tire Repair',
    price: 20,
    durationMinutes: 25,
    available: true,
  },
  {
    id: '5',
    name: 'Battery Test',
    category: 'Battery Check',
    price: 10,
    durationMinutes: 15,
    available: true,
  },
  {
    id: '6',
    name: 'Battery Replacement',
    category: 'Battery Check',
    price: 90,
    durationMinutes: 40,
    available: false,
  },
  {
    id: '7',
    name: 'Brake Pad Inspection',
    category: 'Brake Inspection',
    price: 20,
    durationMinutes: 20,
    available: true,
  },
  {
    id: '8',
    name: 'Brake Fluid Change',
    category: 'Brake Inspection',
    price: 35,
    durationMinutes: 30,
    available: true,
  },
  {
    id: '9',
    name: 'Exterior Wash',
    category: 'Car Wash',
    price: 12,
    durationMinutes: 15,
    available: true,
  },
  {
    id: '10',
    name: 'Full Detail Wash',
    category: 'Car Wash',
    price: 55,
    durationMinutes: 60,
    available: true,
  },
  {
    id: '11',
    name: 'Pre-Purchase Inspection',
    category: 'General Inspection',
    price: 40,
    durationMinutes: 45,
    available: false,
  },
  {
    id: '12',
    name: 'Seasonal Checkup',
    category: 'General Inspection',
    price: 30,
    durationMinutes: 35,
    available: true,
  },
  {
    id: '13',
    name: 'AC System Check',
    category: 'General Inspection',
    price: 25,
    durationMinutes: 20,
    available: true,
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const FAILURE_CHANCE = 0.15;

function maybeFail(message: string) {
  if (Math.random() < FAILURE_CHANCE) {
    throw new Error(message);
  }
}

export async function fetchServices(
  mode: 'ready' | 'empty' | 'error' = 'ready',
): Promise<Service[]> {
  await delay(700);
  if (mode === 'error') throw new Error('Failed to load services');
  if (mode === 'empty') return [];
  return clone(services);
}

export async function createService(input: ServiceInput): Promise<Service> {
  await delay(500);
  maybeFail('Failed to create service');
  const created: Service = { ...input, id: crypto.randomUUID() };
  services = [created, ...services];
  return clone(created);
}

export async function updateService(id: string, input: ServiceInput): Promise<Service> {
  await delay(500);
  maybeFail('Failed to update service');
  services = services.map((service) => (service.id === id ? { ...input, id } : service));
  return { ...input, id };
}

export async function deleteService(id: string): Promise<void> {
  await delay(500);
  maybeFail('Failed to delete service');
  services = services.filter((service) => service.id !== id);
}

export async function setServiceAvailability(id: string, available: boolean): Promise<void> {
  await delay(400);
  maybeFail('Failed to update availability');
  services = services.map((service) => (service.id === id ? { ...service, available } : service));
}

// Qikzo — point-to-point on-demand delivery (Rapido/Uber-style).
// Users book a rider to pick up anything (groceries, food, medicines, parcels)
// from one location and drop it at another. Pricing is distance-based.

export type DeliveryCategory = {
  id: string;
  name: string;
  emoji: string;
  hint: string;
};

export const categories: DeliveryCategory[] = [
  { id: 'groceries', name: 'Groceries', emoji: '🛒', hint: 'Veggies, dairy, staples' },
  { id: 'food', name: 'Food', emoji: '🍔', hint: 'Restaurant / takeaway' },
  { id: 'medicines', name: 'Medicines', emoji: '💊', hint: 'Pharmacy pickup' },
  { id: 'parcel', name: 'Parcel', emoji: '📦', hint: 'Documents, packages' },
  { id: 'other', name: 'Other', emoji: '✨', hint: 'Anything else' },
];

export type SavedPlace = { id: string; label: string; address: string; emoji: string };

export const savedPlaces: SavedPlace[] = [
  { id: 'home', label: 'Home', address: '24, Sector 18, Noida, UP 201301', emoji: '🏠' },
  { id: 'office', label: 'Office', address: 'Tower B, Cyber Hub, Gurugram, HR 122002', emoji: '🏢' },
  { id: 'mom', label: "Mom's place", address: '12-A, Lajpat Nagar, New Delhi 110024', emoji: '💝' },
];

export type BookingStatus =
  | 'Searching rider'
  | 'Rider accepted'
  | 'Arriving for pickup'
  | 'Picked up'
  | 'On the way'
  | 'Delivered'
  | 'Cancelled';

export type Rider = {
  name: string;
  rating: number;
  trips: number;
  vehicle: string;
  vehicleNo: string;
};

export type Booking = {
  id: string;
  categoryId: string;
  pickup: string;
  drop: string;
  notes: string;
  recipientPhone?: string;
  payment: 'cash' | 'upi';
  distanceKm: number;
  etaMin: number;
  price: number;
  status: BookingStatus;
  createdAt: number;
  rider?: Rider;
};

const RIDERS: Rider[] = [
  { name: 'Rohit Sharma', rating: 4.9, trips: 1284, vehicle: 'Honda Activa', vehicleNo: 'DL 8S CB 4421' },
  { name: 'Amit Verma', rating: 4.8, trips: 932, vehicle: 'TVS Jupiter', vehicleNo: 'HR 26 BL 7732' },
  { name: 'Suresh Kumar', rating: 4.7, trips: 2104, vehicle: 'Bajaj Pulsar', vehicleNo: 'UP 14 DT 0098' },
];

export function pickRider(seed: string): Rider {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return RIDERS[h % RIDERS.length];
}

// Deterministic distance + price estimate from pickup/drop strings.
export function estimateTrip(pickup: string, drop: string) {
  const seed = (pickup + '|' + drop).trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  const distanceKm = Math.max(1.5, +(2 + (h % 1100) / 100).toFixed(1)); // 2.0 - 13.0
  const base = 25;
  const perKm = 8;
  const price = Math.round(base + distanceKm * perKm);
  const etaMin = Math.max(6, Math.round(8 + distanceKm * 2.4));
  return { distanceKm, price, etaMin, base, perKm };
}

// Seed history shown on first run.
export const seedBookings: Booking[] = [
  {
    id: 'QZ2018',
    categoryId: 'food',
    pickup: 'Burger Singh, Connaught Place',
    drop: '24, Sector 18, Noida',
    notes: '1 Maharaja burger, 1 Coke, fries',
    payment: 'upi',
    distanceKm: 8.4,
    etaMin: 28,
    price: 92,
    status: 'Delivered',
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    rider: RIDERS[1],
  },
  {
    id: 'QZ2014',
    categoryId: 'medicines',
    pickup: 'Apollo Pharmacy, Lajpat Nagar',
    drop: "Mom's place",
    notes: 'Crocin 650, Vicks inhaler, B-complex strip',
    payment: 'cash',
    distanceKm: 3.1,
    etaMin: 14,
    price: 50,
    status: 'Delivered',
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    rider: RIDERS[0],
  },
];
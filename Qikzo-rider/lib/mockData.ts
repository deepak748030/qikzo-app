// Qikzo Partner — mock data for a rider (driver) app.
// The rider sees incoming job requests, takes one, completes stages, gets paid.

export type JobCategory = 'ride' | 'groceries' | 'food' | 'medicines' | 'parcel' | 'other';

export type IncomingJob = {
    id: string;
    customerName: string;
    customerPhone: string;
    category: JobCategory;
    pickup: string;
    // Additional pickup stops (multi-pickup deliveries), in route order.
    extraPickups?: { address: string; coord?: { lat: number; lng: number } | null }[];
    drop: string;
    distanceKm: number;
    etaMin: number;      // trip time estimate
    fare: number;
    payment: 'cash' | 'upi';
    notes?: string;
    // 4-digit OTP the customer shows the rider at pickup — verifies the right
    // parcel/passenger before the trip starts.
    pickupOtp: string;
    // seconds the rider has to accept before it auto-declines
    expiresInSec: number;
};

export type JobStage =
    | 'Heading to pickup'
    | 'Arrived at pickup'
    | 'Picked up'
    | 'Delivered';

export const JOB_STAGES: JobStage[] = [
    'Heading to pickup',
    'Arrived at pickup',
    'Picked up',
    'Delivered',
];

export type CompletedJob = {
    id: string;
    category: JobCategory;
    pickup: string;
    drop: string;
    distanceKm: number;
    fare: number;
    payment: 'cash' | 'upi';
    completedAt: number;
    // History detail — populated when hydrated from the server so we can show
    // the trip-details screen without re-fetching everything.
    tripId?: string;
    bookingId?: string;
    bookingCode?: string;
    status?: 'completed' | 'cancelled';
    cancelReason?: string;
    customerName?: string;
    customerPhone?: string;
    durationMin?: number;
    startedAt?: number | null;
    assignedAt?: number | null;
};

export type RiderStats = {
    todayEarnings: number;
    todayTrips: number;
    todayHours: number;
    weekEarnings: number;
    weekTrips: number;
    monthEarnings: number;
    monthTrips: number;
    rating: number;
    lifetimeTrips: number;
    cashCollected: number;
    upiCollected: number;
};

export const myRider = {
    name: 'Rohit Sharma',
    vehicle: 'Honda Activa',
    vehicleNo: 'DL 8S CB 4421',
};

export const stats: RiderStats = {
    todayEarnings: 940,
    todayTrips: 7,
    todayHours: 4.2,
    weekEarnings: 5820,
    weekTrips: 42,
    monthEarnings: 21450,
    monthTrips: 168,
    rating: 4.9,
    lifetimeTrips: 1284,
    cashCollected: 520,
    upiCollected: 420,
};

// Mon → Sun earnings, used by the Earnings tab's mini bar chart.
export const weeklyEarnings = [520, 780, 940, 620, 1120, 980, 860];
export const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Upcoming settlement — surfaced on the Earnings tab.
export const nextPayout = {
    amount: 1240,
    when: 'Tomorrow, 6:00 AM',
    account: 'HDFC ••• 4421',
};

// Rolling incoming jobs. The dispatch screen cycles through these
// when the rider is online.
export const incomingJobs: IncomingJob[] = [
    {
        id: 'QZ2109',
        customerName: 'Priya Mehta',
        customerPhone: '+91 98180 22110',
        category: 'food',
        pickup: 'Burger Singh, Connaught Place',
        drop: '24, Sector 18, Noida',
        distanceKm: 8.4,
        etaMin: 28,
        fare: 92,
        payment: 'upi',
        notes: '1 Maharaja burger, fries, Coke',
        pickupOtp: '4821',
        expiresInSec: 15,
    },
    {
        id: 'QZ2110',
        customerName: 'Arjun Kapoor',
        customerPhone: '+91 99900 33221',
        category: 'medicines',
        pickup: 'Apollo Pharmacy, Lajpat Nagar',
        drop: 'B-12, Greater Kailash 1',
        distanceKm: 3.1,
        etaMin: 14,
        fare: 50,
        payment: 'cash',
        notes: 'Crocin 650, B-complex',
        pickupOtp: '2019',
        expiresInSec: 15,
    },
    {
        id: 'QZ2111',
        customerName: 'Neha Singh',
        customerPhone: '+91 98765 43210',
        category: 'parcel',
        pickup: '221, Karol Bagh',
        drop: 'DLF Cyber Hub, Gurgaon',
        distanceKm: 12.6,
        etaMin: 42,
        fare: 126,
        payment: 'upi',
        pickupOtp: '7736',
        expiresInSec: 15,
    },
];

export const completedJobs: CompletedJob[] = [
    { id: 'QZ2108', category: 'food', pickup: 'KFC, CP', drop: 'Sector 62, Noida', distanceKm: 11.2, fare: 115, payment: 'upi', completedAt: Date.now() - 1000 * 60 * 30 },
    { id: 'QZ2107', category: 'groceries', pickup: 'BigBasket, GK', drop: 'Vasant Vihar', distanceKm: 5.8, fare: 72, payment: 'cash', completedAt: Date.now() - 1000 * 60 * 95 },
    { id: 'QZ2106', category: 'parcel', pickup: 'Karol Bagh', drop: 'Rohini Sec 9', distanceKm: 9.4, fare: 100, payment: 'upi', completedAt: Date.now() - 1000 * 60 * 180 },
    { id: 'QZ2105', category: 'medicines', pickup: 'Apollo, Lajpat', drop: 'Defence Colony', distanceKm: 2.7, fare: 46, payment: 'cash', completedAt: Date.now() - 1000 * 60 * 240 },
    { id: 'QZ2104', category: 'food', pickup: 'Dominos, CP', drop: 'Malviya Nagar', distanceKm: 6.9, fare: 80, payment: 'upi', completedAt: Date.now() - 1000 * 60 * 60 * 6 },
    { id: 'QZ2098', category: 'ride', pickup: 'IGI Terminal 3', drop: 'Aerocity Hotel', distanceKm: 3.4, fare: 55, payment: 'cash', completedAt: Date.now() - 1000 * 60 * 60 * 24 },
    { id: 'QZ2091', category: 'parcel', pickup: 'Nehru Place', drop: 'Saket', distanceKm: 4.2, fare: 60, payment: 'upi', completedAt: Date.now() - 1000 * 60 * 60 * 28 },
    { id: 'QZ2087', category: 'groceries', pickup: 'Reliance Fresh, GK', drop: 'Green Park', distanceKm: 2.9, fare: 48, payment: 'cash', completedAt: Date.now() - 1000 * 60 * 60 * 30 },
];

export type Document = {
    id: string;
    name: string;
    status: 'verified' | 'pending' | 'rejected';
    updatedAt: string;
};

export const documents: Document[] = [
    { id: 'dl', name: 'Driving licence', status: 'verified', updatedAt: '12 Mar 2026' },
    { id: 'rc', name: 'Vehicle RC', status: 'verified', updatedAt: '12 Mar 2026' },
    { id: 'insurance', name: 'Insurance', status: 'pending', updatedAt: 'Under review' },
    { id: 'photo', name: 'Profile photo', status: 'verified', updatedAt: '10 Mar 2026' },
];

export const CATEGORY_META: Record<JobCategory, { emoji: string; label: string }> = {
    ride: { emoji: '🛵', label: 'Ride' },
    groceries: { emoji: '🛒', label: 'Groceries' },
    food: { emoji: '🍔', label: 'Food' },
    medicines: { emoji: '💊', label: 'Medicines' },
    parcel: { emoji: '📦', label: 'Parcel' },
    other: { emoji: '✨', label: 'Other' },
};

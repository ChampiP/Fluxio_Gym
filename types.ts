
export interface Membership {
  id: string;
  name: string;
  description: string;
  cost: number;
  durationDays: number;
  isPromotion?: boolean;        // Indica si es una promoción
  beneficiariesCount?: number;  // Cantidad de personas (2 para 2x1, 3 para 3x1, etc)
}

export interface Measurement {
  id: string;
  date: string;
  weight: number;     // kg
  height?: number;    // cm
  chest?: number;     // cm
  waist?: number;     // cm
  arm?: number;       // cm
  notes?: string;
}

export interface Client {
  id: string; // The UUID
  humanId: string; // The "1001a" style ID for check-in
  firstName: string;
  lastName: string;
  phone: string;
  dni: string;
  email: string;
  activeMembershipId?: string;
  membershipStartDate?: string; // ISO Date
  membershipExpiryDate?: string; // ISO Date
  registeredAt: string;
  status: 'active' | 'expired' | 'inactive';
  measurements?: Measurement[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: 'suplementos' | 'bebidas' | 'ropa' | 'otros';
}

export interface AttendanceLog {
  id: string;
  clientId: string;
  clientName: string;
  timestamp: string;
  success: boolean;
  message: string;
  isWarning?: boolean; // New flag for expiring soon
}

export interface Transaction {
  id: string;
  clientId?: string; // Optional (could be walk-in customer for products)
  clientName: string;
  itemDescription: string; // Changed from membershipName to generic
  amount: number;
  date: string; // ISO Date
  type: 'membership_new' | 'membership_renewal' | 'product_sale';
}

export interface AppSettings {
  gymName: string;
  primaryColor: string;
  logoUrl: string | null;
  darkMode?: boolean;
  // Legal Data for Invoice
  businessName?: string;
  ruc?: string;
  address?: string;
  phone?: string;
}

export interface User {
  username: string;
  role: 'admin' | 'staff';
}

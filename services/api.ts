
import { Client, Membership, AttendanceLog, AppSettings, Transaction, Product, Measurement } from '../types';

// Keys for LocalStorage
const KEYS = {
  CLIENTS: 'gymflex_clients',
  MEMBERSHIPS: 'gymflex_memberships',
  PRODUCTS: 'gymflex_products',
  LOGS: 'gymflex_logs',
  TRANSACTIONS: 'gymflex_transactions',
  SETTINGS: 'gymflex_settings',
  LAST_HUMAN_ID: 'gymflex_last_id'
};

// Initial Data
const INITIAL_MEMBERSHIPS: Membership[] = [
  { id: '1', name: 'Mensual Básico', description: 'Acceso a máquinas', cost: 80, durationDays: 30 },
  { id: '2', name: 'Trimestral Pro', description: 'Todo incluido + Sauna', cost: 200, durationDays: 90 },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Agua Mineral 500ml', price: 2.50, stock: 50, category: 'bebidas' },
  { id: '2', name: 'Gatorade', price: 4.00, stock: 30, category: 'bebidas' },
  { id: '3', name: 'Proteína Whey (Scoop)', price: 5.00, stock: 100, category: 'suplementos' },
];

const INITIAL_SETTINGS: AppSettings = {
  gymName: 'GymFlex Pro',
  primaryColor: '#3b82f6', // Blue-500
  logoUrl: null,
  darkMode: false,
  businessName: 'INVERSIONES FITNESS S.A.C.',
  ruc: '20555555551',
  address: 'Av. Larco 123, Miraflores, Lima',
  phone: '(01) 444-5555'
};

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Settings
  getSettings: async (): Promise<AppSettings> => {
    await delay(100);
    const stored = localStorage.getItem(KEYS.SETTINGS);
    return stored ? JSON.parse(stored) : INITIAL_SETTINGS;
  },
  saveSettings: async (settings: AppSettings): Promise<void> => {
    await delay(200);
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Memberships
  getMemberships: async (): Promise<Membership[]> => {
    await delay(200);
    const stored = localStorage.getItem(KEYS.MEMBERSHIPS);
    if (!stored) {
      localStorage.setItem(KEYS.MEMBERSHIPS, JSON.stringify(INITIAL_MEMBERSHIPS));
      return INITIAL_MEMBERSHIPS;
    }
    return JSON.parse(stored);
  },
  saveMembership: async (membership: Membership): Promise<void> => {
    await delay(200);
    const list = await api.getMemberships();
    const index = list.findIndex(m => m.id === membership.id);
    if (index >= 0) {
      list[index] = membership;
    } else {
      list.push({ ...membership, id: Math.random().toString(36).substr(2, 9) });
    }
    localStorage.setItem(KEYS.MEMBERSHIPS, JSON.stringify(list));
  },
  deleteMembership: async (id: string): Promise<void> => {
    const list = await api.getMemberships();
    localStorage.setItem(KEYS.MEMBERSHIPS, JSON.stringify(list.filter(m => m.id !== id)));
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    await delay(200);
    const stored = localStorage.getItem(KEYS.PRODUCTS);
    if (!stored) {
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(stored);
  },
  saveProduct: async (product: Product): Promise<void> => {
    await delay(200);
    const list = await api.getProducts();
    const index = list.findIndex(p => p.id === product.id);
    if (index >= 0) {
      list[index] = product;
    } else {
      list.push({ ...product, id: Math.random().toString(36).substr(2, 9) });
    }
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(list));
  },
  deleteProduct: async (id: string): Promise<void> => {
    const list = await api.getProducts();
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(list.filter(p => p.id !== id)));
  },
  sellProduct: async (productId: string, quantity: number, clientId?: string): Promise<void> => {
    const products = await api.getProducts();
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex >= 0 && products[productIndex].stock >= quantity) {
      // Reduce Stock
      products[productIndex].stock -= quantity;
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));

      // Create Transaction
      const transactions = await api.getTransactions();
      const clients = await api.getClients();
      const client = clientId ? clients.find(c => c.id === clientId) : null;

      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        clientId: client?.id,
        clientName: client ? `${client.firstName} ${client.lastName}` : 'Cliente Casual',
        itemDescription: `${quantity}x ${products[productIndex].name}`,
        amount: products[productIndex].price * quantity,
        date: new Date().toISOString(),
        type: 'product_sale'
      };
      transactions.unshift(newTransaction);
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
  },

  // Clients
  getClients: async (): Promise<Client[]> => {
    await delay(300);
    const stored = localStorage.getItem(KEYS.CLIENTS);
    return stored ? JSON.parse(stored) : [];
  },
  
  createClient: async (data: Omit<Client, 'id' | 'humanId' | 'status' | 'registeredAt'>): Promise<Client> => {
    await delay(300);
    const clients = await api.getClients();
    
    let lastId = parseInt(localStorage.getItem(KEYS.LAST_HUMAN_ID) || '1000');
    lastId++;
    localStorage.setItem(KEYS.LAST_HUMAN_ID, lastId.toString());
    const humanId = `${lastId}a`;

    const newClient: Client = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      humanId,
      status: 'inactive',
      registeredAt: new Date().toISOString(),
      measurements: []
    };

    clients.push(newClient);
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
    return newClient;
  },

  updateClient: async (client: Client): Promise<void> => {
    const clients = await api.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) {
      clients[index] = client;
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
    }
  },

  addMeasurement: async (clientId: string, measurement: Omit<Measurement, 'id' | 'date'>): Promise<Client | null> => {
    await delay(200);
    const clients = await api.getClients();
    const index = clients.findIndex(c => c.id === clientId);
    if (index >= 0) {
        const newMeasurement: Measurement = {
            ...measurement,
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString()
        };
        const currentMeasurements = clients[index].measurements || [];
        clients[index].measurements = [newMeasurement, ...currentMeasurements];
        localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
        return clients[index];
    }
    return null;
  },

  // Attendance
  checkIn: async (humanId: string): Promise<{ success: boolean; message: string; client?: Client, isWarning?: boolean }> => {
    await delay(400);
    const clients = await api.getClients();
    const client = clients.find(c => c.humanId.toLowerCase() === humanId.toLowerCase());
    
    const logs = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
    
    if (!client) {
      const log: AttendanceLog = {
        id: Math.random().toString(36),
        clientId: 'unknown',
        clientName: 'Desconocido',
        timestamp: new Date().toISOString(),
        success: false,
        message: 'Código inválido'
      };
      logs.unshift(log);
      localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
      return { success: false, message: 'Código de cliente no encontrado' };
    }

    const now = new Date();
    const expiry = client.membershipExpiryDate ? new Date(client.membershipExpiryDate) : null;
    const isExpired = !expiry || expiry < now;

    if (isExpired) {
       const log: AttendanceLog = {
        id: Math.random().toString(36),
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        timestamp: new Date().toISOString(),
        success: false,
        message: 'Membresía vencida'
      };
      logs.unshift(log);
      localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
      return { success: false, message: 'Membresía vencida o inactiva', client };
    }

    // Check for "About to expire" (5 days)
    const daysLeft = Math.ceil((expiry!.getTime() - now.getTime()) / (1000 * 3600 * 24));
    let message = 'Acceso concedido';
    let isWarning = false;

    if (daysLeft <= 5) {
      message = `¡Cuidado! Vence en ${daysLeft} días`;
      isWarning = true;
    }

    const log: AttendanceLog = {
      id: Math.random().toString(36),
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      timestamp: new Date().toISOString(),
      success: true,
      message,
      isWarning
    };
    logs.unshift(log);
    localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));

    return { success: true, message: isWarning ? message : `Bienvenido, ${client.firstName}!`, client, isWarning };
  },

  getLogs: async (): Promise<AttendanceLog[]> => {
    await delay(200);
    return JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
  },

  // Transactions
  getTransactions: async (): Promise<Transaction[]> => {
    await delay(200);
    return JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
  },

  renewMembership: async (clientId: string, membershipId: string): Promise<void> => {
    await delay(300);
    const clients = await api.getClients();
    const memberships = await api.getMemberships();
    
    const clientIndex = clients.findIndex(c => c.id === clientId);
    const plan = memberships.find(m => m.id === membershipId);

    if (clientIndex >= 0 && plan) {
      const client = clients[clientIndex];
      const now = new Date();
      
      let startDate = now;
      if (client.membershipExpiryDate && new Date(client.membershipExpiryDate) > now) {
         startDate = new Date(client.membershipExpiryDate); 
      }

      const expiry = new Date(startDate);
      expiry.setDate(startDate.getDate() + plan.durationDays);

      clients[clientIndex] = {
        ...client,
        activeMembershipId: plan.id,
        membershipStartDate: now.toISOString(),
        membershipExpiryDate: expiry.toISOString(),
        status: 'active'
      };
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));

      const transactions = await api.getTransactions();
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        itemDescription: `Plan ${plan.name}`,
        amount: plan.cost,
        date: new Date().toISOString(),
        type: client.activeMembershipId ? 'membership_renewal' : 'membership_new'
      };
      transactions.unshift(newTransaction);
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
  }
};

-- 1. Tabla de Membresías
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cost NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL,
  is_promotion BOOLEAN DEFAULT FALSE,
  beneficiaries_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  human_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  dni TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  active_membership_id UUID REFERENCES memberships(id),
  membership_start_date DATE,
  membership_expiry_date DATE,
  status TEXT CHECK (status IN ('active', 'expired', 'inactive')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Mediciones
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  height NUMERIC,
  chest NUMERIC,
  waist NUMERIC,
  arm NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Productos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT CHECK (category IN ('suplementos', 'bebidas', 'ropa', 'otros')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Transacciones
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  client_name TEXT NOT NULL,
  item_description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  type TEXT CHECK (type IN ('membership_new', 'membership_renewal', 'product_sale')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Logs de Asistencia
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  client_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  message TEXT NOT NULL,
  is_warning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Configuración
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_name TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  logo_url TEXT,
  dark_mode BOOLEAN DEFAULT FALSE,
  business_name TEXT,
  ruc TEXT,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO settings (gym_name, primary_color, dark_mode, business_name, ruc, address, phone)
VALUES ('GymFlex Pro', '#3b82f6', false, 'INVERSIONES FITNESS S.A.C.', '20555555551', 'Av. Larco 123, Miraflores, Lima', '(01) 444-5555');

-- Insertar membresías de ejemplo
INSERT INTO memberships (name, description, cost, duration_days) VALUES
('Plan Básico', 'Acceso a gimnasio y máquinas', 80, 30),
('Plan Premium', 'Acceso completo + clases grupales', 120, 30),
('Plan VIP', 'Acceso total + entrenador personal', 200, 30);

-- Crear índices para mejorar rendimiento
CREATE INDEX idx_clients_human_id ON clients(human_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_attendance_logs_client_id ON attendance_logs(client_id);
CREATE INDEX idx_measurements_client_id ON measurements(client_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (permitir todo por ahora)
CREATE POLICY "Enable all for authenticated users" ON memberships FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON clients FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON measurements FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON transactions FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON attendance_logs FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON settings FOR ALL USING (true);

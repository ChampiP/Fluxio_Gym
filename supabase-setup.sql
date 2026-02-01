-- =================================================================
-- SCRIPT DE INSTALACIÓN COMPLETA - GYMFLEX PRO
-- Este script elimina todo y recrea la base de datos desde cero
-- =================================================================

-- 1. ELIMINAR TODAS LAS TABLAS Y OBJETOS EXISTENTES (en orden correcto por dependencias)

-- 1.1 Eliminar triggers y funciones
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 1.2 Eliminar tablas
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- 2. CREAR TABLAS DESDE CERO

-- 2.1 Tabla de Membresías
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

-- 2.2 Tabla de Clientes
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

-- 2.3 Tabla de Mediciones
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

-- 2.4 Tabla de Productos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT CHECK (category IN ('suplementos', 'bebidas', 'ropa', 'otros')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Tabla de Transacciones
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

-- 2.6 Tabla de Logs de Asistencia
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

-- 2.7 Tabla de Configuración
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

-- 2.8 Tabla de Usuarios del Sistema (Administradores/Staff)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'staff', 'trainer')) DEFAULT 'staff',
  permissions JSONB DEFAULT '{"dashboard": true, "clients": true, "checkin": true}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INSERTAR DATOS INICIALES

-- 3.1 Configuración por defecto
INSERT INTO settings (gym_name, primary_color, dark_mode, business_name, ruc, address, phone)
VALUES ('GymFlex Pro', '#3b82f6', false, 'INVERSIONES FITNESS S.A.C.', '20555555551', 'Av. Larco 123, Miraflores, Lima', '(01) 444-5555');

-- 3.2 Membresías de ejemplo
INSERT INTO memberships (name, description, cost, duration_days) VALUES
('Plan Básico', 'Acceso a gimnasio y máquinas', 80, 30),
('Plan Premium', 'Acceso completo + clases grupales', 120, 30),
('Plan VIP', 'Acceso total + entrenador personal', 200, 30);

-- 4. CREAR ÍNDICES PARA RENDIMIENTO
CREATE INDEX idx_clients_human_id ON clients(human_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_attendance_logs_client_id ON attendance_logs(client_id);
CREATE INDEX idx_measurements_client_id ON measurements(client_id);
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- 5. CONFIGURAR SEGURIDAD (Row Level Security)
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 5.1 Políticas de acceso (solo usuarios autenticados)
CREATE POLICY "Enable all for authenticated users" ON memberships FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON measurements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON attendance_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable read for own profile" ON admin_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable update for own profile" ON admin_users FOR UPDATE USING (auth.uid() = user_id);

-- 6. CONFIGURAR AUTENTICACIÓN POR EMAIL
-- Esta función se ejecutará automáticamente cuando un usuario se registre
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_users (user_id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'), 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =================================================================
-- ✅ INSTALACIÓN COMPLETA FINALIZADA
-- Base de datos GymFlex Pro creada exitosamente
-- =================================================================

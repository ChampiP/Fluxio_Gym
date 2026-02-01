-- Migración: Agregar campos de dirección y promociones
-- Fecha: 31/01/2026
-- Descripción: Agrega campo address a clientes e is_promotion y beneficiaries_count a membresías

-- 1. Agregar columna address a la tabla clients (si no existe)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Agregar columnas de promoción a la tabla memberships (si no existen)
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS is_promotion BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS beneficiaries_count INTEGER DEFAULT 1;

-- Listo. Los cambios están aplicados.

-- EJECUTAR ESTE SQL EN SUPABASE PARA LIMPIAR DATOS VIEJOS

-- 1. Eliminar todos los clientes existentes (con formato antiguo)
DELETE FROM clients;

-- 2. Reiniciar la secuencia (opcional, para empezar desde 1001)
-- Los nuevos clientes ahora usarán IDs numéricos: 1001, 1002, 1003...

-- Listo! Ahora puedes crear clientes nuevamente.

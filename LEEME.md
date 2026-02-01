# 🚀 GYMFLEX PRO - Guía de Inicio Rápido

## Para el Cliente - Instrucciones Simples

### 📋 Requisitos Previos (Solo Primera Vez)
1. Tener **Node.js** instalado (https://nodejs.org)
2. Abrir PowerShell/CMD en esta carpeta
3. Ejecutar: `npm install` (solo la primera vez)

### ▶️ Iniciar la Aplicación
**Opción 1 (Más Fácil):**
- Hacer **doble click** en `INICIAR.bat`
- Esperar 3 segundos
- El navegador se abrirá automáticamente

**Opción 2 (Manual):**
- Abrir terminal en esta carpeta
- Ejecutar: `npm run dev`
- Abrir navegador en: http://localhost:3000

### 🔐 Crear tu primera cuenta
```
1. Ejecuta la aplicación
2. Ve a Supabase Authentication > Users
3. Haz clic en "Invite a user"
4. Ingresa tu email 
5. Revisa tu bandeja de entrada y confirma la cuenta
6. Inicia sesión con tus credenciales
```

**Nota:** Debes crear usuarios desde el panel de Supabase para garantizar la seguridad.

### 🛑 Detener la Aplicación
- Cerrar la ventana negra (terminal)
- O presionar `Ctrl + C` en la terminal

---

## 💡 Mejoras Sugeridas para Producción

### 🔒 Seguridad
1. **Autenticación Real con Supabase Auth**
   - Reemplazar login hardcodeado
   - Gestión de usuarios y roles
   - Recuperación de contraseña

2. **HTTPS en Producción**
   - Deploy en Vercel/Netlify (gratis)
   - Certificado SSL automático

3. **Permisos Granulares**
   - Admin, Recepcionista, Entrenador
   - Restricciones por rol

### 📊 Funcionalidades
4. **Dashboard Mejorado**
   - Gráficos de ingresos mensuales
   - Estadísticas de asistencia
   - Clientes próximos a vencer

5. **Notificaciones Automáticas**
   - WhatsApp/Email 3 días antes de vencer
   - Recordatorios de pago
   - Confirmación de renovación

6. **Reportes Avanzados**
   - Exportar a Excel
   - Reportes de ventas por período
   - Análisis de productos más vendidos

7. **Gestión de Inventario**
   - Alertas de stock bajo
   - Historial de movimientos
   - Proveedores

8. **Sistema de Clases/Horarios**
   - Reserva de clases grupales
   - Calendario de entrenadores
   - Capacidad máxima por clase

9. **App Móvil para Clientes**
   - Ver membresía activa
   - Historial de asistencia
   - Renovar online

10. **Integración de Pagos**
    - Mercado Pago / Stripe
    - Pagos con tarjeta
    - Suscripciones recurrentes

### 🎨 UX/UI
11. **Modo Kiosco**
    - Pantalla táctil para check-in
    - Solo lectura de código QR/ID

12. **Impresión de Credenciales**
    - Tarjetas físicas con QR
    - Diseño personalizable

13. **Multi-idioma**
    - Español/Inglés
    - Configuración por usuario

### 📱 Integraciones
14. **WhatsApp Business API**
    - Envío masivo de recordatorios
    - Chatbot para consultas

15. **Google Calendar**
    - Sincronizar clases
    - Recordatorios automáticos

---

## 🐛 Solución de Problemas

### Error: "npm no se reconoce"
**Solución:** Instalar Node.js desde https://nodejs.org

### Error: "Puerto 3000 en uso"
**Solución:** 
1. Cerrar otras instancias
2. O cambiar puerto en `vite.config.ts`

### La aplicación no carga
**Solución:**
1. Verificar que `npm install` se ejecutó
2. Revisar que `.env.local` tenga las credenciales de Supabase
3. Verificar conexión a internet (para Supabase)

### Error de base de datos
**Solución:**
1. Verificar que ejecutaste el SQL en Supabase
2. Revisar las credenciales en `.env.local`
3. Verificar políticas RLS en Supabase

---

## 📞 Soporte

Para cualquier problema o mejora:
1. Revisar la consola del navegador (F12)
2. Verificar la terminal donde corre `npm run dev`
3. Contactar al desarrollador con capturas de pantalla

---

## 🎯 Próximos Pasos Recomendados

### Corto Plazo (1-2 semanas)
- [ ] Implementar Supabase Auth
- [ ] Deploy a producción (Vercel)
- [ ] Configurar dominio personalizado

### Mediano Plazo (1 mes)
- [ ] Notificaciones WhatsApp automáticas
- [ ] Reportes avanzados
- [ ] Sistema de roles

### Largo Plazo (3 meses)
- [ ] App móvil (React Native)
- [ ] Integración de pagos online
- [ ] Sistema de clases y reservas

---

**Versión:** 1.0  
**Última actualización:** 31 de Enero, 2026  
**Stack:** React 19 + TypeScript + Vite + Supabase

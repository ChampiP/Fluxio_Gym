// Security utilities for GymFlex Pro

/**
 * Sanitiza input de usuario para prevenir XSS
 */
export const sanitizeInput = (input: string): string => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

/**
 * Valida formato de email
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Valida DNI peruano (8 dígitos)
 */
export const isValidDNI = (dni: string): boolean => {
    return /^\d{8}$/.test(dni);
};

/**
 * Valida teléfono peruano
 */
export const isValidPhone = (phone: string): boolean => {
    // Acepta formatos: 999999999, +51999999999, (01)4445555
    return /^(\+51)?[0-9]{9}$|^\([0-9]{2}\)[0-9]{7}$/.test(phone.replace(/\s/g, ''));
};

/**
 * Valida RUC peruano (11 dígitos)
 */
export const isValidRUC = (ruc: string): boolean => {
    return /^\d{11}$/.test(ruc);
};

/**
 * Limita el tamaño de archivos (para logos)
 */
export const isValidFileSize = (file: File, maxSizeMB: number = 2): boolean => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
};

/**
 * Valida tipo de archivo de imagen
 */
export const isValidImageType = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
};

/**
 * Previene inyección SQL básica (aunque Supabase ya protege)
 */
export const sanitizeForDB = (input: string): string => {
    return input
        .replace(/['"`;]/g, '') // Elimina caracteres peligrosos
        .trim();
};

/**
 * Valida que un número sea positivo
 */
export const isPositiveNumber = (value: number): boolean => {
    return !isNaN(value) && value > 0;
};

/**
 * Formatea moneda peruana
 */
export const formatCurrency = (amount: number): string => {
    return `S/. ${amount.toFixed(2)}`;
};

/**
 * Valida rango de fecha
 */
export const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
    return startDate <= endDate;
};

/**
 * Rate limiting simple (previene spam de requests)
 */
class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private maxRequests: number;
    private windowMs: number;

    constructor(maxRequests: number = 10, windowMs: number = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    canMakeRequest(key: string): boolean {
        const now = Date.now();
        const requests = this.requests.get(key) || [];

        // Filtrar requests antiguos
        const recentRequests = requests.filter(time => now - time < this.windowMs);

        if (recentRequests.length >= this.maxRequests) {
            return false;
        }

        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        return true;
    }

    reset(key: string): void {
        this.requests.delete(key);
    }
}

export const rateLimiter = new RateLimiter(20, 60000); // 20 requests por minuto

/**
 * Genera un hash simple para IDs (no criptográfico)
 */
export const generateSimpleHash = (input: string): string => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
};

/**
 * Valida longitud de contraseña (para futuro)
 */
export const isStrongPassword = (password: string): boolean => {
    // Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
};

/**
 * Escapa caracteres HTML para prevenir XSS
 */
export const escapeHtml = (text: string): string => {
    const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
};

/**
 * Valida que un objeto no esté vacío
 */
export const isNotEmpty = (obj: any): boolean => {
    return obj !== null && obj !== undefined && obj !== '';
};

/**
 * Timeout para requests (previene requests colgados)
 */
export const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number = 30000
): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        )
    ]);
};

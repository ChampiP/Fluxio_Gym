import { supabase } from './supabase';
import { Client, Membership, AttendanceLog, AppSettings, Transaction, Product, Measurement } from '../types';

// Helper para generar IDs humanos (1001, 1002, etc.)
const generateHumanId = async (): Promise<string> => {
    const { data: clients } = await supabase
        .from('clients')
        .select('human_id')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!clients || clients.length === 0) {
        return '1001';
    }

    const lastId = clients[0].human_id;
    const numPart = parseInt(lastId);

    return String(numPart + 1);
};

// Delay simulado para UX
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    // Settings
    async getSettings(): Promise<AppSettings> {
        await delay();
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .single();

        if (error) throw error;

        return {
            gymName: data.gym_name,
            primaryColor: data.primary_color,
            logoUrl: data.logo_url,
            darkMode: data.dark_mode,
            businessName: data.business_name,
            ruc: data.ruc,
            address: data.address,
            phone: data.phone
        };
    },

    async saveSettings(settings: AppSettings): Promise<void> {
        await delay();
        const { error } = await supabase
            .from('settings')
            .update({
                gym_name: settings.gymName,
                primary_color: settings.primaryColor,
                logo_url: settings.logoUrl,
                dark_mode: settings.darkMode,
                business_name: settings.businessName,
                ruc: settings.ruc,
                address: settings.address,
                phone: settings.phone,
                updated_at: new Date().toISOString()
            })
            .eq('id', (await supabase.from('settings').select('id').single()).data?.id);

        if (error) throw error;
    },

    // Memberships
    async getMemberships(): Promise<Membership[]> {
        await delay();
        const { data, error } = await supabase
            .from('memberships')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description || '',
            cost: m.cost,
            durationDays: m.duration_days,
            isPromotion: m.is_promotion || false,
            beneficiariesCount: m.beneficiaries_count || 1
        }));
    },

    async saveMembership(membership: Membership): Promise<void> {
        await delay();
        const data = {
            name: membership.name,
            description: membership.description,
            cost: membership.cost,
            duration_days: membership.durationDays,
            is_promotion: membership.isPromotion || false,
            beneficiaries_count: membership.beneficiariesCount || 1
        };

        if (membership.id) {
            const { error } = await supabase
                .from('memberships')
                .update(data)
                .eq('id', membership.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('memberships')
                .insert([data]);
            if (error) throw error;
        }
    },

    async deleteMembership(id: string): Promise<void> {
        await delay();
        const { error } = await supabase
            .from('memberships')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // Products
    async getProducts(): Promise<Product[]> {
        await delay();
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            stock: p.stock,
            category: p.category
        }));
    },

    async saveProduct(product: Product): Promise<void> {
        await delay();
        const data = {
            name: product.name,
            price: product.price,
            stock: product.stock,
            category: product.category
        };

        if (product.id) {
            const { error } = await supabase
                .from('products')
                .update(data)
                .eq('id', product.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('products')
                .insert([data]);
            if (error) throw error;
        }
    },

    async deleteProduct(id: string): Promise<void> {
        await delay();
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async sellProduct(productId: string, quantity: number, clientId?: string): Promise<void> {
        await delay();

        // Get product
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (productError) throw productError;
        if (product.stock < quantity) throw new Error('Stock insuficiente');

        // Update stock
        const { error: updateError } = await supabase
            .from('products')
            .update({ stock: product.stock - quantity })
            .eq('id', productId);

        if (updateError) throw updateError;

        // Get client name if clientId provided
        let clientName = 'Cliente General';
        if (clientId) {
            const { data: client } = await supabase
                .from('clients')
                .select('first_name, last_name')
                .eq('id', clientId)
                .single();

            if (client) {
                clientName = `${client.first_name} ${client.last_name}`;
            }
        }

        // Create transaction
        const { error: txError } = await supabase
            .from('transactions')
            .insert([{
                client_id: clientId || null,
                client_name: clientName,
                item_description: `${quantity}x ${product.name}`,
                amount: product.price * quantity,
                type: 'product_sale'
            }]);

        if (txError) throw txError;
    },

    // Clients
    async getClients(): Promise<Client[]> {
        await delay();
        const { data, error } = await supabase
            .from('clients')
            .select(`
        *,
        measurements (*)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(c => ({
            id: c.id,
            humanId: c.human_id,
            firstName: c.first_name,
            lastName: c.last_name,
            phone: c.phone,
            dni: c.dni,
            email: c.email,
            address: c.address,
            activeMembershipId: c.active_membership_id,
            membershipStartDate: c.membership_start_date,
            membershipExpiryDate: c.membership_expiry_date,
            registeredAt: c.registered_at,
            status: c.status,
            measurements: c.measurements?.map((m: any) => ({
                id: m.id,
                date: m.date,
                weight: m.weight,
                height: m.height,
                chest: m.chest,
                waist: m.waist,
                arm: m.arm,
                notes: m.notes
            })) || []
        }));
    },

    async createClient(data: Omit<Client, 'id' | 'humanId' | 'status' | 'registeredAt'>): Promise<Client> {
        await delay();

        const humanId = await generateHumanId();
        const now = new Date().toISOString();

        const insertData: any = {
            human_id: humanId,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            dni: data.dni,
            email: data.email || '',
            address: data.address || '',
            status: 'inactive',
            registered_at: now
        };

        // Only add membership fields if they exist
        if (data.activeMembershipId) {
            insertData.active_membership_id = data.activeMembershipId;
        }
        if (data.membershipStartDate) {
            insertData.membership_start_date = data.membershipStartDate;
        }
        if (data.membershipExpiryDate) {
            insertData.membership_expiry_date = data.membershipExpiryDate;
        }

        const { data: newClient, error } = await supabase
            .from('clients')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        return {
            id: newClient.id,
            humanId: newClient.human_id,
            firstName: newClient.first_name,
            lastName: newClient.last_name,
            phone: newClient.phone,
            dni: newClient.dni,
            email: newClient.email,
            address: newClient.address,
            activeMembershipId: newClient.active_membership_id,
            membershipStartDate: newClient.membership_start_date,
            membershipExpiryDate: newClient.membership_expiry_date,
            registeredAt: newClient.registered_at,
            status: newClient.status,
            measurements: []
        };
    },

    async updateClient(client: Client): Promise<void> {
        await delay();
        const { error } = await supabase
            .from('clients')
            .update({
                first_name: client.firstName,
                last_name: client.lastName,
                phone: client.phone,
                dni: client.dni,
                email: client.email,
                active_membership_id: client.activeMembershipId,
                membership_start_date: client.membershipStartDate,
                membership_expiry_date: client.membershipExpiryDate,
                status: client.status
            })
            .eq('id', client.id);

        if (error) throw error;
    },

    async addMeasurement(clientId: string, measurement: Omit<Measurement, 'id' | 'date'>): Promise<Client | null> {
        await delay();

        const { error } = await supabase
            .from('measurements')
            .insert([{
                client_id: clientId,
                weight: measurement.weight,
                height: measurement.height,
                chest: measurement.chest,
                waist: measurement.waist,
                arm: measurement.arm,
                notes: measurement.notes
            }]);

        if (error) throw error;

        // Return updated client
        const clients = await this.getClients();
        return clients.find(c => c.id === clientId) || null;
    },

    // Attendance
    async checkIn(humanId: string): Promise<{ success: boolean; message: string; client?: Client; isWarning?: boolean }> {
        await delay();

        const { data: clients } = await supabase
            .from('clients')
            .select('*')
            .eq('human_id', humanId.toLowerCase());

        if (!clients || clients.length === 0) {
            await supabase.from('attendance_logs').insert([{
                client_id: null,
                client_name: 'Desconocido',
                success: false,
                message: `ID ${humanId} no encontrado`
            }]);

            return { success: false, message: `ID ${humanId} no encontrado` };
        }

        const client = clients[0];
        const clientName = `${client.first_name} ${client.last_name}`;

        if (!client.active_membership_id || !client.membership_expiry_date) {
            await supabase.from('attendance_logs').insert([{
                client_id: client.id,
                client_name: clientName,
                success: false,
                message: 'Sin membresía activa'
            }]);

            return { success: false, message: 'Sin membresía activa' };
        }

        const expiryDate = new Date(client.membership_expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiryDate < today) {
            await supabase.from('attendance_logs').insert([{
                client_id: client.id,
                client_name: clientName,
                success: false,
                message: 'Membresía vencida'
            }]);

            return { success: false, message: 'Membresía vencida' };
        }

        const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 3) {
            await supabase.from('attendance_logs').insert([{
                client_id: client.id,
                client_name: clientName,
                success: true,
                message: `Acceso permitido. Vence en ${daysRemaining} día(s)`,
                is_warning: true
            }]);

            return {
                success: true,
                message: `Acceso permitido. Vence en ${daysRemaining} día(s)`,
                isWarning: true
            };
        }

        await supabase.from('attendance_logs').insert([{
            client_id: client.id,
            client_name: clientName,
            success: true,
            message: 'Acceso permitido'
        }]);

        return { success: true, message: 'Acceso permitido' };
    },

    async getLogs(): Promise<AttendanceLog[]> {
        await delay();
        const { data, error } = await supabase
            .from('attendance_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(50);

        if (error) throw error;

        return data.map(log => ({
            id: log.id,
            clientId: log.client_id,
            clientName: log.client_name,
            timestamp: log.timestamp,
            success: log.success,
            message: log.message,
            isWarning: log.is_warning
        }));
    },

    // Transactions
    async getTransactions(): Promise<Transaction[]> {
        await delay();
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        return data.map(tx => ({
            id: tx.id,
            clientId: tx.client_id,
            clientName: tx.client_name,
            itemDescription: tx.item_description,
            amount: tx.amount,
            date: tx.date,
            type: tx.type
        }));
    },

    async renewMembership(clientId: string, membershipId: string): Promise<void> {
        await delay();

        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError) throw clientError;

        const { data: membership, error: membershipError } = await supabase
            .from('memberships')
            .select('*')
            .eq('id', membershipId)
            .single();

        if (membershipError) throw membershipError;

        // Verificar si es una promoción
        const isPromotion = membership.is_promotion || false;
        const beneficiariesCount = membership.beneficiaries_count || 1;

        const today = new Date();
        let startDate = new Date(today);

        if (client.membership_expiry_date) {
            const expiryDate = new Date(client.membership_expiry_date);
            if (expiryDate > today) {
                startDate = new Date(expiryDate);
            }
        }

        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + membership.duration_days);

        // Actualizar cliente principal
        const { error: updateError } = await supabase
            .from('clients')
            .update({
                active_membership_id: membershipId,
                membership_start_date: startDate.toISOString().split('T')[0],
                membership_expiry_date: expiryDate.toISOString().split('T')[0],
                status: 'active'
            })
            .eq('id', clientId);

        if (updateError) throw updateError;

        // Registrar transacción (solo paga una vez, pero múltiples personas tienen acceso)
        const isRenewal = client.active_membership_id === membershipId;
        const { error: txError } = await supabase
            .from('transactions')
            .insert([{
                client_id: clientId,
                client_name: `${client.first_name} ${client.last_name}${isPromotion ? ` (+ ${beneficiariesCount - 1} más)` : ''}`,
                item_description: membership.name,
                amount: membership.cost,
                type: isRenewal ? 'membership_renewal' : 'membership_new'
            }]);

        if (txError) throw txError;

        // Si es promoción, crear membresías adicionales para beneficiarios
        if (isPromotion && beneficiariesCount > 1) {
            // Aquí el gimnasio debe agregar los beneficiarios manualmente desde Clients
            // O podría mostrar un modal para hacerlo inmediatamente
            console.log(`Promoción activada: ${beneficiariesCount} beneficiarios pueden usar esta membresía`);
        }
    }
};

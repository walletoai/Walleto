import { supabase } from '../lib/supabase';
import { API_URL as BASE_API_URL } from '../config/api';

const API_URL = `${BASE_API_URL}/api/exchanges`;

// Helper to get auth headers with the current session token
async function getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

export interface ExchangeConnection {
    id: string;
    user_id: string;
    exchange_name: string;
    api_key_last_4: string;  // Only last 4 chars for security
    last_sync_time: string | null;
    last_sync_status: string | null;
    created_at: string;
}

export interface CreateConnectionRequest {
    user_id: string;
    exchange_name: string;
    api_key: string;
    api_secret: string;
    api_passphrase?: string;
}

export const getConnections = async (userId: string): Promise<ExchangeConnection[]> => {
    // Use Supabase directly to avoid backend dependency
    const { data, error } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[getConnections] Supabase error:', error);
        throw new Error('Failed to fetch connections');
    }

    // Map the data to include api_key_last_4 (derived from encrypted key or use placeholder)
    return (data || []).map(conn => ({
        id: conn.id,
        user_id: conn.user_id,
        exchange_name: conn.exchange_name,
        api_key_last_4: conn.api_key_last_4 || (conn.api_key_encrypted ? '••••' : '****'),
        last_sync_time: conn.last_sync_time,
        last_sync_status: conn.last_sync_status,
        created_at: conn.created_at,
    }));
};

export const addConnection = async (data: CreateConnectionRequest): Promise<ExchangeConnection> => {
    const headers = await getAuthHeaders();
    const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Authentication required');
        if (response.status === 403) throw new Error('Access denied');
        const err = await response.json();
        throw new Error(err.detail || 'Failed to add connection');
    }
    return response.json();
};

export const deleteConnection = async (id: string): Promise<void> => {
    // Use Supabase directly
    const { error } = await supabase
        .from('exchange_connections')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[deleteConnection] Supabase error:', error);
        throw new Error('Failed to delete connection');
    }
};

export interface SyncStatus {
    connection_id: string;
    exchange_name: string;
    last_sync_time: string | null;
    last_sync_status: string;
    last_error: string | null;
    next_sync_scheduled: string;
}

export const syncTrades = async (id: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/${id}/sync`, {
        method: 'POST',
        headers,
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Authentication required');
        if (response.status === 403) throw new Error('Access denied');
        throw new Error('Failed to start sync');
    }
};

export const getSyncStatus = async (id: string): Promise<SyncStatus> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/${id}/sync-status`, { headers });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Authentication required');
        if (response.status === 403) throw new Error('Access denied');
        throw new Error('Failed to get sync status');
    }
    return response.json();
};

export const syncTradesToSupabase = async (userId: string): Promise<any> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_API_URL}/api/trades/${userId}/sync-to-supabase`, {
        method: 'POST',
        headers,
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Authentication required');
        if (response.status === 403) throw new Error('Access denied');
        throw new Error('Failed to sync trades to Supabase');
    }
    return response.json();
};

export const deleteAllTrades = async (userId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_API_URL}/api/trades/${userId}`, {
        method: 'DELETE',
        headers,
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Authentication required');
        if (response.status === 403) throw new Error('Access denied');
        throw new Error('Failed to delete all trades');
    }
};

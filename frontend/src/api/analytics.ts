import { API_URL as BASE_API_URL } from '../config/api';

const API_URL = `${BASE_API_URL}/api/analytics`;

export interface Benchmarks {
    avg_win_rate: number;
    top_win_rate: number;
    avg_pnl_per_trade: number;
    total_traders: number;
}

export const getBenchmarks = async (): Promise<Benchmarks> => {
    const response = await fetch(`${API_URL}/benchmarks`);
    if (!response.ok) {
        throw new Error('Failed to fetch benchmarks');
    }
    return response.json();
};

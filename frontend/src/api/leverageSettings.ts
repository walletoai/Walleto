/**
 * API client for leverage settings - allows users to set default leverage per symbol
 */

import { API_URL } from '../config/api';

export interface LeverageSetting {
  id?: string;
  user_id?: string;
  symbol: string;
  leverage: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get all leverage settings for a user
 */
export async function getLeverageSettings(userId: string): Promise<LeverageSetting[]> {
  try {
    const response = await fetch(`${API_URL}/api/leverage-settings/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch leverage settings: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching leverage settings:', error);
    throw error;
  }
}

/**
 * Set or update leverage setting for a symbol
 */
export async function setLeverageSetting(
  userId: string,
  symbol: string,
  leverage: number
): Promise<{ success: boolean; message: string; data?: LeverageSetting }> {
  try {
    const response = await fetch(`${API_URL}/api/leverage-settings/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol, leverage }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set leverage: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error setting leverage:', error);
    throw error;
  }
}

/**
 * Delete leverage setting for a symbol (reset to default 1x)
 */
export async function deleteLeverageSetting(
  userId: string,
  symbol: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_URL}/api/leverage-settings/${userId}/${symbol}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete leverage setting: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting leverage setting:', error);
    throw error;
  }
}

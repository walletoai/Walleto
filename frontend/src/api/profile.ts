import { supabase } from "../lib/supabase";
import { API_URL } from "../config/api";

export interface UserProfile {
    user_id: string;
    username: string;
    bio: string;
    avatar_url: string;
    is_private?: number;
}

export async function getProfile(userId?: string): Promise<UserProfile> {
    let uid = userId;
    if (!uid) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Not authenticated");
        uid = session.user.id;
    }

    const response = await fetch(`${API_URL}/api/profile/${uid}`);
    if (!response.ok) throw new Error("Failed to fetch profile");
    return response.json();
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/api/profile/${session.user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update profile");
    return response.json();
}

import { supabase } from "../lib/supabase";
import { API_URL } from "../config/api";

export interface CalendarEvent {
    id?: number;
    title: string;
    description?: string;
    date: string; // YYYY-MM-DD
    is_system: boolean;
}

export async function getEvents(): Promise<CalendarEvent[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/api/calendar/events?user_id=${session.user.id}`);
    if (!response.ok) throw new Error("Failed to fetch events");
    const data = await response.json();
    return data.events;
}

export async function createEvent(event: { title: string; description?: string; event_date: string }): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/api/calendar/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...event, user_id: session.user.id }),
    });
    if (!response.ok) throw new Error("Failed to create event");
}

export async function deleteEvent(id: number): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not authenticated");

    const response = await fetch(`${API_URL}/api/calendar/events/${id}?user_id=${session.user.id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete event");
}

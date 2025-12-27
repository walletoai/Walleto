
import { SupportTicket } from '../types';

const STORAGE_KEY = 'walleto_support_tickets';

export const getTickets = (): SupportTicket[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load tickets", e);
    return [];
  }
};

export const createTicket = async (name: string, email: string, subject: string, message: string): Promise<SupportTicket> => {
  // 1. REAL BACKEND CALL
  // Sends the support request to the Cloud Run endpoint
  try {
    const response = await fetch("https://sendsupportemail-61773256360.us-east1.run.app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        subject: subject,
        message: message
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }
    // We do not parse the response body, just assume success if status is OK.
  } catch (error) {
    console.error("Backend API Error:", error);
    throw error; // Re-throw to trigger the error UI in the component
  }

  // 2. Generate Ticket Data (Client side generation for history view)
  const ticketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000).toString();

  const newTicket: SupportTicket = {
    id: Date.now().toString(),
    ticketNumber: ticketId,
    userName: name,
    userEmail: email,
    subject: subject,
    message: message,
    status: 'OPEN',
    createdAt: Date.now()
  };

  // 3. Save to "Database" (LocalStorage)
  const currentTickets = getTickets();
  const updatedTickets = [newTicket, ...currentTickets];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTickets));

  return newTicket;
};

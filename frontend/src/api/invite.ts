import { API_URL } from "../config/api";

interface WaitlistResponse {
  success: boolean;
  message: string;
  position?: number;
  already_registered?: boolean;
}

interface ValidateCodeResponse {
  valid: boolean;
  message: string;
  locked_email?: string;
}

export async function joinWaitlist(
  email: string,
  name?: string,
  source?: string
): Promise<WaitlistResponse> {
  const response = await fetch(`${API_URL}/api/invite/waitlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      name,
      source: source || "landing_page",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to join waitlist");
  }

  return response.json();
}

export async function validateInviteCode(
  code: string,
  email?: string
): Promise<ValidateCodeResponse> {
  const response = await fetch(`${API_URL}/api/invite/validate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      email,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to validate code");
  }

  return response.json();
}

export async function redeemInviteCode(
  code: string,
  userId: string,
  email: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${API_URL}/api/invite/redeem?code=${encodeURIComponent(code)}&user_id=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to redeem code");
  }

  return response.json();
}

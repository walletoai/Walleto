"""
SendGrid Email Service for Walleto
Handles transactional emails with premium branded templates
"""

import os
import logging
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "support@walleto.ai")
FROM_NAME = os.getenv("FROM_NAME", "Walleto")

# Initialize SendGrid client
sg_client = None
if SENDGRID_API_KEY:
    sg_client = SendGridAPIClient(SENDGRID_API_KEY)
else:
    logger.warning("SENDGRID_API_KEY not configured - emails will not be sent")


def get_base_template(content: str, preview_text: str = "") -> str:
    """
    Base HTML email template with Walleto branding
    Matches Supabase email template style
    """
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Walleto</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #d4af37; letter-spacing: -0.5px;">Walleto</h1>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #262626;">
                                <tr>
                                    <td style="padding: 40px;">
                                        {content}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-top: 32px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666666;">Walleto - AI-Powered Trading Journal</p>
                            <p style="margin: 0; font-size: 12px; color: #444444;"><a href="https://walleto.ai" style="color: #d4af37; text-decoration: none;">walleto.ai</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''


def get_waitlist_confirmation_template(name: Optional[str] = None) -> tuple[str, str]:
    """Returns (subject, html_content) for waitlist confirmation email"""

    greeting = f"Hi {name}," if name else "Hi there,"

    content = f'''<h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">You're on the list</h2>
                                        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">{greeting}</p>
                                        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">Thank you for your interest in Walleto. We're building the most sophisticated trading journal for perpetual futures traders, complete with AI-powered insights and analytics.</p>
                                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">We're rolling out access in waves, and you'll be among the first to experience what we've been building.</p>
                                        <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">We'll reach out as soon as your spot opens up.</p>
                                        <p style="margin: 24px 0 0 0; font-size: 16px; color: #ffffff;">— The Walleto Team</p>'''

    subject = "You're on the Walleto waitlist"
    html = get_base_template(content)

    return subject, html


def get_invite_code_template(code: str, name: Optional[str] = None, expires_at: Optional[str] = None) -> tuple[str, str]:
    """Returns (subject, html_content) for invite code delivery email"""

    greeting = f"Hi {name}," if name else "Hi there,"
    expiry_text = f"This code expires on {expires_at}." if expires_at else ""

    content = f'''<h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">Your exclusive access is ready</h2>
                                        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">{greeting}</p>
                                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">You've been granted early access to Walleto. Use the invite code below to create your account and start tracking your trades with AI-powered insights.</p>
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                            <tr>
                                                <td align="center">
                                                    <table role="presentation" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border: 2px solid #d4af37; border-radius: 12px;">
                                                        <tr>
                                                            <td style="padding: 24px 48px; text-align: center;">
                                                                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 500; color: #d4af37; text-transform: uppercase; letter-spacing: 1px;">Your Invite Code</p>
                                                                <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: 2px;">{code}</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                            <tr>
                                                <td align="center">
                                                    <a href="https://app.walleto.ai/signup?code={code}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">Create Your Account</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">If the button doesn't work, copy your invite code and go to <a href="https://app.walleto.ai/signup" style="color: #d4af37; text-decoration: none;">app.walleto.ai/signup</a></p>
                                        <p style="margin: 24px 0 0 0; font-size: 16px; color: #ffffff;">— The Walleto Team</p>'''

    subject = "Your Walleto invite code is here"
    html = get_base_template(content)

    return subject, html


def get_welcome_template(name: Optional[str] = None) -> tuple[str, str]:
    """Returns (subject, html_content) for welcome email after signup"""

    greeting = f"Welcome, {name}!" if name else "Welcome to Walleto!"

    content = f'''<h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">{greeting}</h2>
                                        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">Your account is ready. You now have access to the most powerful trading journal built for perpetual futures traders.</p>
                                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">Connect your exchange, sync your trades, and let our AI coach help you identify patterns in your trading.</p>
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                            <tr>
                                                <td align="center">
                                                    <a href="https://app.walleto.ai/dashboard" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">Go to Dashboard</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">Questions? Just reply to this email — we're here to help.</p>
                                        <p style="margin: 24px 0 0 0; font-size: 16px; color: #ffffff;">— The Walleto Team</p>'''

    subject = "Welcome to Walleto"
    html = get_base_template(content)

    return subject, html


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    to_name: Optional[str] = None
) -> bool:
    """
    Send an email via SendGrid
    Returns True if successful, False otherwise
    """
    if not sg_client:
        logger.warning(f"SendGrid not configured - would send email to {to_email}: {subject}")
        return False

    try:
        message = Mail(
            from_email=Email(FROM_EMAIL, FROM_NAME),
            to_emails=To(to_email, to_name),
            subject=subject,
            html_content=HtmlContent(html_content)
        )

        response = sg_client.send(message)

        if response.status_code in [200, 201, 202]:
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        else:
            logger.error(f"SendGrid error {response.status_code}: {response.body}")
            return False

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


async def send_waitlist_confirmation(
    email: str,
    name: Optional[str] = None
) -> bool:
    """Send waitlist confirmation email"""
    subject, html = get_waitlist_confirmation_template(name)
    return await send_email(email, subject, html, name)


async def send_invite_code(
    email: str,
    code: str,
    name: Optional[str] = None,
    expires_at: Optional[str] = None
) -> bool:
    """Send invite code delivery email"""
    subject, html = get_invite_code_template(code, name, expires_at)
    return await send_email(email, subject, html, name)


async def send_welcome_email(
    email: str,
    name: Optional[str] = None
) -> bool:
    """Send welcome email after signup"""
    subject, html = get_welcome_template(name)
    return await send_email(email, subject, html, name)

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
    Dark theme with gold accents matching the premium app design
    """
    return f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Walleto</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {{font-family: Arial, Helvetica, sans-serif !important;}}
    </style>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Preview text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        {preview_text}
    </div>

    <!-- Email wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Main container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                    <!-- Logo Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 32px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%); -webkit-background-clip: text; background-clip: text;">
                                        <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #d4af37; letter-spacing: -0.5px;">
                                            Walleto
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content Card -->
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

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 32px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666666;">
                                Walleto - AI-Powered Trading Journal
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #444444;">
                                <a href="https://walleto.ai" style="color: #d4af37; text-decoration: none;">walleto.ai</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
'''


def get_waitlist_confirmation_template(name: Optional[str] = None, position: int = 0) -> tuple[str, str]:
    """Returns (subject, html_content) for waitlist confirmation email"""

    greeting = f"Hi {name}," if name else "Hi there,"
    position_text = f"You're <span style='color: #d4af37; font-weight: 600;'>#{position}</span> on the waitlist." if position > 0 else ""

    content = f'''
        <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
            You're on the list
        </h2>

        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            {greeting}
        </p>

        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            Thank you for your interest in Walleto. We're building the most sophisticated
            trading journal for perpetual futures traders, complete with AI-powered insights
            and analytics.
        </p>

        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            {position_text} We're rolling out access in waves, and you'll be among the first
            to experience what we've been building.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px 0; padding: 24px; background-color: #1a1a1a; border-radius: 12px; border-left: 3px solid #d4af37; width: 100%;">
            <tr>
                <td>
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #d4af37; text-transform: uppercase; letter-spacing: 0.5px;">
                        What's Coming
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #a3a3a3; font-size: 15px; line-height: 1.8;">
                        <li>Multi-exchange sync (Binance, Bybit, Blofin, Hyperliquid)</li>
                        <li>AI trading coach with personalized insights</li>
                        <li>36+ analytics widgets & trade replay</li>
                        <li>Pattern detection & performance tracking</li>
                    </ul>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            We'll reach out as soon as your spot opens up.
        </p>

        <p style="margin: 24px 0 0 0; font-size: 16px; color: #ffffff;">
            — The Walleto Team
        </p>
    '''

    subject = "You're on the Walleto waitlist"
    html = get_base_template(content, "Thank you for joining the Walleto waitlist. We'll notify you when early access is available.")

    return subject, html


def get_invite_code_template(code: str, name: Optional[str] = None, expires_at: Optional[str] = None) -> tuple[str, str]:
    """Returns (subject, html_content) for invite code delivery email"""

    greeting = f"Hi {name}," if name else "Hi there,"
    expiry_text = f"<p style='margin: 16px 0 0 0; font-size: 13px; color: #666666;'>This code expires on {expires_at}.</p>" if expires_at else ""

    content = f'''
        <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
            Your exclusive access is ready
        </h2>

        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            {greeting}
        </p>

        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            You've been granted early access to Walleto. Use the invite code below
            to create your account and start tracking your trades with AI-powered insights.
        </p>

        <!-- Invite Code Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%); border: 2px solid #d4af37; border-radius: 12px;">
                        <tr>
                            <td style="padding: 24px 48px;">
                                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 500; color: #d4af37; text-transform: uppercase; letter-spacing: 1px;">
                                    Your Invite Code
                                </p>
                                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
                                    {code}
                                </p>
                                {expiry_text}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
            <tr>
                <td align="center">
                    <a href="https://app.walleto.ai/signup?code={code}"
                       style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                        Create Your Account
                    </a>
                </td>
            </tr>
        </table>

        <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
            If the button doesn't work, copy your invite code and go to
            <a href="https://app.walleto.ai/signup" style="color: #d4af37; text-decoration: none;">app.walleto.ai/signup</a>
        </p>

        <p style="margin: 32px 0 0 0; font-size: 16px; color: #ffffff;">
            — The Walleto Team
        </p>
    '''

    subject = "Your Walleto invite code is here"
    html = get_base_template(content, f"Your exclusive Walleto invite code: {code}. Create your account now.")

    return subject, html


def get_welcome_template(name: Optional[str] = None) -> tuple[str, str]:
    """Returns (subject, html_content) for welcome email after signup"""

    greeting = f"Welcome, {name}!" if name else "Welcome to Walleto!"

    content = f'''
        <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
            {greeting}
        </h2>

        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            Your account is ready. You now have access to the most powerful trading
            journal built for perpetual futures traders.
        </p>

        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a3a3a3;">
            Here's how to get started:
        </p>

        <!-- Steps -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
            <tr>
                <td style="padding: 16px 0; border-bottom: 1px solid #262626;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width: 40px; vertical-align: top;">
                                <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 600; color: #000000;">1</div>
                            </td>
                            <td>
                                <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #ffffff;">Connect your exchange</p>
                                <p style="margin: 0; font-size: 14px; color: #666666;">Link Binance, Bybit, Blofin, or Hyperliquid with read-only API keys</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px 0; border-bottom: 1px solid #262626;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width: 40px; vertical-align: top;">
                                <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 600; color: #000000;">2</div>
                            </td>
                            <td>
                                <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #ffffff;">Sync your trades</p>
                                <p style="margin: 0; font-size: 14px; color: #666666;">We'll automatically import your trading history</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width: 40px; vertical-align: top;">
                                <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: 600; color: #000000;">3</div>
                            </td>
                            <td>
                                <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #ffffff;">Meet your AI coach</p>
                                <p style="margin: 0; font-size: 14px; color: #666666;">Get personalized insights and identify patterns in your trading</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
            <tr>
                <td align="center">
                    <a href="https://app.walleto.ai/dashboard"
                       style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #d4af37 0%, #b8960c 100%); color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                        Go to Dashboard
                    </a>
                </td>
            </tr>
        </table>

        <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
            Questions? Just reply to this email — we're here to help.
        </p>

        <p style="margin: 24px 0 0 0; font-size: 16px; color: #ffffff;">
            — The Walleto Team
        </p>
    '''

    subject = "Welcome to Walleto - Let's get started"
    html = get_base_template(content, "Your Walleto account is ready. Here's how to get started with your AI-powered trading journal.")

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
    name: Optional[str] = None,
    position: int = 0
) -> bool:
    """Send waitlist confirmation email"""
    subject, html = get_waitlist_confirmation_template(name, position)
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

// Support bot for the landing page
// Uses keyword matching for common questions

export const querySupportBot = async (userQuery: string): Promise<string> => {
  const lowerQuery = userQuery.toLowerCase();

  // Greetings
  if (lowerQuery.match(/^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening|greetings)/)) {
    return "Hello! Welcome to Walleto Support. I'm here to help you with any questions about our trading journal platform. What can I assist you with today?";
  }

  // What is Walleto / About
  if (lowerQuery.includes('what is walleto') || lowerQuery.includes('about walleto') || lowerQuery.includes('tell me about') || lowerQuery.includes('what do you do') || lowerQuery.includes('what does walleto do')) {
    return "Walleto is a premium crypto trading journal designed for perpetual traders. It helps you track your trades, analyze your performance, identify behavioral patterns like revenge trading or FOMO, and improve your trading psychology with our AI Coach.";
  }

  // Platforms / Exchanges / Supported
  if (lowerQuery.includes('platform') || lowerQuery.includes('exchange') || lowerQuery.includes('support') || lowerQuery.includes('binance') || lowerQuery.includes('bybit') || lowerQuery.includes('blofin') || lowerQuery.includes('hyperliquid') || lowerQuery.includes('connect') || lowerQuery.includes('sync') || lowerQuery.includes('integrate')) {
    return "We currently support API integration with Binance, Bybit, Blofin, and Hyperliquid. For other exchanges, you can import your trade history via CSV. We're actively expanding our exchange support based on user demand.";
  }

  // Pricing / Cost
  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('subscription') || lowerQuery.includes('pay') || lowerQuery.includes('free') || lowerQuery.includes('money') || lowerQuery.includes('charge') || lowerQuery.includes('fee') || lowerQuery.includes('plan') || lowerQuery.includes('tier')) {
    return "Walleto is currently in private beta. Pricing will be revealed upon public launch in 2025. Early access members will receive exclusive lifetime discounts! Join the waitlist to secure your spot.";
  }

  // AI Coach
  if (lowerQuery.includes('ai') || lowerQuery.includes('coach') || lowerQuery.includes('analysis') || lowerQuery.includes('analyze') || lowerQuery.includes('insight') || lowerQuery.includes('pattern') || lowerQuery.includes('mistake') || lowerQuery.includes('psychology') || lowerQuery.includes('behavior') || lowerQuery.includes('fomo') || lowerQuery.includes('revenge')) {
    return "Walleto's AI Coach analyzes your trading behavior in real-time. It detects patterns like revenge trading, FOMO, and over-leveraging, then provides personalized insights to help you become a more disciplined trader.";
  }

  // Security / Privacy / Data
  if (lowerQuery.includes('secure') || lowerQuery.includes('security') || lowerQuery.includes('safe') || lowerQuery.includes('data') || lowerQuery.includes('privacy') || lowerQuery.includes('encrypt') || lowerQuery.includes('protect') || lowerQuery.includes('api key') || lowerQuery.includes('withdrawal')) {
    return "Your security is our priority. We use AES-256 encryption for all stored data. We only require read-only API keys - never withdrawal permissions. Your trading data stays encrypted and private. We never share your data with third parties.";
  }

  // Beta / Early Access / Waitlist / Join / Sign up
  if (lowerQuery.includes('beta') || lowerQuery.includes('early access') || lowerQuery.includes('waitlist') || lowerQuery.includes('join') || lowerQuery.includes('sign up') || lowerQuery.includes('signup') || lowerQuery.includes('register') || lowerQuery.includes('access') || lowerQuery.includes('invite') || lowerQuery.includes('code')) {
    return "Walleto is currently in invite-only private beta. You can join the waitlist by clicking 'Early Access' on our homepage. If you have an invite code, click 'Early Access' and select 'I have an invite code' to sign up immediately!";
  }

  // Features / What can it do
  if (lowerQuery.includes('feature') || lowerQuery.includes('what can') || lowerQuery.includes('what does') || lowerQuery.includes('capability') || lowerQuery.includes('function') || lowerQuery.includes('offer') || lowerQuery.includes('include') || lowerQuery.includes('tool')) {
    return "Walleto offers: Advanced trade journaling with AI insights, AI Coach for behavioral analysis, Visual trade replay to review your trades candle-by-candle, Risk management calculator, and Comprehensive performance analytics. All designed to help you master your trading psychology!";
  }

  // How to use / Getting started / Tutorial
  if (lowerQuery.includes('how to') || lowerQuery.includes('how do i') || lowerQuery.includes('getting started') || lowerQuery.includes('start') || lowerQuery.includes('begin') || lowerQuery.includes('setup') || lowerQuery.includes('tutorial') || lowerQuery.includes('guide') || lowerQuery.includes('use')) {
    return "Getting started with Walleto is easy! Once you have access: 1) Connect your exchange via API or import trades via CSV, 2) Review your trades in the dashboard, 3) Chat with the AI Coach for personalized insights, 4) Track your progress over time. Need more help? Submit a support ticket!";
  }

  // CSV / Import / Upload / Export
  if (lowerQuery.includes('csv') || lowerQuery.includes('import') || lowerQuery.includes('upload') || lowerQuery.includes('export') || lowerQuery.includes('file') || lowerQuery.includes('download')) {
    return "You can import trades via CSV from any exchange! Just export your trade history from your exchange and upload it to Walleto. We support standard CSV formats and will automatically parse your trades. You can also export your journal data anytime.";
  }

  // Journal / Log / Track / Record
  if (lowerQuery.includes('journal') || lowerQuery.includes('log') || lowerQuery.includes('track') || lowerQuery.includes('record') || lowerQuery.includes('entry') || lowerQuery.includes('note') || lowerQuery.includes('diary')) {
    return "Walleto's trading journal lets you log all your trades automatically via API sync or manually. You can add notes, screenshots, setups, and track your emotions. The AI Coach analyzes your journal to find patterns and help you improve.";
  }

  // Dashboard / Stats / Performance / Analytics
  if (lowerQuery.includes('dashboard') || lowerQuery.includes('stat') || lowerQuery.includes('performance') || lowerQuery.includes('analytic') || lowerQuery.includes('metric') || lowerQuery.includes('profit') || lowerQuery.includes('loss') || lowerQuery.includes('pnl') || lowerQuery.includes('win rate')) {
    return "The Walleto dashboard shows all your key trading metrics: total P&L, win rate, average win/loss, best and worst trades, performance by pair, by session, and more. You can filter by date range and get AI-powered insights on your performance.";
  }

  // Mobile / App / Phone
  if (lowerQuery.includes('mobile') || lowerQuery.includes('phone') || lowerQuery.includes('ios') || lowerQuery.includes('android') || lowerQuery.includes('app store') || lowerQuery.includes('play store')) {
    return "Walleto is currently a web-based application optimized for desktop and mobile browsers. Native iOS and Android apps are on our roadmap for future development. You can access Walleto from any device with a web browser!";
  }

  // Contact / Support / Help / Email
  if (lowerQuery.includes('contact') || lowerQuery.includes('email') || lowerQuery.includes('reach') || lowerQuery.includes('talk to') || lowerQuery.includes('human') || lowerQuery.includes('person') || lowerQuery.includes('team')) {
    return "You can reach our support team by submitting a ticket through this chat (click 'Bot not helpful?' below) or email us directly at support@walleto.ai. We typically respond within 24 hours!";
  }

  // Crypto / Trading / Perpetual
  if (lowerQuery.includes('crypto') || lowerQuery.includes('perpetual') || lowerQuery.includes('futures') || lowerQuery.includes('leverage') || lowerQuery.includes('margin') || lowerQuery.includes('trading')) {
    return "Walleto is specifically designed for crypto perpetual/futures traders. We understand the unique challenges of leveraged trading - that's why our AI Coach focuses on risk management, position sizing, and trading psychology to help you stay disciplined.";
  }

  // Thanks / Appreciation
  if (lowerQuery.includes('thank') || lowerQuery.includes('thanks') || lowerQuery.includes('appreciate') || lowerQuery.includes('helpful') || lowerQuery.includes('great') || lowerQuery.includes('awesome') || lowerQuery.includes('perfect')) {
    return "You're welcome! I'm glad I could help. If you have any other questions, feel free to ask. Happy trading!";
  }

  // Bye / Goodbye
  if (lowerQuery.includes('bye') || lowerQuery.includes('goodbye') || lowerQuery.includes('see you') || lowerQuery.includes('later') || lowerQuery.includes('that\'s all')) {
    return "Goodbye! Thanks for chatting with Walleto Support. If you need help in the future, we're always here. Happy trading!";
  }

  // When / Launch / Release
  if (lowerQuery.includes('when') || lowerQuery.includes('launch') || lowerQuery.includes('release') || lowerQuery.includes('available') || lowerQuery.includes('public')) {
    return "Walleto is currently in private beta and will launch publicly in 2025. Join the waitlist to get early access and exclusive lifetime discounts when we launch!";
  }

  // Who / Team / Company
  if (lowerQuery.includes('who') || lowerQuery.includes('team') || lowerQuery.includes('company') || lowerQuery.includes('founder') || lowerQuery.includes('made') || lowerQuery.includes('built') || lowerQuery.includes('create')) {
    return "Walleto was created by a team of traders and developers who understand the challenges of crypto trading. Our mission is to help traders improve their performance through better journaling and AI-powered insights.";
  }

  // Yes / No / Ok simple responses
  if (lowerQuery.match(/^(yes|no|ok|okay|sure|yep|nope|yeah|nah)$/)) {
    return "Is there anything specific I can help you with? Feel free to ask about our features, supported exchanges, pricing, or how to get started!";
  }

  // Question marks - they're asking something
  if (lowerQuery.includes('?')) {
    return "That's a great question! Walleto is a crypto trading journal with AI coaching. We support Binance, Bybit, Blofin, and Hyperliquid via API, plus CSV import for any exchange. We're in private beta now - join the waitlist for early access! Is there something specific I can help clarify?";
  }

  // Default - try to be helpful
  return "I'd be happy to help! You can ask me about: supported exchanges, features, pricing, how to get started, security, or the AI Coach. What would you like to know?";
};

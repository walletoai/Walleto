/**
 * Content Moderation Utility
 * Multi-layer content filtering system for posts and comments
 */

// Comprehensive bad words list
const BAD_WORDS = [
  // Common profanities
  'badword1', 'badword2', 'explicit', 'nsfw',
  // Add more as needed - this is a starter list
];

// Explicit content patterns (simplified)
const EXPLICIT_PATTERNS = [
  /sex/gi,
  /porn/gi,
  /xxx/gi,
];

// Hate speech keywords
const HATE_SPEECH_KEYWORDS = [
  'hatespeech1',
  'hatespeech2',
  // Add more as needed
];

// Spam patterns
const SPAM_INDICATORS = {
  excessive_caps: /[A-Z]{10,}/g, // 10+ consecutive caps
  excessive_repetition: /(.)\1{5,}/g, // 6+ repeated characters
  excessive_emojis: /[\p{Emoji}]/gu, // More than 5 emojis
};

// Suspicious links
const SUSPICIOUS_LINK_PATTERNS = [
  /bit\.ly/gi,
  /tinyurl/gi,
  /short\.link/gi,
];

export interface ModerationResult {
  isClean: boolean;
  severity: 'none' | 'warning' | 'blocked';
  message: string;
  details: string[];
}

/**
 * Check for profanities and bad language
 */
function checkProfanity(content: string): { passed: boolean; message?: string } {
  const lowerContent = content.toLowerCase();

  for (const word of BAD_WORDS) {
    if (lowerContent.includes(word.toLowerCase())) {
      return {
        passed: false,
        message: 'Your post contains inappropriate language. Please revise and try again.',
      };
    }
  }

  return { passed: true };
}

/**
 * Check for explicit sexual content
 */
function checkExplicitContent(content: string): { passed: boolean; message?: string } {
  for (const pattern of EXPLICIT_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: false,
        message: 'Your post contains explicit content. Please keep discussions appropriate.',
      };
    }
  }

  return { passed: true };
}

/**
 * Check for hate speech
 */
function checkHateSpeech(content: string): { passed: boolean; message?: string } {
  const lowerContent = content.toLowerCase();

  for (const keyword of HATE_SPEECH_KEYWORDS) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      return {
        passed: false,
        message: 'Your post contains inappropriate language targeting groups. Please be respectful.',
      };
    }
  }

  return { passed: true };
}

/**
 * Check for spam patterns
 */
function checkSpamPatterns(content: string): { passed: boolean; message?: string; warning?: boolean } {
  const issues: string[] = [];

  // Check excessive caps
  const capsMatches = content.match(SPAM_INDICATORS.excessive_caps);
  if (capsMatches) {
    issues.push('excessive capital letters');
  }

  // Check excessive repetition
  const repeatMatches = content.match(SPAM_INDICATORS.excessive_repetition);
  if (repeatMatches) {
    issues.push('excessive character repetition');
  }

  // Check excessive emojis
  const emojiMatches = content.match(SPAM_INDICATORS.excessive_emojis);
  if (emojiMatches && emojiMatches.length > 5) {
    issues.push('too many emojis');
  }

  if (issues.length > 0) {
    return {
      passed: true, // Warning only, not blocked
      warning: true,
      message: `Your post has ${issues.join(', ')}. Consider toning it down for better readability.`,
    };
  }

  return { passed: true };
}

/**
 * Check for suspicious links
 */
function checkSuspiciousLinks(content: string): { passed: boolean; message?: string; warning?: boolean } {
  for (const pattern of SUSPICIOUS_LINK_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: true, // Warning only
        warning: true,
        message: 'Your post contains a shortened URL. We recommend using full URLs for transparency.',
      };
    }
  }

  return { passed: true };
}

/**
 * Check if content is empty
 */
function checkEmpty(content: string): { passed: boolean; message?: string } {
  if (!content || content.trim().length === 0) {
    return {
      passed: false,
      message: 'Post cannot be empty. Please write something!',
    };
  }

  return { passed: true };
}

/**
 * Check if content is too long
 */
function checkLength(content: string, maxLength: number = 5000): { passed: boolean; message?: string } {
  if (content.length > maxLength) {
    return {
      passed: false,
      message: `Your post is too long. Maximum ${maxLength} characters allowed.`,
    };
  }

  return { passed: true };
}

/**
 * Main moderation function - Hybrid filtering approach
 * Blocks obvious violations, warns on suspicious patterns, allows override
 */
export function checkModeration(content: string): ModerationResult {
  const details: string[] = [];
  let severity: 'none' | 'warning' | 'blocked' = 'none';

  // Layer 1: Check if empty
  const emptyCheck = checkEmpty(content);
  if (!emptyCheck.passed) {
    return {
      isClean: false,
      severity: 'blocked',
      message: emptyCheck.message || 'Post cannot be empty',
      details: [],
    };
  }

  // Layer 2: Check length
  const lengthCheck = checkLength(content);
  if (!lengthCheck.passed) {
    return {
      isClean: false,
      severity: 'blocked',
      message: lengthCheck.message || 'Post is too long',
      details: [],
    };
  }

  // Layer 3: Block obvious bad content (hard blocks)
  const profanityCheck = checkProfanity(content);
  if (!profanityCheck.passed) {
    return {
      isClean: false,
      severity: 'blocked',
      message: profanityCheck.message || 'Content contains inappropriate language',
      details: ['Profanity detected'],
    };
  }

  const explicitCheck = checkExplicitContent(content);
  if (!explicitCheck.passed) {
    return {
      isClean: false,
      severity: 'blocked',
      message: explicitCheck.message || 'Content is too explicit',
      details: ['Explicit content detected'],
    };
  }

  const hateSpeechCheck = checkHateSpeech(content);
  if (!hateSpeechCheck.passed) {
    return {
      isClean: false,
      severity: 'blocked',
      message: hateSpeechCheck.message || 'Content contains inappropriate language',
      details: ['Hate speech detected'],
    };
  }

  // Layer 4 & 5: Warnings only (don't block, just warn)
  const spamCheck = checkSpamPatterns(content);
  if (spamCheck.warning) {
    severity = 'warning';
    details.push('Spam patterns detected');
  }

  const linkCheck = checkSuspiciousLinks(content);
  if (linkCheck.warning) {
    severity = 'warning';
    details.push('Suspicious links detected');
  }

  return {
    isClean: true,
    severity,
    message:
      severity === 'warning'
        ? spamCheck.message || linkCheck.message || 'Your post looks good, but has some issues'
        : 'Your post looks good!',
    details,
  };
}

/**
 * Client-side validation - quick check before submission
 */
export function validatePostContent(content: string): {
  isValid: boolean;
  warning?: string;
  error?: string;
} {
  const moderation = checkModeration(content);

  if (moderation.severity === 'blocked') {
    return {
      isValid: false,
      error: moderation.message,
    };
  }

  if (moderation.severity === 'warning') {
    return {
      isValid: true,
      warning: moderation.message,
    };
  }

  return {
    isValid: true,
  };
}

export const APP_CONFIG = {
  pagination: {
    pageSize: 20,
  },
  validation: {
    maxSearchQueryLength: 500,
    maxTitleLength: 200,
    minTitleLength: 1,
  },
  auth: {
    allowedEmailDomains: process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS?.split(',') || [],
    requireEmailDomain: process.env.NEXT_PUBLIC_REQUIRE_EMAIL_DOMAIN === 'true',
  },
  storage: {
    signedUrlExpiry: 60,
  },
  debounce: {
    searchDelay: 300,
  },
} as const;

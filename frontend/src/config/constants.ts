// Network configuration
export const NETWORK = import.meta.env.VITE_SUI_NETWORK || 'testnet';

// Contract configuration
export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x5a44c1c0846bfb666b4db5289f4f51683373668737a768bf8a16c87a867f0ae5';

// Validate Package ID on load
if (!PACKAGE_ID || PACKAGE_ID === '0x0') {
  console.error('⚠️ PACKAGE_ID not configured! Please check your .env file');
}

// API configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Walrus configuration
export const WALRUS_PUBLISHER_URL = import.meta.env.VITE_WALRUS_PUBLISHER_URL || 
  'https://publisher.walrus-testnet.walrus.space';
export const WALRUS_AGGREGATOR_URL = import.meta.env.VITE_WALRUS_AGGREGATOR_URL || 
  'https://aggregator.walrus-testnet.walrus.space';

// Time constants
export const ONE_DAY_MS = 86400000;
export const ONE_WEEK_MS = 604800000;
export const ONE_MONTH_MS = 2592000000;

// Subscription periods (in milliseconds)
export const SUBSCRIPTION_PERIODS = [
  { label: '1 Day', value: ONE_DAY_MS },
  { label: '7 Days', value: ONE_WEEK_MS },
  { label: '30 Days', value: ONE_MONTH_MS },
  { label: '90 Days', value: ONE_MONTH_MS * 3 },
  { label: '365 Days', value: ONE_MONTH_MS * 12 },
];

// SUI decimals
export const SUI_DECIMALS = 9;
export const MIST_PER_SUI = 10 ** SUI_DECIMALS;

// Contract module names
export const MODULE_NAME = 'group';

// Function names
export const FUNCTIONS = {
  CREATE_GROUP: 'create_group_entry',
  SUBSCRIBE: 'subscribe_entry',
  PUBLISH_REPORT: 'publish_report_entry',
  SEAL_APPROVE: 'seal_approve',
} as const;


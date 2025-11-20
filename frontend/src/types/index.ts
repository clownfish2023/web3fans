export interface Group {
  id: string;
  name: string;
  description: string;
  owner: string;
  subscriptionFee: string;
  subscriptionPeriod: number;
  maxMembers: number;
  currentMembers: number;
  telegramGroupId: string;
  telegramInviteLink: string;
  reportCount: number;
  createdAt: number;
}

export interface Subscription {
  id: string;
  groupId: string;
  subscriber: string;
  telegramId: string;
  subscribedAt: number;
  expiresAt: number;
}

export interface Report {
  id: string;
  groupId: string;
  title: string;
  summary: string;
  walrusBlobId: string;
  sealKeyId: number[];
  publisher: string;
  publishedAt: number;
}

export interface CreateGroupForm {
  name: string;
  description: string;
  subscriptionFee: number;
  subscriptionPeriod: number;
  maxMembers: number;
  telegramGroupId: string;
  telegramInviteLink: string;
}

export interface PublishReportForm {
  title: string;
  summary: string;
  contentFile: File;
}

export interface SubscribeForm {
  telegramId: string;
}

export interface TelegramUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface WalletInfo {
  address: string;
  balance: string;
  isConnected: boolean;
}


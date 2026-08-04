import type { Request } from 'express';

export type CurrentUser = {
  id: string;
  providerSubject: string;
  phoneVerified: boolean;
};

export type AuthenticatedRequest = Request & {
  currentUser?: CurrentUser;
};

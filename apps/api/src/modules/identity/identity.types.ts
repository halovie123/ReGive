import type { Request } from 'express';

export type CurrentUser = {
  id: string;
  providerSubject: string;
};

export type AuthenticatedRequest = Request & {
  currentUser?: CurrentUser;
};

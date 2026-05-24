import type { user_role } from "./generated";

export type TenantContext = {
  libraryId: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
};

export type AuthContext = {
  userId: string;
  role: user_role;
  libraryIds: string[];
  sessionVersion: number;
};

export type CsrfContext = {
  required: boolean;
  validated: boolean;
};

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      auth?: AuthContext;
      csrf?: CsrfContext;
    }
  }
}

export {};

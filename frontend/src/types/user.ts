export type UserStatus = "active" | "inactive" | "invited" | "suspended";
export type AuthProvider = "email" | "google" | "microsoft" | "saml";
export type Gender =
  | "feminino"
  | "masculino"
  | "nao-binario"
  | "prefiro-nao-dizer";

export interface User {
  // Core identification
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  initials: string | null;
  
  // Professional info
  jobTitle: string | null;
  managerId: string | null;
  avatarUrl: string | null;
  
  // Personal info (optional, used in invite form)
  nickname: string | null;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  language: string;
  
  // Status and lifecycle
  status: UserStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  lastLoginAt: string | null;
  
  // Authentication
  authProvider: AuthProvider;
  authProviderId: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

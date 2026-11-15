export interface AuthSession {
  user: {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

export interface CustomerProfile {
  message: string;
  userId: string;
  customerAccount: { id: string };
}

export interface MerchantProfile {
  message: string;
  userId: string;
  merchantAccount: { id: string };
}

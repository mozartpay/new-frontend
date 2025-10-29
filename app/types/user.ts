export type User = {
  email: string;
  name: string;
  publicKeyXlmTestnet: string;
  publicKeyXlmMainnet: string;
  contractId?: string;
  preferredCurrency?: string;
  isAuthorized: boolean;
  isPhoneVerified: boolean;
  image?: string;
  preferredNetwork?: string;
  token: string;
  preferences?: {
    hideBalances: boolean;
    currency: string;
    network: string;
  };
  // Add other user properties as needed
};

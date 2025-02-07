export type User = {
  email: string;
  name: string;
  publicKeyXlm: string;
  preferredCurrency?: string;
  isAuthorized: boolean;
  image?: string;
  preferredNetwork?: string;
  token?: string;
  preferences?: {
    hideBalances: boolean;
    currency: string;
    network: string;
  };
  // Add other user properties as needed
};

export type User = {
  email: string;
  name: string;
  publicKeyXlm: string;
  preferredCurrency?: string;
  isAuthorized: boolean;
  image?: string;
  preferredNetwork?: string;
  // Add other user properties as needed
};


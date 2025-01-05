export type User = {
  email: string;
  name: string;
  publicKeyXlm: string;
  preferredCurrency?: string;
  isAuthorized: boolean;
  image?: string;
  preferredNetwork?: string;
  token?: string;
  // Add other user properties as needed
};

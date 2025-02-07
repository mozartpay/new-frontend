let DefindexSDK: any = null;
let Vault: any = null;
let SorobanNetwork: any = null;

export const initializeSDK = async () => {
  console.debug('[DefindexSDK] Starting SDK initialization');
  if (typeof window === 'undefined') {
    console.warn('[DefindexSDK] Window object not found - running in non-browser environment');
    return false;
  }

  try {
    console.debug('[DefindexSDK] Importing defindex-sdk package');
    DefindexSDK = await import('defindex-sdk');
    Vault = DefindexSDK.Vault;
    SorobanNetwork = DefindexSDK.SorobanNetwork;
    console.debug('[DefindexSDK] Successfully initialized SDK', { 
      hasVault: !!Vault, 
      hasSorobanNetwork: !!SorobanNetwork 
    });
    return true;
  } catch (error) {
    console.error('[DefindexSDK] Error loading defindex-sdk:', error);
    return false;
  }
};

export const initializeVault = async (contractId: string, config?: any) => {
  console.debug('[DefindexSDK] Starting vault initialization with contract ID:', contractId);
  if (typeof window === 'undefined') {
    console.warn('[DefindexSDK] Window object not found - running in non-browser environment');
    return null;
  }

  if (!Vault || !SorobanNetwork) {
    console.debug('[DefindexSDK] Vault or SorobanNetwork not found, initializing SDK first');
    const initialized = await initializeSDK();
    if (!initialized) {
      console.error('[DefindexSDK] Failed to initialize SDK');
      return null;
    }
  }

  try {
    const vault = new Vault({
      network: SorobanNetwork.TESTNET,
      contractId,
      passphrase: config?.passphrase
    });
    console.debug('[DefindexSDK] Successfully created vault instance', { 
      network: SorobanNetwork.TESTNET,
      contractId,
      hasPassphrase: !!config?.passphrase
    });
    return vault;
  } catch (error) {
    console.error('[DefindexSDK] Error creating vault instance:', error);
    return null;
  }
};

export const createSorobanContext = async () => {
  console.debug('[DefindexSDK] Starting Soroban context creation');
  if (typeof window === 'undefined') {
    console.warn('[DefindexSDK] Window object not found - running in non-browser environment');
    return null;
  }

  if (!SorobanNetwork) {
    console.debug('[DefindexSDK] SorobanNetwork not found, initializing SDK first');
    const initialized = await initializeSDK();
    if (!initialized) {
      console.error('[DefindexSDK] Failed to initialize SDK');
      return null;
    }
  }

  try {
    const context = {
      activeChain: SorobanNetwork.TESTNET,
      address: '',
      activeConnector: undefined,
      server: 'https://soroban-testnet.stellar.org',
      selectedNetwork: SorobanNetwork.TESTNET,
    };
    console.debug('[DefindexSDK] Successfully created Soroban context', context);
    return context;
  } catch (error) {
    console.error('[DefindexSDK] Error creating Soroban context:', error);
    return null;
  }
};

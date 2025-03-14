import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useFetcher, useLoaderData, redirect } from '@remix-run/react';
import { json, ActionFunction, LoaderFunction } from '@remix-run/node';
import { motion, AnimatePresence } from 'framer-motion';
import { getSession, commitSession, getUserFromSession } from '~/sessions';
import { decrypt, encrypt } from '~/utils/encryption';
import { useUser } from '~/context/UserContext';
import axios from 'axios';
import "~/styles/admin.css";
import styles from '~/styles/toggle-switch.css';

// Import your images
import banner from '~/assets/img/auth/banner.png';
import avatar from '~/assets/img/avatars/avatar2.png';

// Add this import at the top of the file
import type { User } from '~/types/user';

const DEFAULT_CURRENCIES = ['XLM', 'USDC', 'EURC'];
const DEFAULT_NETWORK = 'testnet';
const DEFAULT_CURRENCY = 'USD';

const NETWORK_OPTIONS = [
  { value: 'mainnet', label: 'Mainnet', description: 'Production network for real transactions', url: 'https://horizon.stellar.org' },
  { value: 'testnet', label: 'Testnet', description: 'Test network for development and testing', url: 'https://horizon-testnet.stellar.org' }
];

// Define loader data type
interface LoaderData {
  success: boolean;
  user: User;
  apiUrl: string;
}

// Define the fetcher response type
interface FetcherResponse {
  error?: string;
  success?: boolean;
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);
  
  if (!user) {
    return redirect("/signin");
  }

  try {
    if (!user.email || !user.isAuthorized) {
      return redirect("/signin");
    }

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error("API_URL is not configured");
    }

    return json({ 
      success: true, 
      user,
      apiUrl
    });
  } catch (error) {
    console.error("Error processing user data:", error);
    return redirect("/signin");
  }
};

// Type definition for form data
type ProfileFormData = {
  hideBalances?: boolean;
  preferredCurrency?: string;
  preferredNetwork?: string;
};

export const action: ActionFunction = async ({ request }) => {
    try {
        const session = await getSession(request);
        const formData = await request.formData();
        const updates: Partial<ProfileFormData> = {};
        
        // Only include provided fields in updates
        const preferredCurrency = formData.get("preferredCurrency");
        const preferredNetwork = formData.get("preferredNetwork");
        
        if (preferredCurrency) updates.preferredCurrency = preferredCurrency as string;
        if (preferredNetwork) updates.preferredNetwork = preferredNetwork as string;

        const encryptedUser = session.get("user");
        if (!encryptedUser) {
            throw new Error("No user found in session");
        }

        let user = JSON.parse(decrypt(encryptedUser));
        
        // Update only the provided preferences
        if (updates.preferredCurrency) {
            user.preferredCurrency = updates.preferredCurrency;
        }
        if (updates.preferredNetwork) {
            user.preferredNetwork = updates.preferredNetwork;
            user.preferences = {
                ...user.preferences,
                network: updates.preferredNetwork
            };
        }

        // Encrypt and save the updated user data
        session.set("user", encrypt(JSON.stringify(user)));

        return json({ 
            success: true,
            ...updates
        }, {
            headers: {
                "Set-Cookie": await commitSession(session)
            }
        });
    } catch (error) {
        console.error("Action error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: errorMessage }, { status: 400 });
    }
};

export default function AdminProfile() {
  // Get user from loader data
  const { user, apiUrl } = useLoaderData<typeof loader>();
  const { updatePreferences } = useUser();
  const navigate = useNavigate();
  // Type the fetcher properly
  const fetcher = useFetcher<FetcherResponse>();
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [networkChangeMessage, setNetworkChangeMessage] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isPrivateKeyBlurred, setIsPrivateKeyBlurred] = useState<boolean>(true);
  const [loadingPrivateKey, setLoadingPrivateKey] = useState<boolean>(false);
  const networkBeingUpdated = useRef<string | null>(null);

  // Define syncNetworkPreference first
  const syncNetworkPreference = useCallback(async (newNetwork: string): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      // 1. Update API first
      const response = await axios.post(`${apiUrl}/profile/preferredNetwork`, {
        email: user.email,
        preferredNetwork: newNetwork
      });

      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to update network preference');
      }

      // 2. Update local state through form submission
      fetcher.submit(
        { preferredNetwork: newNetwork },
        { method: "post" }
      );

      // 3. Update local state immediately (don't wait for form submission)
      updatePreferences({ network: newNetwork });

      // 4. Update localStorage
      const storedPreferences = localStorage.getItem('userPreferences');
      const parsedPreferences = storedPreferences ? JSON.parse(storedPreferences) : {};
      localStorage.setItem('userPreferences', JSON.stringify({
        ...parsedPreferences,
        network: newNetwork,
        preferredNetwork: newNetwork
      }));

      return true;
    } catch (error) {
      console.error('Failed to sync network preference:', error);
      setError(error instanceof Error ? error.message : 'Failed to update network preference');
      setTimeout(() => setError(null), 3000);
      return false;
    }
  }, [user?.email, apiUrl, fetcher, updatePreferences]);

  // Then define fetchBalanceAndSyncNetwork
  const fetchBalanceAndSyncNetwork = useCallback(async () => {
    if (!user?.email) return false;

    // Prevent excessive requests by checking if a network update is already in progress
    if (networkBeingUpdated.current) {
      console.log('Network update already in progress, skipping balance fetch');
      return false;
    }

    try {
      // Correct the endpoint URL by removing the duplicate /api
      const response = await axios.get(
        `${apiUrl}/user/balance/${encodeURIComponent(user.email)}`,
        {
          params: {
            network: user.preferences?.network || DEFAULT_NETWORK
          }
        }
      );

      if (!response.data || response.data.status === 'error') {
        throw new Error(response.data?.message || 'Failed to fetch balance');
      }

      const balanceData = response.data;

      // Only sync if networks differ, haven't recently synced, and user hasn't explicitly set a preference
      if (balanceData.network && 
          !user.preferences?.network && // Only sync if user has no explicit preference
          balanceData.network !== networkBeingUpdated.current) {
        console.log('Syncing network preference with balance response:', balanceData.network);
        networkBeingUpdated.current = balanceData.network;
        await syncNetworkPreference(balanceData.network);
        networkBeingUpdated.current = null;
      }

      return true;
    } catch (error) {
      // Handle 404 errors specifically
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('Balance endpoint not found (404), will not retry');
        return false; // Don't retry on 404
      }

      console.error('Error fetching balance:', error);
      // Don't set error state here as it's not critical
      return false;
    }
  }, [user?.email, user?.preferences?.network, apiUrl, syncNetworkPreference]);

  // Now, modify the useEffect that calls fetchBalanceAndSyncNetwork
  // Remove this useEffect entirely:
  // useEffect(() => {
  //   fetchBalanceAndSyncNetwork();
  // }, [fetchBalanceAndSyncNetwork]);
  
  // And replace it with a debounced version:
  const [shouldFetchBalance, setShouldFetchBalance] = useState(true);

  useEffect(() => {
    // Only fetch balance once when component mounts or when network changes
    if (shouldFetchBalance && user?.email) {
      setShouldFetchBalance(false);
      
      // Add a delay to prevent rapid successive calls
      const timer = setTimeout(() => {
        fetchBalanceAndSyncNetwork().finally(() => {
          // Allow another fetch after a cooldown period
          setTimeout(() => setShouldFetchBalance(true), 30000); // 30 second cooldown
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user?.email, user?.preferences?.network, fetchBalanceAndSyncNetwork, shouldFetchBalance]);

  // Then define fetchUserData
  const fetchUserData = useCallback(async () => {
    if (!user?.email) return;

    try {
      // Only fetch user profile data, don't fetch balance in parallel
      const userResponse = await axios.get(`${apiUrl}/profile/${encodeURIComponent(user.email)}`);
      
      const userData = userResponse.data;
      
      // Ensure we prioritize the user's saved preferences from the database
      updatePreferences({
        hideBalances: userData.preferences?.hideBalances ?? false,
        currency: userData.preferences?.currency ?? DEFAULT_CURRENCY,
        network: userData.preferences?.network ?? DEFAULT_NETWORK // Prioritize DB preference
      });
      
      if (userData.image && userData.image !== userImage) {
        setUserImage(userData.image);
      }

      // Fetch balance separately after user data is loaded
      await fetchBalanceAndSyncNetwork();
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please try again later.');
      setTimeout(() => setError(null), 3000);
    }
  }, [user?.email, userImage, apiUrl, fetchBalanceAndSyncNetwork]);

  // Effects after all function definitions
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      const storedPreferences = localStorage.getItem('userPreferences');
      const parsedPreferences = storedPreferences ? JSON.parse(storedPreferences) : null;
      
      // Use the new DEFAULT_NETWORK constant
      const network = user.preferences?.network ?? parsedPreferences?.network ?? DEFAULT_NETWORK;
      
      // Only update if the network preference is different
      if (network !== user.preferences?.network) {
        syncNetworkPreference(network).catch(error => {
          console.error('Error syncing initial network preference:', error);
        });
      }
    }
  }, [user?.email]); // Add user?.email as dependency to prevent unnecessary runs

  useEffect(() => {
    // Get stored preferences
    const storedPreferences = localStorage.getItem('userPreferences');
    const parsedPreferences = storedPreferences ? JSON.parse(storedPreferences) : null;
    
    if (user) {
      // Prioritize order: user preferences > stored preferences > default
      const network = user.preferences?.network ?? parsedPreferences?.network ?? DEFAULT_NETWORK;
      
      // Ensure network preference is synchronized
      updatePreferences({ network });
      
      // Update localStorage
      localStorage.setItem('userPreferences', JSON.stringify({
        ...parsedPreferences,
        network,
        preferredNetwork: network
      }));
    }
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchUserData();
    }
  }, [user?.email, fetchUserData]);

  useEffect(() => {
    fetchBalanceAndSyncNetwork();
  }, [fetchBalanceAndSyncNetwork]);

  useEffect(() => {
    console.log('Current user state:', {
      preferredNetwork: user?.preferredNetwork,
      networkInPreferences: user?.preferences?.network
    });
  }, [user]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.error) {
      setError(fetcher.data.error);
      setTimeout(() => setError(null), 3000);
    }
  }, [fetcher.state, fetcher.data]);

  const truncateKey = (key: string | null) => {
    if (!key) return '';
    return key.length > 10 ? `${key.slice(0, 5)}...${key.slice(-5)}` : key;
  };

  const copyToClipboard = (text: string | null) => {
    if (text) {
      navigator.clipboard.writeText(text);
      alert('Key copied to clipboard!');
    }
  };

  const togglePrivateKeyBlur = async () => {
    if (isPrivateKeyBlurred) {
      if (!privateKey) {
        try {
          setLoadingPrivateKey(true);
          if (!user) {
            console.error('User data is not available');
            return;
          }
          console.log('Attempting to fetch private key for:', user.email);
          const response = await axios.post(
            `${apiUrl}/xlm/decrypt`,
            {
              email: user.email,
            },
            {
              withCredentials: true,
              headers: {
                'Content-Type': 'application/json',
                Accept: '*/*',
              },
            }
          );
          
          console.log('API Response:', response.data);
          
          if (!response.data.privateKey) {
            throw new Error('No private key in response');
          }

          setPrivateKey(response.data.privateKey);
        } catch (error) {
          console.error('Error decrypting private key:', error);
          setError(error instanceof Error ? 
            `Failed to decrypt private key: ${error.message}` : 
            'Failed to decrypt private key');
        } finally {
          setLoadingPrivateKey(false);
        }
      }
    }
    setIsPrivateKeyBlurred(!isPrivateKeyBlurred);
  };

  const handlePreferredCurrencyChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPreferredCurrency = event.target.value;
    
    if (!user) {
      console.error('User not found');
      return;
    }

    try {
      const response = await axios.post(`${apiUrl}/profile/preferredCurrency`, {
        email: user.email,
        preferredCurrency: newPreferredCurrency
      });
      if (response.data?.message || response.data?.success) {
        updatePreferences({ currency: newPreferredCurrency });
        setConfirmationMessage(`Preferred currency set to ${newPreferredCurrency}`);
        
        // Update the session
        fetcher.submit(
          { preferredCurrency: newPreferredCurrency } as ProfileFormData,
          { method: "post" }
        );
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error updating preferred currency:', error);
      setError(error instanceof Error ? error.message : 'Failed to update preferred currency. Please try again.');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        try {
          if (!user) {
            throw new Error('User not found');
          }
          const response = await axios.post(`${apiUrl}/api/profile/image`, {
            email: user.email,
            image: base64Image
          });
          if (response.data.message === 'User image updated successfully') {
            setUserImage(base64Image);
          }
        } catch (error) {
          console.error('Error updating user image:', error);
          setError('Failed to update user image. Please try again.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (confirmationMessage) {
      const timer = setTimeout(() => {
        setConfirmationMessage(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [confirmationMessage]);

  const renderPrivateKeySection = () => {
    if (!isClient) {
      return <div>Loading...</div>;
    }

    return (
      <div className="profile-section">
        <h3>Private Key</h3>
        <div className="key-container" style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ 
              display: 'block',
              padding: '10px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '4px',
              filter: isPrivateKeyBlurred ? 'blur(4px)' : 'none',
              transition: 'filter 0.3s ease'
            }}>
              {loadingPrivateKey ? 'Loading...' : (privateKey ? truncateKey(privateKey) : 'Click to reveal')}
            </span>
            <button
              onClick={togglePrivateKeyBlur}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isPrivateKeyBlurred ? '👁️' : '🔒'}
            </button>
          </div>
          <button 
            onClick={() => copyToClipboard(privateKey)}
            disabled={!privateKey || isPrivateKeyBlurred}
            style={{ 
              marginLeft: '10px',
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: privateKey && !isPrivateKeyBlurred ? 'pointer' : 'not-allowed',
              opacity: privateKey && !isPrivateKeyBlurred ? 1 : 0.6
            }}
          >
            Copy
          </button>
        </div>
        <div style={{ marginTop: '5px', fontSize: '0.8em', color: '#666' }}>
          {isPrivateKeyBlurred ? 'Click the eye icon to reveal' : 'Keep this key secure and private'}
        </div>
      </div>
    );
  };

  const handlePreferredNetworkChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetwork = event.target.value;
    if (!user?.email) return;
    
    try {
      const success = await syncNetworkPreference(newNetwork);
      
      if (success) {
        const networkOption = NETWORK_OPTIONS.find(opt => opt.value === newNetwork);
        setNetworkChangeMessage(`Network changed to ${networkOption?.label}`);
        setTimeout(() => setNetworkChangeMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error updating network preference:', error);
      setError(error instanceof Error ? error.message : 'Failed to update network preference');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="admin-profile"
    >
      <div className="profile-banner" style={{
        backgroundImage: `url(${banner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '300px',
        position: 'relative',
        marginBottom: '80px'
      }}>
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <img 
            src={userImage || avatar} 
            alt="User Avatar" 
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '4px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
          <h2 style={{ marginTop: '10px', color: '#333' }}>{user.name}</h2>
          <p style={{ color: '#666' }}>{user.email}</p>
        </div>
      </div>

      <div className="profile-content" style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Network Switch */}
        <div className="profile-section" style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0' }}>Network</h3>
              <div style={{ 
                fontSize: '0.9em', 
                color: '#666'
              }}>
                {NETWORK_OPTIONS.find(opt => opt.value === user?.preferences?.network)?.description}
              </div>
            </div>
            <label className="switch" style={{
              position: 'relative',
              display: 'inline-block',
              width: '60px',
              height: '34px',
            }}>
              <input
                type="checkbox"
                checked={user?.preferences?.network === 'mainnet'}
                onChange={(e) => {
                  const newNetwork = e.target.checked ? 'mainnet' : 'testnet';
                  handlePreferredNetworkChange({ target: { value: newNetwork } } as React.ChangeEvent<HTMLSelectElement>);
                }}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
              />
              <span 
                className={`toggle-switch ${user?.preferences?.network === 'mainnet' ? 'active' : ''}`}
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: user?.preferences?.network === 'mainnet' ? '#2196F3' : '#ccc',
                  borderRadius: '34px',
                  transition: '0.4s'
                }}
              />
            </label>
          </div>
          <AnimatePresence>
            {networkChangeMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}
              >
                {networkChangeMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="profile-section">
          <h3>Profile Picture</h3>
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginTop: '10px' }} />
        </div>

        <div className="profile-section">
          <h3>Public Key</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            {user?.preferences?.network === 'mainnet' ? (
              user?.publicKeyXlmMainnet ? (
                <>
                  <div style={{ flex: 1, padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontFamily: 'monospace' }}>
                    {truncateKey(user.publicKeyXlmMainnet)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(user.publicKeyXlmMainnet)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Copy
                  </button>
                </>
              ) : (
                <span style={{ flex: 1, padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', color: '#666' }}>
                  No mainnet public key available
                </span>
              )
            ) : (
              user?.publicKeyXlmTestnet ? (
                <>
                  <div style={{ flex: 1, padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontFamily: 'monospace' }}>
                    {truncateKey(user.publicKeyXlmTestnet)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(user.publicKeyXlmTestnet)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Copy
                  </button>
                </>
              ) : (
                <span style={{ flex: 1, padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', color: '#666' }}>
                  No testnet public key available
                </span>
              )
            )}
          </div>
          <div style={{ 
            marginTop: '5px', 
            fontSize: '0.8em', 
            color: '#666' 
          }}>
            Showing {user?.preferences?.network === 'mainnet' ? 'mainnet' : 'testnet'} public key
          </div>
        </div>

        {renderPrivateKeySection()}

        <div className="profile-section">
          <h3>Preferred Currency</h3>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <select
              name="preferredCurrency"
              value={user.preferences?.currency || ''}
              onChange={(e) => {
                if (user) {
                  updatePreferences({ currency: e.target.value });
                }
              }}
              style={{ 
                flex: 1,
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value="">Select a preferred currency</option>
              {DEFAULT_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <AnimatePresence>
            {confirmationMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  borderRadius: '4px',
                }}
              >
                {confirmationMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {error && <p className="error" style={{ textAlign: 'center', color: 'red', marginTop: '20px' }}>{error}</p>}
    </motion.div>
  );
}
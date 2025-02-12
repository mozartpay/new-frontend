import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useFetcher, useLoaderData, redirect } from '@remix-run/react';
import { json, ActionFunction, LoaderFunction } from '@remix-run/node';
import { motion, AnimatePresence } from 'framer-motion';
import { getSession, commitSession, getUserFromSession } from '~/sessions';
import { decrypt, encrypt } from '~/utils/encryption';
import { useUser } from '~/context/UserContext';
import axios from 'axios';
import "~/styles/admin.css";

// Import your images
import banner from '~/assets/img/auth/banner.png';
import avatar from '~/assets/img/avatars/avatar2.png';

// Add this import at the top of the file
import type { User } from '~/types/user';

const DEFAULT_CURRENCIES = ['XLM', 'USDC', 'EURC'];

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
        const preferredCurrency = formData.get("preferredCurrency") as string;
        const preferredNetwork = formData.get("preferredNetwork") as string;

        const encryptedUser = session.get("user");
        if (!encryptedUser) {
            throw new Error("No user found in session");
        }

        let user = JSON.parse(decrypt(encryptedUser));
        
        // Update the user object with any provided preferences
        if (preferredCurrency) {
            user.preferredCurrency = preferredCurrency;
        }
        if (preferredNetwork) {
            user.preferredNetwork = preferredNetwork;
            user.preferences = {
              ...user.preferences,
              network: preferredNetwork
            };
        }

        // Encrypt and save the updated user data
        session.set("user", encrypt(JSON.stringify(user)));

        return json({ 
            success: true, 
            preferredCurrency,
            preferredNetwork 
        }, {
            headers: {
                "Set-Cookie": await commitSession(session),
            },
        });
    } catch (error) {
        console.error("Action error:", error);
        return json({ 
            success: false, 
            error: "Failed to update user preferences" 
        }, { status: 400 });
    }
};

export default function AdminProfile() {
  const { user: loaderUser, apiUrl } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { user, setUser, updatePreferences } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isPrivateKeyBlurred, setIsPrivateKeyBlurred] = useState<boolean>(true);
  const [loadingPrivateKey, setLoadingPrivateKey] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [networkChangeMessage, setNetworkChangeMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Get stored preferences
    const storedPreferences = localStorage.getItem('userPreferences');
    const parsedPreferences = storedPreferences ? JSON.parse(storedPreferences) : null;
    
    if (user) {
      // Prioritize order: user preferences > stored preferences > default
      const network = user.preferences?.network ?? parsedPreferences?.network ?? 'mainnet';
      
      // Ensure network preference is synchronized
      setUser(prevUser => prevUser ? {
        ...prevUser,
        preferences: {
          ...prevUser.preferences,
          network
        },
        preferredNetwork: network
      } : null);
      
      // Update localStorage
      localStorage.setItem('userPreferences', JSON.stringify({
        ...parsedPreferences,
        network,
        preferredNetwork: network
      }));
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!user?.email) return;

    try {
      const response = await axios.get(`${apiUrl}/profile/${user.email}`);
      const userData = response.data;
      
      console.log('Fetched user data:', {
        currentNetwork: user?.preferences?.network,
        newNetwork: userData?.preferences?.network,
        testnetKey: userData?.publicKeyXlmTestnet,
        mainnetKey: userData?.publicKeyXlmMainnet
      });
      
      setUser(prevUser => prevUser ? {
        ...prevUser, 
        preferences: {
          hideBalances: userData.preferences?.hideBalances ?? false,
          currency: userData.preferences?.currency ?? 'USD',
          network: userData.preferences?.network ?? prevUser.preferences?.network ?? 'mainnet'
        },
        preferredNetwork: userData.preferences?.network ?? prevUser.preferences?.network ?? 'mainnet',
        publicKeyXlmTestnet: userData.publicKeyXlmTestnet || prevUser.publicKeyXlmTestnet,
        publicKeyXlmMainnet: userData.publicKeyXlmMainnet || prevUser.publicKeyXlmMainnet,
        ...userData 
      } : null);
      
      if (userData.image && userData.image !== userImage) {
        setUserImage(userData.image);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please try again later.');
    }
  }, [user?.email, userImage, apiUrl]);

  useEffect(() => {
    console.log('Current user state:', {
      preferredNetwork: user?.preferredNetwork,
      networkInPreferences: user?.preferences?.network
    });
  }, [user]);

  useEffect(() => {
    if (user?.email) {
      fetchUserData();
    }
  }, [user?.email, fetchUserData]);

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
        setUser(prevUser => prevUser ? {
          ...prevUser, 
          preferences: {
            hideBalances: prevUser.preferences?.hideBalances ?? false,
            currency: newPreferredCurrency,
            network: prevUser.preferences?.network ?? 'mainnet'
          },
          preferredCurrency: newPreferredCurrency 
        } : null);
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
            setUser(prevUser => prevUser ? {
              ...prevUser, 
              image: base64Image 
            } : null);
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

  const handlePreferredNetworkChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newNetwork = event.target.value;
    if (!user?.email) return;
    
    try {
      // Update local state immediately for UI responsiveness
      setUser(prevUser => prevUser ? {
        ...prevUser,
        preferences: {
          ...prevUser.preferences,
          network: newNetwork
        },
        preferredNetwork: newNetwork
      } : null);

      // Update context
      updatePreferences({ network: newNetwork });

      // Store in localStorage
      const storedPreferences = localStorage.getItem('userPreferences');
      const parsedPreferences = storedPreferences ? JSON.parse(storedPreferences) : {};
      localStorage.setItem('userPreferences', JSON.stringify({
        ...parsedPreferences,
        network: newNetwork,
        preferredNetwork: newNetwork
      }));

      // Update backend
      const response = await axios.post(`${apiUrl}/profile/preferredNetwork`, {
        email: user.email,
        preferredNetwork: newNetwork
      }, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      if (response.data?.status === 'success') {
        const networkOption = NETWORK_OPTIONS.find(opt => opt.value === newNetwork);
        setNetworkChangeMessage(`Network changed to ${networkOption?.label}`);
        
        // Update session
        fetcher.submit(
          { network: newNetwork, preferredNetwork: newNetwork } as ProfileFormData,
          { method: "post" }
        );
      } else {
        throw new Error(response.data?.message || 'Invalid response from server');
      }
    } catch (error) {
      console.error('Error updating network:', error);
      // Revert local state if there's an error
      const storedPreferences = localStorage.getItem('userPreferences');
      const parsedPreferences = storedPreferences ? JSON.parse(storedPreferences) : {};
      const fallbackNetwork = parsedPreferences.network ?? 'mainnet';
      
      setUser(prevUser => prevUser ? {
        ...prevUser,
        preferences: {
          ...prevUser.preferences,
          network: fallbackNetwork
        },
        preferredNetwork: fallbackNetwork
      } : null);
      
      setError(error instanceof Error ? error.message : 'Failed to update network. Please try again.');
    }
  };

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
          <h2 style={{ marginTop: '10px', color: '#333' }}>{loaderUser.name}</h2>
          <p style={{ color: '#666' }}>{loaderUser.email}</p>
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
                checked={user?.preferences?.network === 'testnet'}
                onChange={(e) => {
                  const newNetwork = e.target.checked ? 'testnet' : 'mainnet';
                  handlePreferredNetworkChange({ target: { value: newNetwork } } as React.ChangeEvent<HTMLSelectElement>);
                  // Force reload after network change
                  setTimeout(() => window.location.reload(), 500);
                }}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: user?.preferences?.network === 'testnet' ? '#2196F3' : '#ccc',
                transition: '.4s',
                borderRadius: '34px',
                ...(user?.preferences?.network === 'testnet' ? { '&::before': {
                  position: 'absolute',
                  content: '""',
                  height: '26px',
                  width: '26px',
                  left: '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%',
                  transform: 'translateX(26px)',
                } as any } : { '&::before': {
                  position: 'absolute',
                  content: '""',
                  height: '26px',
                  width: '26px',
                  left: '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: '.4s',
                  borderRadius: '50%',
                  transform: 'translateX(0)',
                } as any })
              }}></span>
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
                  setUser({
                    ...user,
                    preferences: {
                      ...user.preferences,
                      currency: e.target.value
                    }
                  });
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

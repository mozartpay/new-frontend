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
  { value: 'https://horizon.stellar.org', label: 'Mainnet', description: 'Production network for real transactions' },
  { value: 'https://horizon-testnet.stellar.org', label: 'Testnet', description: 'Test network for development and testing' }
];

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
  currency?: string;
  network?: string;
  preferredCurrency?: string;
};

export const action: ActionFunction = async ({ request }) => {
    type ActionFormData = ProfileFormData;  // Use our ProfileFormData type for the action
    
    try {
        const session = await getSession(request);
        const formData = await request.formData();
        const preferredCurrency = formData.get("preferredCurrency") as string;

        const encryptedUser = session.get("user");
        if (!encryptedUser) {
            throw new Error("No user found in session");
        }

        let user = JSON.parse(decrypt(encryptedUser));
        user.preferredCurrency = preferredCurrency;
        session.set("user", encrypt(JSON.stringify(user)));

        return json({ success: true, preferredCurrency }, {
            headers: {
                "Set-Cookie": await commitSession(session),
            },
        });
    } catch (error) {
        console.error("Action error:", error);
        return json({ 
            success: false, 
            error: "Failed to update preferred currency" 
        }, { status: 400 });
    }
};

export default function AdminProfile() {
  const { user: initialUser, apiUrl } = useLoaderData<{ user: User, apiUrl: string }>();
  const [user, setUser] = useState(initialUser);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isPrivateKeyBlurred, setIsPrivateKeyBlurred] = useState<boolean>(true);
  const [loadingPrivateKey, setLoadingPrivateKey] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { updatePreferences } = useUser();
  const fetcher = useFetcher();
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [networkChangeMessage, setNetworkChangeMessage] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  const fetchUserData = useCallback(async () => {
    if (!user?.email) return;

    try {
      const response = await axios.get(`${apiUrl}/profile/${user.email}`);
      const userData = response.data;
      
      setUser(prevUser => {
        if (JSON.stringify(prevUser) !== JSON.stringify(userData)) {
          return { ...prevUser, ...userData };
        }
        return prevUser;
      });
      
      if (userData.image && userData.image !== userImage) {
        setUserImage(userData.image);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please try again later.');
    }
  }, [user?.email, userImage, apiUrl]);

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
          const response = await axios.post(
            `${apiUrl}/api/xlm/decrypt`,
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

          setPrivateKey(response.data.privateKey);
        } catch (error) {
          console.error('Error decrypting private key:', error);
          setError('Failed to decrypt private key');
        } finally {
          setLoadingPrivateKey(false);
        }
      }
    }
    setIsPrivateKeyBlurred(!isPrivateKeyBlurred);
  };

  const handlePreferredCurrencyChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPreferredCurrency = event.target.value;
    
    try {
      const response = await axios.post(`${apiUrl}/profile/preferredCurrency`, {
        email: user.email,
        preferredCurrency: newPreferredCurrency
      });
      if (response.data?.message || response.data?.success) {
        updatePreferences({ currency: newPreferredCurrency });
        setUser(prevUser => ({ ...prevUser, preferredCurrency: newPreferredCurrency }));
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
          const response = await axios.post(`${apiUrl}/api/profile/image`, {
            email: user.email,
            image: base64Image
          });
          if (response.data.message === 'User image updated successfully') {
            setUserImage(base64Image);
            setUser({ ...user, image: base64Image });
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
    const newPreferredNetwork = event.target.value;
    
    try {
      const response = await axios.post(`${apiUrl}/profile/preferredNetwork`, {
        email: user.email,
        preferredNetwork: newPreferredNetwork
      });

      if (response.data.message === 'Preferred network updated successfully') {
        setUser(prevUser => ({ ...prevUser, preferredNetwork: newPreferredNetwork }));
        setNetworkChangeMessage(`Network changed to ${NETWORK_OPTIONS.find(opt => opt.value === newPreferredNetwork)?.label}`);
      }
    } catch (error) {
      console.error('Error updating preferred network:', error);
      setError('Failed to update preferred network. Please try again.');
    }
  };

  useEffect(() => {
    if (networkChangeMessage) {
      const timer = setTimeout(() => {
        setNetworkChangeMessage(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [networkChangeMessage]);

  const renderPrivateKeySection = () => {
    if (!isClient) {
      return <div>Loading...</div>;
    }

    return (
      <div className="profile-section">
        <h3>Private Key</h3>
        <div className="key-container" style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
          <span 
            className={isPrivateKeyBlurred ? 'blurred' : ''} 
            style={{ 
              flex: 1, 
              padding: '10px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '4px',
              filter: isPrivateKeyBlurred ? 'blur(5px)' : 'none'
            }}
          >
            {loadingPrivateKey ? 'Loading...' : (privateKey ? truncateKey(privateKey) : 'Hidden')}
          </span>
          <button onClick={togglePrivateKeyBlur} disabled={loadingPrivateKey} style={{ marginLeft: '10px' }}>
            {isPrivateKeyBlurred ? 'Show' : 'Hide'}
          </button>
          {!isPrivateKeyBlurred && privateKey && (
            <button onClick={() => copyToClipboard(privateKey)} style={{ marginLeft: '10px' }}>Copy</button>
          )}
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
        <div className="profile-section">
          <h3>Profile Picture</h3>
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginTop: '10px' }} />
        </div>

        <div className="profile-section">
          <h3>Public Key</h3>
          <div className="key-container" style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ flex: 1, padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              {truncateKey(user.publicKeyXlm)}
            </span>
            <button onClick={() => copyToClipboard(user.publicKeyXlm)} style={{ marginLeft: '10px' }}>Copy</button>
          </div>
        </div>

        {renderPrivateKeySection()}

        <div className="profile-section">
          <h3>Preferred Currency</h3>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <select
              name="preferredCurrency"
              value={user.preferredCurrency || ''}
              onChange={handlePreferredCurrencyChange}
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

        <div className="profile-section">
          <h3>Preferred Network</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <select
              name="preferredNetwork"
              value={user.preferredNetwork || ''}
              onChange={handlePreferredNetworkChange}
              style={{ 
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value="">Select a network</option>
              {NETWORK_OPTIONS.map((network) => (
                <option key={network.value} value={network.value}>
                  {network.label}
                </option>
              ))}
            </select>
            
            {user.preferredNetwork && (
              <div style={{ 
                fontSize: '0.9em', 
                color: '#666',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                {NETWORK_OPTIONS.find(opt => opt.value === user.preferredNetwork)?.description}
              </div>
            )}

            <AnimatePresence>
              {networkChangeMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    padding: '10px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    borderRadius: '4px',
                  }}
                >
                  {networkChangeMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {error && <p className="error" style={{ textAlign: 'center', color: 'red', marginTop: '20px' }}>{error}</p>}
    </motion.div>
  );
}

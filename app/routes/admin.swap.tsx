import { useState, useEffect } from 'react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import axios from 'axios';
import { z } from 'zod';
import { getUserFromSession } from '~/sessions/index';
import "~/styles/swap.css";

// Asset definitions
const ASSETS = {
  XLM: { code: 'XLM', issuer: undefined },
  USDC: { 
    code: 'USDC', 
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
  },
  EURC: {
    code: 'EURC',
    issuer: 'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO'
  }
} as const;

// Validation schemas matching backend
const AssetSchema = z.object({
  code: z.string(),
  issuer: z.string().optional()
}).refine(data => {
  if (data.code.toLowerCase() !== 'xlm' && data.code.toLowerCase() !== 'native' && !data.issuer) {
    return false;
  }
  return true;
}, {
  message: "Issuer is required for non-native assets"
});

const SwapFormSchema = z.object({
  sourceAsset: AssetSchema,
  destinationAsset: AssetSchema,
  amount: z.string().regex(/^\d*\.?\d{0,7}$/),
  memo: z.string().max(28).optional(),
  network: z.enum(['mainnet', 'testnet']).default('testnet'),
  slippageTolerance: z.number().min(0.01).max(100).default(2)
});

interface SwapFormData {
  sourceAsset: {
    code: string;
    issuer: string;
  };
  destinationAsset: {
    code: string;
    issuer: string;
  };
  amount: string;
  memo: string;
  network: 'testnet' | 'mainnet';
  slippageTolerance: number;
}

interface CurrencyData {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  priceUsd: string;
  changePercent24Hr: string;
  volumeUsd24Hr: string;
  marketCapUsd: string;
}

type ApiResponse = CurrencyData[];

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUserFromSession(request);
  if (!user) {
    return redirect("/signin");
  }
  return json({ user, ENV: { LOCAL_API_URL: process.env.LOCAL_API_URL } });
};

export default function Swap() {
  const { user, ENV } = useLoaderData<{ user: any; ENV: { LOCAL_API_URL: string } }>();
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<React.ReactNode | null>(null);
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [currencyRates, setCurrencyRates] = useState<{ [key: string]: number }>({});
  const apiUrl = ENV.LOCAL_API_URL || 'http://localhost:8000/api';
  const token = user?.token;

  const [formData, setFormData] = useState<SwapFormData>({
    sourceAsset: {
      code: 'XLM',
      issuer: ''
    },
    destinationAsset: {
      code: 'USDC',
      issuer: ASSETS.USDC.issuer || ''
    },
    amount: '',
    memo: '',
    network: 'testnet',
    slippageTolerance: 2
  });

  // Fetch balances
  useEffect(() => {
    if (user?.email && token) {
      fetchBalances();
    }
  }, [user?.email, token]);

  const fetchBalances = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/balance`,
        {
          params: {
            email: user.email,
            network: formData.network
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (response.data.balances) {
        setBalances(response.data.balances);
      } else {
        setBalances([]);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setBalances([]);
    }
  };

  // Fetch currency rates
  useEffect(() => {
    const fetchCurrencyRates = async () => {
      try {
        console.log('Fetching currency rates from:', apiUrl);
        const response = await axios.get<ApiResponse>(`${apiUrl}/oracle/currencies`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const rates: { [key: string]: number } = {};
        
        response.data.forEach(currency => {
          rates[currency.symbol] = parseFloat(currency.priceUsd);
        });
        
        setCurrencyRates(rates);
      } catch (error) {
        console.error('Failed to fetch currency rates:', error);
      }
    };

    fetchCurrencyRates();
    // Refresh rates every 30 seconds
    const interval = setInterval(fetchCurrencyRates, 30000);
    return () => clearInterval(interval);
  }, [apiUrl, token]);

  const getBalance = (assetCode: string, assetIssuer?: string): string => {
    const balance = balances.find(b => {
      if (assetCode === 'XLM') {
        return b.asset_code === 'XLM' || !b.asset_code;
      }
      return b.asset_code === assetCode && b.asset_issuer === assetIssuer;
    });
    return balance ? balance.balance : '0';
  };

  const getEstimatedAmount = async (amount: string) => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setEstimatedAmount('');
      setExchangeRate(null);
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Format amount to 7 decimal places
      const formattedAmount = parseFloat(amount).toFixed(7);

      // Create the request body for estimation
      const createEstimateRequestBody = () => ({
        email: user.email,
        sourceAsset: {
          code: formData.sourceAsset.code,
          issuer: formData.sourceAsset.code === 'XLM' ? undefined : ASSETS[formData.sourceAsset.code as keyof typeof ASSETS].issuer
        },
        destinationAsset: {
          code: formData.destinationAsset.code,
          issuer: ASSETS[formData.destinationAsset.code as keyof typeof ASSETS].issuer
        },
        amount: formattedAmount,
        network: 'testnet',
        sendExact: true
      });

      const requestBody = createEstimateRequestBody();
      console.log('Estimation request body:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(
        `${apiUrl}/swap/estimate`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Swap estimation response:', JSON.stringify(response.data, null, 2));

      if (response.data.estimated_amount) {
        const estimatedAmount = response.data.estimated_amount;
        setEstimatedAmount(estimatedAmount);
        
        // Calculate and display exchange rate
        const sourceAmount = parseFloat(estimatedAmount); // Amount of source asset needed
        const destAmount = parseFloat(amount);           // Amount of destination asset wanted
        
        if (!isNaN(sourceAmount) && !isNaN(destAmount) && sourceAmount !== 0) {
          // Get expected rate from real-time currency data
          const sourceRate = currencyRates[formData.sourceAsset.code] || 0;
          const destRate = currencyRates[formData.destinationAsset.code] || 0;
          
          let expectedRate = 1;
          if (sourceRate && destRate) {
            expectedRate = destRate / sourceRate;
          }

          // Calculate rate deviation from market price
          const actualRate = destAmount / sourceAmount;
          const deviation = Math.abs((actualRate - expectedRate) / expectedRate) * 100;
          
          console.log('Rate analysis:', {
            sourceAmount,
            destAmount,
            actualRate,
            expectedRate,
            deviationPercent: deviation.toFixed(2) + '%',
            sourceAsset: formData.sourceAsset.code,
            destinationAsset: formData.destinationAsset.code,
            marketRates: {
              [formData.sourceAsset.code]: sourceRate,
              [formData.destinationAsset.code]: destRate
            }
          });

          // Warn if rate deviates too much from market rate
          if (deviation > 5) {
            setError(
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                <p className="font-medium">
                  Heads up! 🚨 The exchange rate seems unusual.
                </p>
                <p className="text-sm mt-1">
                  You might be getting a not-so-good deal right now. The current rate is quite different 
                  from what we usually see (about {deviation.toFixed(1)}% different).
                  Maybe try again in a little while?
                </p>
              </div>
            );
          } else {
            setError(null);
          }
          
          setExchangeRate(`1 ${formData.sourceAsset.code} = ${actualRate.toFixed(7)} ${formData.destinationAsset.code}`);
        } else {
          setExchangeRate(null);
        }
      } else {
        console.warn('No estimation in response:', response.data);
        setError('No valid path found for this swap');
        setEstimatedAmount('');
        setExchangeRate(null);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('Error response:', err.response?.status);
        console.error('Error data:', JSON.stringify(err.response?.data, null, 2));
        console.error('Request data:', JSON.stringify(err.config?.data, null, 2));
        setError(err.response?.data?.error || err.response?.data?.message || 'Failed to fetch estimation');
      } else {
        console.error('Error processing swap:', err);
        setError('Failed to fetch estimation');
      }
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    try {
      SwapFormSchema.parse(formData);
      setError(null);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError('Invalid form data');
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Format amount to 7 decimal places
      const formattedAmount = parseFloat(formData.amount).toFixed(7);

      const swapRequestBody = {
        email: user.email,
        sourceAsset: {
          code: formData.sourceAsset.code,
          issuer: formData.sourceAsset.code === 'XLM' ? undefined : ASSETS[formData.sourceAsset.code as keyof typeof ASSETS].issuer
        },
        destinationAsset: {
          code: formData.destinationAsset.code,
          issuer: ASSETS[formData.destinationAsset.code as keyof typeof ASSETS].issuer
        },
        amount: formattedAmount,
        memo: formData.memo,
        network: formData.network,
        slippageTolerance: formData.slippageTolerance
      };

      console.log('Swap request body:', JSON.stringify(swapRequestBody, null, 2));

      const response = await axios.post(
        `${apiUrl}/swap`,
        swapRequestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Swap response:', response.data);

      if (response.data.result?.hash) {
        const network = formData.network || 'testnet';
        const explorerUrl = `https://stellar.expert/explorer/${network}/tx/${response.data.result.hash}`;
        console.log('Setting success message with hash:', response.data.result.hash);
        console.log('Explorer URL:', explorerUrl);
        
        setSuccess(
          <div className="success-message" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#e6ffe6', borderRadius: '4px' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>Swap successful! 🎉</p>
            <p style={{ margin: '0' }}>
              Transaction Hash:{' '}
              <a 
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0066cc', textDecoration: 'underline' }}
              >
                {response.data.result.hash}
              </a>
            </p>
          </div>
        );

        // Reset form
        setFormData(prev => ({
          ...prev,
          amount: '',
          memo: ''
        }));
        setEstimatedAmount('');
        setExchangeRate(null);
      } else {
        console.warn('No hash in response:', response.data);
        setError('Swap completed but transaction hash not found');
      }
    } catch (err: any) {
      console.error('Swap failed:', err);
      setError(err.response?.data?.message || 'Failed to complete swap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="swap-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Swap Assets</h1>
      
      {error && (
        <div className="error-message" style={{ 
          backgroundColor: '#ffe6e6', 
          padding: '1rem', 
          borderRadius: '4px', 
          marginBottom: '1rem',
          color: '#cc0000'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="swap-section">
          <div className="you-receive-section">
            <h3>You Want to Receive {formData.destinationAsset.code}</h3>
            <div className="input-group">
              <input
                type="text"
                name="amount"
                value={formData.amount}
                onChange={(e) => {
                  const newAmount = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    amount: newAmount
                  }));
                  if (newAmount) {
                    getEstimatedAmount(newAmount);
                  } else {
                    setEstimatedAmount('');
                    setExchangeRate(null);
                  }
                }}
                placeholder={`Enter amount of ${formData.destinationAsset.code} to receive`}
              />
              <select
                name="destinationAsset"
                value={`${formData.destinationAsset.code}${formData.destinationAsset.issuer ? '-' + formData.destinationAsset.issuer : ''}`}
                onChange={(e) => {
                  const [code, issuer] = e.target.value.split('-');
                  setFormData(prev => ({
                    ...prev,
                    destinationAsset: {
                      code,
                      issuer: issuer || ''
                    }
                  }));
                  if (formData.amount) {
                    getEstimatedAmount(formData.amount);
                  }
                }}
              >
                {Object.entries(ASSETS).map(([key, asset]) => (
                  <option 
                    key={key} 
                    value={`${asset.code}${asset.issuer ? '-' + asset.issuer : ''}`}
                  >
                    {asset.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="balance">
              Balance: {getBalance(formData.destinationAsset.code, formData.destinationAsset.issuer)} {formData.destinationAsset.code}
            </div>
          </div>

          <div className="you-pay-section">
            <h3>You'll Need to Send {formData.sourceAsset.code} (Estimated)</h3>
            <div className="input-group">
              <input
                type="text"
                value={loading ? "Calculating..." : (estimatedAmount || "")}
                readOnly
                placeholder={`Estimated ${formData.sourceAsset.code} amount`}
                className={loading ? 'input-loading' : ''}
              />
              <select
                name="sourceAsset"
                value={`${formData.sourceAsset.code}${formData.sourceAsset.issuer ? '-' + formData.sourceAsset.issuer : ''}`}
                onChange={(e) => {
                  const [code, issuer] = e.target.value.split('-');
                  setFormData(prev => ({
                    ...prev,
                    sourceAsset: {
                      code,
                      issuer: issuer || ''
                    }
                  }));
                  if (formData.amount) {
                    getEstimatedAmount(formData.amount);
                  }
                }}
              >
                {Object.entries(ASSETS).map(([key, asset]) => (
                  <option 
                    key={key} 
                    value={`${asset.code}${asset.issuer ? '-' + asset.issuer : ''}`}
                  >
                    {asset.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="balance">
              Available: {getBalance(formData.sourceAsset.code, formData.sourceAsset.issuer)} {formData.sourceAsset.code}
            </div>
            {exchangeRate && (
              <div className="exchange-rate">
                Exchange Rate: {exchangeRate}
              </div>
            )}
          </div>
        </div>

        <div className="additional-options">
          <div className="network-selection">
            <label>Network:</label>
            <select
              name="network"
              value={formData.network}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  network: e.target.value as 'testnet' | 'mainnet'
                }));
              }}
            >
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </div>

          <div className="slippage-tolerance">
            <label>Slippage Tolerance (%):</label>
            <input
              type="number"
              name="slippageTolerance"
              value={formData.slippageTolerance}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.01 && value <= 100) {
                  setFormData(prev => ({
                    ...prev,
                    slippageTolerance: value
                  }));
                }
              }}
              min="0.1"
              max="5"
              step="0.1"
            />
          </div>

          <div className="memo-field">
            <label>Memo (optional):</label>
            <input
              type="text"
              name="memo"
              value={formData.memo}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  memo: e.target.value
                }));
              }}
              placeholder="Enter memo"
              maxLength={28}
            />
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success}
        
        <button 
          type="submit" 
          className={`swap-button ${loading ? 'loading' : ''}`}
          disabled={loading || !formData.amount}
        >
          {loading ? 'Processing...' : 'Swap'}
        </button>
      </form>
    </div>
  );
}
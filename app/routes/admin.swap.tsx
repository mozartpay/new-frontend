import { useState, useEffect } from 'react';
import { json, LoaderFunction, ActionFunction, redirect } from '@remix-run/node';
import { useLoaderData, useSubmit } from '@remix-run/react';
import axios from 'axios';
import { z } from 'zod';
import { getUserFromSession } from '~/sessions';
import "~/styles/swap.css";

// Asset definitions
const ASSETS = {
  XLM: {
    code: 'XLM',
    issuer: undefined
  },
  USDC: {
    code: 'USDC',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
  },
  EURC: {
    code: 'EURC',
    issuer: 'GDLKW2PQKYSXCXOXZ3IXCQKXKW4JQJQVNQXQXKJXXNVRM4QXRQFYI7H5'
  }
} as const;

// Validation schemas
const AssetSchema = z.object({
  code: z.string(),
  issuer: z.string().optional()
});

const SwapFormData = z.object({
  sourceAsset: AssetSchema,
  destinationAsset: AssetSchema,
  amount: z.string().min(1),
  memo: z.string().optional(),
  slippageTolerance: z.number().min(0.1).max(5)
});

const EstimateRequestSchema = z.object({
  email: z.string().email(),
  sourceAsset: AssetSchema,
  destinationAsset: AssetSchema,
  amount: z.string().min(1),
  sendExact: z.boolean(),
  network: z.enum(['testnet', 'mainnet']),
  strictSendAmount: z.string().optional(),
  strictReceiveAmount: z.string().optional(),
  pathConfig: z.object({
    maxPaths: z.number(),
    minSourceAmount: z.string(),
    maxSourceAmount: z.string(),
    allowIndirect: z.boolean()
  })
});

interface SwapFormData {
  sourceAsset: {
    code: string;
    issuer?: string;
  };
  destinationAsset: {
    code: string;
    issuer?: string;
  };
  amount: string;
  memo: string;
  slippageTolerance: number;
}

interface EstimateRequestData {
  email: string;
  sourceAsset: {
    code: string;
    issuer: string | null;
  };
  destinationAsset: {
    code: string;
    issuer: string | null;
  };
  amount: string;
  sendExact: boolean;
  network: 'testnet' | 'mainnet';
  strictSendAmount: string | null;
  strictReceiveAmount: string | null;
  pathConfig: {
    maxPaths: number;
    minSourceAmount: string;
    maxSourceAmount: string;
    allowIndirect: boolean;
  };
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

  if (!user || !user.isAuthorized) {
    return redirect("/signin");
  }

  try {
    // Ensure API_URL is defined before returning it
    const apiUrl = process.env.VITE_API_URL;
    if (!apiUrl) {
      throw new Error('API URL is not defined');
    }

    return json({ 
      user, 
      ENV: {
        API_URL: apiUrl,
        CIRCLE_USDC_ISSUER_MAINNET: process.env.CIRCLE_USDC_ISSUER_MAINNET,
        CIRCLE_USDC_ISSUER_TESTNET: process.env.CIRCLE_USDC_ISSUER_TESTNET
      }
    });
  } catch (error) {
    console.error("Error in swap loader:", error);
    throw error;
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const rawData = Object.fromEntries(formData);

    // Parse and validate the form data
    const validatedData = SwapFormData.parse({
      sourceAsset: {
        code: rawData.sourceAssetCode,
        issuer: rawData.sourceAssetIssuer || undefined
      },
      destinationAsset: {
        code: rawData.destinationAssetCode,
        issuer: rawData.destinationAssetIssuer || undefined
      },
      amount: rawData.amount,
      memo: rawData.memo,
      slippageTolerance: parseFloat(rawData.slippageTolerance as string)
    });

    // Here you would typically make an API call to your backend to process the swap
    // For now, we'll just return the validated data
    return json({ success: true, data: validatedData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ success: false, errors: error.errors }, { status: 400 });
    }
    return json({ success: false, error: 'Failed to process swap request' }, { status: 500 });
  }
};

export default function Swap() {
  const { user, ENV } = useLoaderData<{ 
    user: any; 
    ENV: { 
      API_URL: string;
      CIRCLE_USDC_ISSUER_MAINNET: string;
      CIRCLE_USDC_ISSUER_TESTNET: string;
    }
  }>();

  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<React.ReactNode | null>(null);
  const [estimatedAmount, setEstimatedAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [currencyRates, setCurrencyRates] = useState<{ [key: string]: number }>({});
  const [priceDeviation, setPriceDeviation] = useState<number | null>(null);
  const apiUrl = ENV.API_URL;
  const token = user?.token;

  const [formData, setFormData] = useState<SwapFormData>({
    sourceAsset: ASSETS.XLM,
    destinationAsset: ASSETS.USDC,
    amount: '',
    memo: '',
    slippageTolerance: 1.0
  });

  // Fetch balances when user or network changes
  useEffect(() => {
    if (user?.email && user?.token) {
      fetchBalances();
    }
  }, [user?.email, user?.token, user?.preferences?.network]);

  const fetchBalances = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/user/balance/${encodeURIComponent(user.email)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          params: {
            network: user.preferences?.network || 'testnet'
          },
          withCredentials: true
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

  // Calculate price deviation when currency rates or estimated amount changes
  useEffect(() => {
    if (currencyRates && formData.amount && estimatedAmount) {
      const xlmRate = currencyRates['XLM'] || 0;
      const usdcRate = currencyRates['USDC'] || 1; // USDC should be ~1 USD
      
      if (xlmRate && usdcRate) {
        // Market rate: How many XLM should be needed for 1 USDC
        const marketRate = usdcRate / xlmRate;
        
        // Actual rate from the swap: XLM needed for 1 USDC
        const swapRate = parseFloat(estimatedAmount) / parseFloat(formData.amount);
        
        // Calculate deviation
        const deviation = ((swapRate - marketRate) / marketRate) * 100;
        setPriceDeviation(deviation);
      }
    }
  }, [currencyRates, formData.amount, estimatedAmount]);

  const getBalance = (assetCode: string, assetIssuer?: string): string => {
    const balance = balances.find(b => {
      if (assetCode === 'XLM') {
        return b.asset_code === 'XLM' || !b.asset_code;
      }
      return b.asset_code === assetCode && b.asset_issuer === assetIssuer;
    });
    return balance ? balance.balance : '0';
  };

  const getEstimate = async () => {
    if (!user.token) {
      setError('Not authenticated. Please try signing in again.');
      return;
    }

    if (!formData.sourceAsset.code || !formData.destinationAsset.code || !formData.amount || isNaN(parseFloat(formData.amount))) {
      setEstimatedAmount('');
      setExchangeRate(null);
      return;
    }

    let estimateRequestBody: EstimateRequestData | null = null;
    
    try {
      setLoading(true);
      setError(null);

      // Format amount to 7 decimal places
      const formattedAmount = parseFloat(formData.amount).toFixed(7);
      const network = user.preferences?.network || 'testnet';

      if (!user.email) {
        throw new Error('User email is required');
      }

      // Helper function to handle asset issuer
      const getAssetIssuer = (code: string, issuer?: string): string | null => {
        return code.toLowerCase() === 'xlm' ? null : (issuer || null);
      };

      // Prepare request body exactly matching EstimateRequestSchema
      estimateRequestBody = {
        email: user.email,
        sourceAsset: {
          code: formData.sourceAsset.code,
          issuer: getAssetIssuer(formData.sourceAsset.code, formData.sourceAsset.issuer)
        },
        destinationAsset: {
          code: formData.destinationAsset.code,
          issuer: getAssetIssuer(formData.destinationAsset.code, formData.destinationAsset.issuer)
        },
        amount: formattedAmount,
        network: network,
        sendExact: false,
        strictReceiveAmount: formattedAmount,
        strictSendAmount: null,
        pathConfig: {
          maxPaths: 1,
          minSourceAmount: "0",
          maxSourceAmount: "100000",
          allowIndirect: false
        }
      };

      console.log('Estimate request payload:', {
        ...estimateRequestBody,
        sourceAsset: {
          ...estimateRequestBody.sourceAsset,
          isXLM: estimateRequestBody.sourceAsset.code.toLowerCase() === 'xlm'
        },
        destinationAsset: {
          ...estimateRequestBody.destinationAsset,
          isXLM: estimateRequestBody.destinationAsset.code.toLowerCase() === 'xlm'
        }
      });

      const response = await axios.post(
        `${apiUrl}/swap/estimate`,
        estimateRequestBody,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Estimate response:', response.data);

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // When receiving exact amount, estimated_amount is how much we need to send
      const estimatedAmount = response.data.source_amount;
      if (!estimatedAmount) {
        throw new Error('No valid path found for this swap');
      }

      // Validate the path is direct (no intermediate assets)
      if (response.data.path && response.data.path.length > 0) {
        console.warn('Received indirect path:', response.data.path);
        throw new Error('Only direct swaps are supported');
      }

      setEstimatedAmount(estimatedAmount);
      
      if (formData.amount && estimatedAmount) {
        // When receiving USDC:
        // - formData.amount is how much USDC we want to receive
        // - estimatedAmount is how much XLM we need to send
        const xlmAmount = parseFloat(estimatedAmount);
        const usdcAmount = parseFloat(formData.amount);
        
        // Calculate rate as XLM needed per USDC
        const rate = (xlmAmount / usdcAmount).toFixed(7);
        setExchangeRate(rate);
      }

      return estimatedAmount;

    } catch (err: any) {
      console.error('Error getting estimate:', {
        requestBody: estimateRequestBody || 'Not initialized',
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });
      const errorMessage = err.response?.data?.error || err.message || 'Failed to get estimate';
      setError(errorMessage);
      setEstimatedAmount('');
      setExchangeRate(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!user?.token) {
      setError('Authentication required. Please sign in.');
      setLoading(false);
      return;
    }

    try {
      // Use the existing estimate
      if (!estimatedAmount) {
        throw new Error('Please wait for the estimate to complete');
      }

      // Format amount to 7 decimal places
      const formattedAmount = parseFloat(formData.amount).toFixed(7);
      
      // Prepare swap request body
      const swapRequestBody = {
        email: user.email,
        sourceAsset: {
          code: formData.sourceAsset.code,
          issuer: formData.sourceAsset.code === 'XLM' ? undefined : formData.sourceAsset.issuer
        },
        destinationAsset: {
          code: formData.destinationAsset.code,
          issuer: formData.destinationAsset.issuer
        },
        amount: formattedAmount,
        memo: formData.memo,
        network: user.preferences?.network || 'mainnet',
        slippageTolerance: formData.slippageTolerance
      };

      console.log('Swap request:', JSON.stringify(swapRequestBody, null, 2));

      // Proceed with the swap
      const swapResponse = await axios.post(
        `${apiUrl}/swap`,
        swapRequestBody,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Swap response:', swapResponse.data);

      setSuccess(
        <div>
          <p>Swap completed successfully!</p>
          <p>Amount: {formattedAmount} {formData.sourceAsset.code} → {estimatedAmount} {formData.destinationAsset.code}</p>
          <p>Transaction Hash: {swapResponse.data.result.hash}</p>
        </div>
      );
      
      // Refresh balances after successful swap
      await fetchBalances();
      
    } catch (err: any) {
      console.error('Request error:', {
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });
      const errorMessage = err.response?.data?.error || err.message || 'Failed to process request';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sourceBalance = getBalance(formData.sourceAsset.code, formData.sourceAsset.issuer);
  const destinationBalance = getBalance(formData.destinationAsset.code, formData.destinationAsset.issuer);

  useEffect(() => {
    if (formData.amount && !isNaN(parseFloat(formData.amount))) {
      getEstimate();
    }
  }, [formData.amount]);

  const renderEstimatedAmount = () => {
    if (loading) {
      return 'Calculating...';
    }
    if (!formData.amount || isNaN(parseFloat(formData.amount))) {
      return '';
    }
    return estimatedAmount;
  };

  const renderPriceDeviation = () => {
    if (priceDeviation === null) return null;
    
    const deviationAbs = Math.abs(priceDeviation);
    let color = 'text-green-500';
    let warning = '';
    
    if (deviationAbs > 3) {
      color = 'text-red-500';
      warning = 'High price deviation! Consider reviewing the swap details.';
    } else if (deviationAbs > 1) {
      color = 'text-yellow-500';
      warning = 'Moderate price deviation.';
    }
    
    return (
      <div className={`mt-2 ${color}`}>
        <p>Price Deviation: {priceDeviation.toFixed(2)}%</p>
        {warning && <p className="text-sm">{warning}</p>}
      </div>
    );
  };

  const validateForm = () => {
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      return false;
    }
    if (!formData.sourceAsset || !formData.destinationAsset) {
      return false;
    }
    if (!user?.email || !user?.token) {
      return false;
    }
    return true;
  };

  return (
    <div className="swap-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Swap Assets</h1>

      {error && (
        <div className="error-message" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="success-message" style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#e6ffe6', borderRadius: '4px' }}>
          {success}
        </div>
      )}

      <div className="swap-section">
        <h2>You Want to Receive {formData.destinationAsset.code}</h2>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => {
                  const newAmount = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    amount: newAmount
                  }));
                  if (newAmount) {
                    getEstimate();
                  } else {
                    setEstimatedAmount('');
                    setExchangeRate(null);
                  }
                }}
                placeholder="Enter amount"
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            <select
              value={formData.destinationAsset.code}
              onChange={(e) => {
                const selectedAsset = Object.values(ASSETS).find(
                  asset => asset.code === e.target.value
                );
                if (selectedAsset && selectedAsset.code !== formData.sourceAsset.code) {
                  setFormData(prev => ({
                    ...prev,
                    destinationAsset: selectedAsset
                  }));
                  if (formData.amount) {
                    getEstimate();
                  }
                }
              }}
              style={{ 
                padding: '0.5rem',
                minWidth: '120px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              {Object.values(ASSETS)
                .filter(asset => asset.code !== formData.sourceAsset.code)
                .map((asset) => (
                  <option key={asset.code} value={asset.code}>
                    {asset.code}
                  </option>
                ))}
            </select>
          </div>
          <div style={{ marginTop: '0.5rem', color: '#666' }}>
            Balance: {destinationBalance} {formData.destinationAsset.code}
          </div>
        </div>

        <h2>You'll Need to Send {formData.sourceAsset.code} (Estimated)</h2>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={renderEstimatedAmount()}
            readOnly
            placeholder="Estimated amount"
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              backgroundColor: '#f5f5f5',
              color: loading ? '#666' : 'inherit'
            }}
          />
          <div style={{ marginTop: '0.5rem', color: '#666' }}>
            Available: {sourceBalance} {formData.sourceAsset.code}
          </div>
          {parseFloat(estimatedAmount) > parseFloat(sourceBalance || '0') && (
            <div style={{ color: 'red', marginTop: '0.5rem' }}>
              ⚠️ Insufficient balance
            </div>
          )}
        </div>

        {exchangeRate && (
          <div style={{ margin: '1rem 0', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <p style={{ margin: '0' }}>
              Exchange Rate: 1 {formData.sourceAsset.code} ≈ {exchangeRate} {formData.destinationAsset.code}
            </p>
          </div>
        )}

        {renderPriceDeviation()}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Slippage Tolerance: {formData.slippageTolerance}%
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={formData.slippageTolerance}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0.1 && value <= 5) {
                setFormData(prev => ({
                  ...prev,
                  slippageTolerance: value
                }));
              }
            }}
            style={{ width: '100%' }}
          />
          <small style={{ color: '#666' }}>
            Your transaction will revert if the price changes unfavorably by more than this percentage.
          </small>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Memo (Optional)
          </label>
          <input
            type="text"
            value={formData.memo}
            onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
            placeholder="Enter memo"
            maxLength={28}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !estimatedAmount || parseFloat(estimatedAmount) > parseFloat(sourceBalance || '0') || !validateForm()}
          className={`swap-button ${loading ? 'loading' : ''}`}
          style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}
        >
          {loading ? 'Processing...' : 'Swap'}
        </button>
      </div>
      <div className="mt-4">
        {renderPriceDeviation()}
        {error && <div className="text-red-500 mt-2">{error}</div>}
        {success && <div className="text-green-500 mt-2">{success}</div>}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import axios from 'axios';
import "~/styles/soroban.css";

interface ContractArg {
  value: string;
}

interface DeployFormData {
  contractWasmB64: string;
  network: 'testnet' | 'mainnet' | 'futurenet';
  sourceSecret: string;
}

interface InvokeFormData {
  contractId: string;
  method: string;
  args: ContractArg[];
  network: 'testnet' | 'mainnet' | 'futurenet';
  sourceSecret: string;
}

export default function Soroban() {
  const { apiUrl } = useLoaderData() as { apiUrl: string };
  const [mode, setMode] = useState<'deploy' | 'invoke'>('deploy');
  const [showExample, setShowExample] = useState(false);
  
  // Deploy form state
  const [deployFormData, setDeployFormData] = useState<DeployFormData>({
    contractWasmB64: '',
    network: 'testnet',
    sourceSecret: ''
  });

  // Invoke form state
  const [invokeFormData, setInvokeFormData] = useState<InvokeFormData>({
    contractId: '',
    method: '',
    args: [],
    network: 'testnet',
    sourceSecret: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleDeployInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeployFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInvokeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInvokeFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArgChange = (index: number, value: string) => {
    setInvokeFormData(prev => ({
      ...prev,
      args: prev.args.map((arg, i) => 
        i === index ? { value } : arg
      )
    }));
  };

  const addArg = () => {
    setInvokeFormData(prev => ({
      ...prev,
      args: [...prev.args, { value: '' }]
    }));
  };

  const removeArg = (index: number) => {
    setInvokeFormData(prev => ({
      ...prev,
      args: prev.args.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result?.toString().split(',')[1];
      if (base64) {
        setDeployFormData(prev => ({
          ...prev,
          contractWasmB64: base64
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setResult(null);

    try {
      if (mode === 'deploy') {
        const response = await axios.post(`${apiUrl}/soroban/deploy`, deployFormData);
        setSuccess('Contract deployed successfully!');
        setResult(response.data);
      } else {
        const formattedData = {
          ...invokeFormData,
          args: invokeFormData.args.map(arg => arg.value)
        };
        const response = await axios.post(`${apiUrl}/soroban/invoke`, formattedData);
        setSuccess('Contract method invoked successfully!');
        setResult(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soroban-container">
      <h1>Soroban Smart Contracts</h1>
      
      <div className="example-toggle">
        <button onClick={() => setShowExample(!showExample)}>
          {showExample ? 'Hide Examples' : 'Show Examples'}
        </button>
      </div>

      {showExample && (
        <div className="examples-container">
          <div className="example-section">
            <h3>Deploy Contract Example</h3>
            <div className="example-content">
              <p><strong>1. Prepare your contract:</strong></p>
              <ul>
                <li>Create a simple counter contract in Rust:</li>
                <pre>{`#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

#[contract]
pub struct IncrementContract;

#[contractimpl]
impl IncrementContract {
    pub fn increment(env: Env, counter: Symbol) -> i32 {
        let key = symbol_short!("counter");
        let mut count: i32 = env.storage().get(&key).unwrap_or(0);
        count += 1;
        env.storage().set(&key, &count);
        count
    }
}`}</pre>
                <li>Compile it to WASM using <code>soroban contract build</code></li>
              </ul>

              <p><strong>2. Deploy Settings:</strong></p>
              <ul>
                <li>Network: Select "testnet" for testing</li>
                <li>Source Secret Key: Your Stellar secret key (starts with 'S')</li>
                <li>Contract File: Upload the compiled .wasm file</li>
              </ul>

              <p><strong>Expected Response:</strong></p>
              <pre>{`{
  "status": "success",
  "contractId": "CC...EXAMPLE...ID",
  "transactionHash": "TX...HASH"
}`}</pre>
            </div>
          </div>

          <div className="example-section">
            <h3>Invoke Contract Example</h3>
            <div className="example-content">
              <p><strong>1. Basic Invocation:</strong></p>
              <ul>
                <li>Contract ID: The ID received from deployment</li>
                <li>Method: "increment"</li>
                <li>Arguments: Add "counter" as a string argument</li>
                <li>Network: Same network used for deployment</li>
                <li>Source Secret: Your Stellar secret key</li>
              </ul>

              <p><strong>Example Values:</strong></p>
              <pre>{`{
  "contractId": "CC...EXAMPLE...ID",
  "method": "increment",
  "args": ["counter"],
  "network": "testnet",
  "sourceSecret": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}`}</pre>

              <p><strong>Expected Response:</strong></p>
              <pre>{`{
  "status": "success",
  "result": {
    "value": 1
  },
  "transactionHash": "TX...HASH"
}`}</pre>

              <p><strong>Common Methods:</strong></p>
              <ul>
                <li><code>increment(counter: Symbol) → i32</code>: Increments counter value</li>
                <li><code>get(key: Symbol) → i32</code>: Gets current counter value</li>
              </ul>
            </div>
          </div>

          <div className="example-section">
            <h3>Tips & Best Practices</h3>
            <ul>
              <li>Always test on testnet before deploying to mainnet</li>
              <li>Keep your secret key safe and never share it</li>
              <li>Verify contract ID and method names carefully</li>
              <li>Monitor transaction status using the transaction hash</li>
              <li>Use appropriate argument types as expected by the contract</li>
            </ul>
          </div>
        </div>
      )}

      <div className="action-toggle">
        <button
          className={mode === 'deploy' ? 'active' : ''}
          onClick={() => setMode('deploy')}
          disabled={loading}
        >
          Deploy Contract
        </button>
        <button
          className={mode === 'invoke' ? 'active' : ''}
          onClick={() => setMode('invoke')}
          disabled={loading}
        >
          Invoke Contract
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label>Network</label>
          <select
            name="network"
            value={mode === 'deploy' ? deployFormData.network : invokeFormData.network}
            onChange={mode === 'deploy' ? handleDeployInputChange : handleInvokeInputChange}
            required
          >
            <option value="testnet">Testnet</option>
            <option value="mainnet">Mainnet</option>
            <option value="futurenet">Futurenet</option>
          </select>
        </div>

        <div className="form-group">
          <label>Source Secret Key</label>
          <input
            type="password"
            name="sourceSecret"
            value={mode === 'deploy' ? deployFormData.sourceSecret : invokeFormData.sourceSecret}
            onChange={mode === 'deploy' ? handleDeployInputChange : handleInvokeInputChange}
            placeholder="Enter your secret key"
            required
          />
        </div>

        {mode === 'deploy' ? (
          <div className="form-group">
            <label>Contract WASM File</label>
            <input
              type="file"
              accept=".wasm"
              onChange={handleFileUpload}
              required
            />
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>Contract ID</label>
              <input
                type="text"
                name="contractId"
                value={invokeFormData.contractId}
                onChange={handleInvokeInputChange}
                placeholder="Enter contract ID"
                required
              />
            </div>

            <div className="form-group">
              <label>Method Name</label>
              <input
                type="text"
                name="method"
                value={invokeFormData.method}
                onChange={handleInvokeInputChange}
                placeholder="Enter method name"
                required
              />
            </div>

            <div className="form-group">
              <label>Arguments</label>
              <div className="args-container">
                {invokeFormData.args.map((arg, index) => (
                  <div key={index} className="arg-row">
                    <input
                      type="text"
                      value={arg.value}
                      onChange={(e) => handleArgChange(index, e.target.value)}
                      placeholder="Enter argument value"
                    />
                    <button type="button" onClick={() => removeArg(index)}>
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="add-arg-button" onClick={addArg}>
                  Add Argument
                </button>
              </div>
            </div>
          </>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        {result && (
          <div className="result-container">
            <h3>Result:</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={loading ? 'loading' : ''}
        >
          {loading ? 'Processing...' : mode === 'deploy' ? 'Deploy Contract' : 'Invoke Method'}
        </button>
      </form>
    </div>
  );
}

export const loader = async ({ request }: { request: Request }) => {
  return json({
    apiUrl: process.env.API_URL
  });
};
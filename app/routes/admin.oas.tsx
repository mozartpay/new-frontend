import { json, redirect } from '@remix-run/node';
import { getUserFromSession } from '~/sessions/index';
import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { motion } from 'framer-motion';
import axios from 'axios';
import "~/styles/oas.css";
import { initializeVault, createSorobanContext } from '~/lib/defindex-wrapper';

export const loader = async ({ request }: { request: Request }) => {
    const user = await getUserFromSession(request);
    if (!user?.email) {
        return redirect('/login');
    }
  
    return json({ 
      email: user.email,
      apiUrl: process.env.API_URL
    });
};

export default function OAs() {
  const { email, apiUrl } = useLoaderData() as { email: string; apiUrl: string };
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState('');
  const [inputData, setInputData] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadType, setUploadType] = useState('');
  const [publicKey, setPublicKey] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showExample, setShowExample] = useState(false);
  const [isAddressBlurred, setIsAddressBlurred] = useState(true);
  const [agreement, setAgreement] = useState<any>(null);
  const [balance, setBalance] = useState<string>('');
  const [vault, setVault] = useState<any>(null);
  const [sorobanContext, setSorobanContext] = useState<any>(null);

  useEffect(() => {
    const initializeDefindex = async () => {
      console.debug('[OAS] Starting Defindex initialization');
      try {
        const contractId = 'GBZX4Y3JAZ4MPNYABG3TE47Q4S73UHGNZXWC6OTC5NKYQSWORMRQ7SVW';
        console.debug('[OAS] Initializing vault with contract ID:', contractId);
        
        const newVault = await initializeVault(contractId);
        console.debug('[OAS] Vault initialization result:', { success: !!newVault });
        
        if (newVault) {
          setVault(newVault);
          console.debug('[OAS] Vault state updated successfully');
        } else {
          console.warn('[OAS] Failed to initialize vault - newVault is null');
        }

        console.debug('[OAS] Creating Soroban context');
        const newContext = await createSorobanContext();
        console.debug('[OAS] Soroban context creation result:', { success: !!newContext });
        
        if (newContext) {
          setSorobanContext(newContext);
          console.debug('[OAS] Soroban context state updated successfully');
        } else {
          console.warn('[OAS] Failed to create Soroban context - newContext is null');
        }
      } catch (error) {
        console.error('[OAS] Error in initializeDefindex:', error);
        setErrorMessage('Failed to initialize Defindex SDK. Please try again later.');
      }
    };

    // Only run initialization on the client side
    if (typeof window !== 'undefined') {
      initializeDefindex();
    }
  }, []);

  useEffect(() => {
    fetchPublicKey();
  }, [email]);

  const handleActionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAction(event.target.value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputData(e.target.value);
  };

  const handleSubmit = async () => {
    if (!selectedAction || !uploadType || !inputData) {
      setErrorMessage('Please select an action, upload type, and enter the data.');
      return;
    }

    if (!publicKey && selectedAction === 'createAgreement') {
      setErrorMessage('Contract ID (public key) is required to create an agreement. Please wait for it to load.');
      return;
    }

    try {
      // Reset previous states
      setErrorMessage('');
      setSuccessMessage('');
      setAgreement(null);
      setBalance('');

      // For getAgreement, check the balance using defindex-sdk
      if (selectedAction === 'getAgreement' && publicKey && vault && sorobanContext) {
        try {
          // Update the context with the current address
          const currentContext = {
            ...sorobanContext,
            address: publicKey
          };
          
          const vaultBalance = await vault.balance(publicKey, currentContext);
          if (vaultBalance) {
            console.log('Vault balance:', vaultBalance);
            setBalance(vaultBalance.toString());
          }
        } catch (e) {
          console.error('Error fetching vault balance:', e);
        }
      }

      // Convert all input types to XML format
      let xmlString = '';
      
      switch (uploadType) {
        case 'transactionXml':
          xmlString = inputData;
          break;
        case 'json':
          try {
            const jsonData = JSON.parse(inputData);
            xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <Agreement>
    <ContractID>${jsonData.contractId || publicKey}</ContractID>
    <Terms>${jsonData.terms || ''}</Terms>
    <CreatedBy>${jsonData.createdBy || email}</CreatedBy>
  </Agreement>
</Document>`;
          } catch (e) {
            setErrorMessage('Invalid JSON format. Please check your input.');
            return;
          }
          break;
        case 'contractId':
          xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <Agreement>
    <ContractID>${inputData.trim()}</ContractID>
  </Agreement>
</Document>`;
          break;
        case 'xdr':
          xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <Agreement>
    <ContractID>${publicKey}</ContractID>
    <Terms>XDR Agreement</Terms>
    <CreatedBy>${email}</CreatedBy>
  </Agreement>
</Document>`;
          break;
        default:
          setErrorMessage('Invalid upload type');
          return;
      }

      const endpoint = getEndpointForAction(selectedAction);
      const response = await axios.post(`${apiUrl}${endpoint}`, {
        xmlData: xmlString
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.data.agreement) {
        setAgreement(response.data.agreement);
        setSuccessMessage(`Agreement ${response.data.agreement.contractID} ${selectedAction === 'createAgreement' ? 'created' : 'retrieved'} successfully`);
      } else {
        setSuccessMessage(response.data.message);
      }
      
      if (selectedAction !== 'getAgreement') {
        setSelectedAction('');
        setInputData('');
        setUploadType('');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Error processing agreement');
      console.error('Error processing agreement:', error);
    }
  };

  const getEndpointForAction = (action: string): string => {
    const endpoints: Record<string, string> = {
      'getAgreement': '/oas/get-agreement',
      'createAgreement': '/oas/create-agreement',
      'signAgreement': '/oas/sign-agreement',
      'updateAgreement': '/oas/update-agreement',
      'cancelAgreement': '/oas/cancel-agreement'
    };
    return endpoints[action] || '';
  };

  const handleCancelClick = () => {
    navigate('/admin/default');
  };

  const handleUploadTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = event.target.value;
    setUploadType(selectedType);
    
    // Set Contract Address as default Contract ID
    if (selectedType === 'contractId' && publicKey) {
      setInputData(publicKey);
    } else {
      setInputData('');
    }

    if (selectedType) {
      setShowExample(true);
    }
  };

  const fetchPublicKey = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/balance?email=${encodeURIComponent(email)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (response.data && response.data.publicKey) {
        setPublicKey(response.data.publicKey);
      }
    } catch (error) {
      console.error('Error fetching public key:', error);
    }
  };

  const getExampleData = (type: string) => {
    switch (type) {
      case 'contractId':
        return publicKey || 'Enter Contract ID';
      case 'transactionXml':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <Agreement>
    <ContractID>${publicKey || '[Your Contract ID]'}</ContractID>
    <Terms>Standard service agreement terms</Terms>
    <CreatedBy>${email}</CreatedBy>
  </Agreement>
</Document>`;
      case 'xdr':
        return 'AAAAAGL9kh4B......HeFk=';
      case 'json':
        return JSON.stringify({
          contractId: publicKey || '[Your Contract ID]',
          terms: "Standard service agreement terms",
          createdBy: email
        }, null, 2);
      default:
        return '';
    }
  };

  // Add helper function for truncating addresses
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      padding: '1rem',
      borderRadius: '0.375rem',
      marginBottom: '1rem',
    },
    successMessage: {
      backgroundColor: '#dcfce7',
      color: '#16a34a',
      padding: '1rem',
      borderRadius: '0.375rem',
      marginBottom: '1rem',
    },
    agreementDetails: {
      backgroundColor: '#fff',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginTop: '2rem',
    },
    agreementContent: {
      marginTop: '1rem',
    },
    agreementJson: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '0.375rem',
      overflow: 'auto',
      fontSize: '0.875rem',
      fontFamily: 'monospace',
      marginTop: '1rem',
    },
    balanceDetails: {
      backgroundColor: '#f0f9ff',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginTop: '1rem',
      border: '1px solid #bae6fd'
    },
    balanceContent: {
      fontSize: '1.25rem',
      color: '#0369a1'
    }
  };

  return (
    <div style={styles.container}>
      <motion.h1 className="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        Welcome to the OAs Management Portal
      </motion.h1>

      <p className="intro-text">
        Effortlessly manage your Orchestrated Agreements. Get instant access to vital information, sign agreements seamlessly, update terms with ease, create new agreements, and cancel agreements when needed.
      </p>

      {publicKey && (
        <div className="contract-info">
          <h3>Contract Address</h3>
          <div className="key-container">
            <span className="address-text">
              {isAddressBlurred ? truncateAddress(publicKey) : publicKey}
            </span>
            <button onClick={() => setIsAddressBlurred(!isAddressBlurred)}>
              {isAddressBlurred ? 'Show' : 'Hide'}
            </button>
            {!isAddressBlurred && (
              <button onClick={() => navigator.clipboard.writeText(publicKey)}>
                Copy
              </button>
            )}
          </div>
        </div>
      )}

      <h2 className="instructions-title">Instructions:</h2>
      <p className="instructions">
        <b>Get Agreement:</b> To view an existing agreement, select "Get Agreement" in the dropdown, then upload the contract ID, transaction XML, XDR, or JSON. <br />
        <b>Create Agreement:</b> Select "Create Agreement" and upload a JSON file containing the agreement details (participants, terms, conditions, payment schedules, etc.). <br />
        <b>Sign Agreement:</b> Select "Sign Agreement" and upload the contract ID, transaction XML, XDR, or JSON to sign it.<br />
        <b>Update Agreement:</b> Select "Update Agreement" and upload the contract ID, transaction XML, XDR, or JSON to update it.<br />
        <b>Cancel Agreement:</b> Select "Cancel Agreement" and upload the contract ID, transaction XML, XDR, or JSON to cancel it.
      </p>

      <div className="form-group">
        <label htmlFor="action-select" className="label">Select the corresponding action:</label>
        <select id="action-select" className="select" value={selectedAction} onChange={handleActionChange}>
          <option value="">Select Action</option>
          <option value="getAgreement">Get Agreement Information</option>
          <option value="createAgreement">Create Agreement</option>
          <option value="signAgreement">Sign Agreement</option>
          <option value="updateAgreement">Update Agreement</option>
          <option value="cancelAgreement">Cancel Agreement</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="upload-type" className="label">Select Agreement Type:</label>
        <select id="upload-type" className="select" value={uploadType} onChange={handleUploadTypeChange}>
          <option value="">Select Agreement Type</option>
          <option value="contractId">Contract ID</option>
          <option value="transactionXml">Transaction XML</option>
          <option value="xdr">XDR</option>
          <option value="json">JSON</option>
        </select>
      </div>

      {uploadType && (
        <div className="form-group">
          <label htmlFor="data-input" className="label">Enter {uploadType}:</label>
          <textarea
            id="data-input"
            className="data-input"
            value={inputData}
            onChange={handleInputChange}
            placeholder={`Enter your ${uploadType} data here...`}
            rows={10}
          />
        </div>
      )}

      <div className="button-group">
        <button className="button cancel" onClick={handleCancelClick}>Cancel</button>
        <button className="button primary" onClick={handleSubmit}>Submit</button>
      </div>

      {errorMessage && (
        <div style={styles.errorMessage}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {agreement && (
        <div style={styles.agreementDetails}>
          <h2>Agreement Details</h2>
          <div style={styles.agreementContent}>
            <p><strong>Contract ID:</strong> {agreement.contractID}</p>
            <p><strong>Status:</strong> {agreement.status}</p>
            <p><strong>Created By:</strong> {agreement.createdBy}</p>
            <p><strong>Terms:</strong> {agreement.terms}</p>
            <pre style={styles.agreementJson}>
              {JSON.stringify(agreement, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {balance && (
        <div style={styles.balanceDetails}>
          <h2>Vault Balance</h2>
          <div style={styles.balanceContent}>
            <p><strong>Balance:</strong> {balance}</p>
          </div>
        </div>
      )}

      {showExample && uploadType && (
        <motion.div 
          className="example-popup"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="example-content">
            <h3>Example {uploadType} Format:</h3>
            <pre>{getExampleData(uploadType)}</pre>
            <div className="example-buttons">
              <button 
                className="button secondary" 
                onClick={() => setInputData(getExampleData(uploadType))}
              >
                Use Example
              </button>
              <button 
                className="close-button" 
                onClick={() => setShowExample(false)}
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

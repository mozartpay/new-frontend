import { json, redirect } from '@remix-run/node';
import { getUserFromSession } from '~/sessions/index';
import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { motion } from 'framer-motion';
import axios from 'axios';
import "~/styles/oas.css";

export const loader = async ({ request }: { request: Request }) => {
    const user = await getUserFromSession(request);
    if (!user) {
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

    try {
      let xmlData;
      if (uploadType === 'transactionXml') {
        xmlData = inputData;
      } else if (uploadType === 'json') {
        // Convert JSON to XML format if needed
        const jsonData = JSON.parse(inputData);
        // Add logic to convert JSON to expected XML format
      }

      const endpoint = getEndpointForAction(selectedAction);
      const response = await axios.post(`${apiUrl}${endpoint}`, {
        xmlData
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      setSuccessMessage(response.data.message);
      setSelectedAction('');
      setInputData('');
      setUploadType('');
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Error processing agreement');
      console.error('Error processing agreement:', error);
    }
  };

  const getEndpointForAction = (action: string): string => {
    const endpoints: Record<string, string> = {
      'getAgreement': '/get-agreement',
      'createAgreement': '/create-agreement',
      'signAgreement': '/sign-agreement',
      'updateAgreement': '/update-agreement',
      'cancelAgreement': '/cancel-agreement'
    };
    return endpoints[action] || '';
  };

  const handleCancelClick = () => {
    navigate('/admin/default');
  };

  const handleUploadTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setUploadType(event.target.value);
    if (event.target.value) {
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
        return 'OA_12345678';
      case 'transactionXml':
        return `<transaction>
  <id>TX_123456</id>
  <agreement>
    <type>SERVICE_AGREEMENT</type>
    <parties>
      <party>COMPANY_A</party>
      <party>COMPANY_B</party>
    </parties>
  </agreement>
</transaction>`;
      case 'xdr':
        return 'AAAAAGL9kh4B......HeFk=';
      case 'json':
        return `{
  "agreementType": "SERVICE_AGREEMENT",
  "parties": [
    { "name": "Company A", "role": "provider" },
    { "name": "Company B", "role": "client" }
  ],
  "terms": {
    "duration": "12 months",
    "value": "5000 USD"
  }
}`;
      default:
        return '';
    }
  };

  // Add helper function for truncating addresses
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  return (
    <div className="container">
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
        <label htmlFor="upload-type" className="label">Select Upload Type:</label>
        <select id="upload-type" className="select" value={uploadType} onChange={handleUploadTypeChange}>
          <option value="">Select Upload Type</option>
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

      {successMessage && (
        <motion.div className="success-alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span>{successMessage}</span>
          <button className="close-button" onClick={() => setSuccessMessage('')}>✕</button>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div className="error-alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span>{errorMessage}</span>
          <button className="close-button" onClick={() => setErrorMessage('')}>✕</button>
        </motion.div>
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

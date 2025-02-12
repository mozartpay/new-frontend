import { json, redirect } from '@remix-run/node';
import { getUserFromSession } from '~/sessions/index';
import { useState } from 'react';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { motion } from 'framer-motion';
import axios from 'axios';
import styles from '~/styles/oas.module.css';

export const loader = async ({ request }: { request: Request }) => {
  const user = await getUserFromSession(request);
  if (!user) {
    return redirect('/login');
  }
  return json({ email: user.email, apiUrl: process.env.API_URL });
};

export default function OAs() {
  const { email, apiUrl } = useLoaderData() as { email: string; apiUrl: string };
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState('');
  const [inputData, setInputData] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadType, setUploadType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showExample, setShowExample] = useState(false);
  const [agreement, setAgreement] = useState<any>(null);

  const handleActionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const action = event.target.value;
    setSelectedAction(action);
    setUploadType('');
    setInputData('');
    setErrorMessage('');
  };

  const handleUploadTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = event.target.value;
    setUploadType(selectedType);
    setErrorMessage('');
    
    if (selectedAction === 'getAgreement') {
      const exampleData = getExampleData(selectedType);
      setInputData(exampleData);
    } else {
      setInputData('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputData(e.target.value);
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    // Clear previous messages
    setErrorMessage('');
    setSuccessMessage('');
    setAgreement(null);
    
    // Validate inputs
    if (!selectedAction) {
      setErrorMessage('Please select an action.');
      return;
    }
    
    if (!uploadType) {
      setErrorMessage('Please select an agreement type.');
      return;
    }
    
    if (!inputData || inputData.trim() === '') {
      setErrorMessage('Please enter the required data.');
      return;
    }

    try {
      const endpoint = getEndpointForAction(selectedAction);
      const response = await axios.post(
        `${apiUrl}${endpoint}`,
        { data: inputData, type: uploadType },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.success) {
        setSuccessMessage('Operation completed successfully');
        if (response.data.agreement) {
          setAgreement(response.data.agreement);
        }
      } else {
        setErrorMessage(response.data.error || 'Operation failed');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'Error processing agreement');
      console.error('Error processing agreement:', error);
    }
  };

  const getExampleData = (type: string): string => {
    const defaultContractId = 'GBNYLJQGBNIENVF54Q73W44TLUXAYX6D4XZH7OLHQIAXYJEMSOU6TWEL';
    
    switch (type) {
      case 'contractId':
        return defaultContractId;
      case 'transactionXml':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <Agreement>
    <ContractID>${defaultContractId}</ContractID>
    <Terms>Example terms of the agreement</Terms>
    <CreatedBy>${email}</CreatedBy>
  </Agreement>
</Document>`;
      case 'xdr':
        return 'AAAAAgAAAABwqN5TNqXa/LoK9C5xH...';
      case 'json':
        return JSON.stringify({
          contractId: defaultContractId,
          terms: "Example terms of the agreement",
          createdBy: email
        }, null, 2);
      default:
        return '';
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

  return (
    <div className={styles.container}>
      <motion.h1 
        className={styles.title} 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
      >
        Welcome to the OAs Management Portal
      </motion.h1>

      <p className={styles.introText}>
        Effortlessly manage your Orchestrated Agreements. Get instant access to vital information, 
        sign agreements seamlessly, update terms with ease, create new agreements, and cancel agreements when needed.
      </p>

      <h2 className={styles.instructionsTitle}>Instructions:</h2>
      <p className={styles.instructions}>
        <b>Get Agreement:</b> To view an existing agreement, select "Get Agreement" in the dropdown, then upload the contract ID, transaction XML, XDR, or JSON. <br />
        <b>Create Agreement:</b> Select "Create Agreement" and upload a JSON file containing the agreement details (participants, terms, conditions, payment schedules, etc.). <br />
        <b>Sign Agreement:</b> Select "Sign Agreement" and upload the contract ID, transaction XML, XDR, or JSON to sign it.<br />
        <b>Update Agreement:</b> Select "Update Agreement" and upload the contract ID, transaction XML, XDR, or JSON to update it.<br />
        <b>Cancel Agreement:</b> Select "Cancel Agreement" and upload the contract ID, transaction XML, XDR, or JSON to cancel it.
      </p>

      <div className={styles.formGroup}>
        <label htmlFor="action-select" className={styles.label}>Select the corresponding action:</label>
        <select 
          id="action-select" 
          className={styles.select} 
          value={selectedAction} 
          onChange={handleActionChange}
        >
          <option value="">Select Action</option>
          <option value="getAgreement">Get Agreement Information</option>
          <option value="createAgreement">Create Agreement</option>
          <option value="signAgreement">Sign Agreement</option>
          <option value="updateAgreement">Update Agreement</option>
          <option value="cancelAgreement">Cancel Agreement</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="upload-type" className={styles.label}>Select Agreement Type:</label>
        <select 
          id="upload-type" 
          className={styles.select} 
          value={uploadType} 
          onChange={handleUploadTypeChange}
        >
          <option value="">Select Agreement Type</option>
          <option value="contractId">Contract ID</option>
          <option value="transactionXml">Transaction XML</option>
          <option value="xdr">XDR</option>
          <option value="json">JSON</option>
        </select>
      </div>

      {uploadType && (
        <div className={styles.formGroup}>
          <label htmlFor="data-input" className={styles.label}>
            Enter {uploadType}
            <button 
              className={styles.exampleButton} 
              onClick={() => setShowExample(true)}
            >
              View Example
            </button>
          </label>
          <textarea
            id="data-input"
            className={styles.dataInput}
            value={inputData}
            onChange={handleInputChange}
            placeholder={`Enter your ${uploadType} data here...`}
            rows={10}
          />
        </div>
      )}

      <div className={styles.buttonGroup}>
        <button className={styles.cancelButton} onClick={handleCancelClick}>
          Cancel
        </button>
        <button className={styles.primaryButton} onClick={handleSubmit}>
          Submit
        </button>
      </div>

      {errorMessage && (
        <div className={styles.errorMessage}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}

      {agreement && (
        <div className={styles.agreementDetails}>
          <h2>Agreement Details</h2>
          <div className={styles.agreementContent}>
            <p><strong>Contract ID:</strong> {agreement.contractID}</p>
            <p><strong>Status:</strong> {agreement.status}</p>
            <p><strong>Created By:</strong> {agreement.createdBy}</p>
            <p><strong>Terms:</strong> {agreement.terms}</p>
            <pre className={styles.agreementJson}>
              {JSON.stringify(agreement, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {showExample && uploadType && (
        <div className={styles.popupOverlay}>
          <motion.div 
            className={styles.examplePopup}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className={styles.exampleContent}>
              <h3>Example Format for {uploadType}</h3>
              <pre className={styles.exampleCode}>
                {getExampleData(uploadType)}
              </pre>
              <div className={styles.exampleButtons}>
                <button 
                  className={styles.secondaryButton} 
                  onClick={() => {
                    setInputData(getExampleData(uploadType));
                    setShowExample(false);
                  }}
                >
                  Use Example
                </button>
                <button 
                  className={styles.primaryButton} 
                  onClick={() => setShowExample(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useLoaderData } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { motion } from 'framer-motion';
import axios from 'axios';
import { getSession } from '~/sessions';
import { decrypt } from '~/utils/encryption';
import { useUser } from '~/context/UserContext';
import "~/styles/admin.css";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const userJson = session.get("user");

  if (!userJson) {
    return json({ user: null });
  }

  try {
    const decryptedUser = decrypt(userJson);
    const user = JSON.parse(decryptedUser);
    return json({ user });
  } catch (error) {
    console.error("Error decrypting user data:", error);
    return json({ user: null });
  }
};

export default function AdminIdentity() {
  const { user: loaderUser } = useLoaderData<{ user: any }>();
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  useEffect(() => {
    if (!loaderUser) {
      navigate('/signin');
    } else if (!user) {
      setUser(loaderUser);
    }
  }, [loaderUser, user, setUser, navigate]);

  const handleDocumentTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDocumentType(event.target.value);
  };

  const onChangeImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onload = () => {
        const imageString = reader.result as string;
        setImage(imageString);
      };
    }
  };

  const handleSubmit = async () => {
    if (!selectedDocumentType || !image) {
      setError("Please select a document type and upload an image.");
      return;
    }

    const formData = new FormData();
    formData.append('documentType', selectedDocumentType);
    formData.append('document', image);
    formData.append('email', user.email);

    try {
      const response = await axios.post(`${process.env.API_URL}/identity`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage(response.data.message);
      setSelectedDocumentType('');
      setImage(null);
      setError(null);
    } catch (error) {
      console.error('Error uploading identity:', error);
      setError("An error occurred while uploading your identity document. Please try again.");
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-identity">
      <h1>Identity Management Portal</h1>
      <p>Your security is our top priority. To ensure a safe and secure environment, we need to verify your identity before granting access to our services.</p>
      
      <h2>Instructions:</h2>
      <ul>
        <li>Please ensure that the document you upload is clear and legible.</li>
        <li>The document should be valid and not expired.</li>
        <li>Make sure all four corners of the document are visible in the uploaded image.</li>
      </ul>

      <div className="form-group">
        <label htmlFor="documentType">Document Selection:</label>
        <select
          id="documentType"
          value={selectedDocumentType}
          onChange={handleDocumentTypeChange}
        >
          <option value="">Select Document Type</option>
          <option value="passport">Passport</option>
          <option value="drivingLicense">Driving License</option>
          <option value="residentPermit">Resident Permit</option>
          <option value="nationalIDCard">National ID Card</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="image">Upload Image:</label>
        <input type="file" id="image" onChange={onChangeImage} />
      </div>

      {image && (
        <div className="preview">
          <h3>Preview:</h3>
          <img src={image} alt="Uploaded Document" />
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {successMessage && <p className="success">{successMessage}</p>}

      <div className="button-group">
        <button onClick={handleSubmit} className="submit-button">Submit</button>
        <button onClick={() => navigate('/admin')} className="cancel-button">Cancel</button>
      </div>
    </div>
  );
}
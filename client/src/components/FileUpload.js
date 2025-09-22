import React, { useState } from 'react';
import axios from 'axios';
import Alert from './Alert';

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 7000);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        showAlert(
          <span><span className="alert-icon">❌</span>Please select a valid Excel file (.xlsx or .xls)</span>,
          'error'
        );
        return;
      }
      
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showAlert(
        <span><span className="alert-icon">📁</span>Please select an Excel file first</span>,
        'info'
      );
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      const response = await axios.post('/api/upload-students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setUploadResult(response.data);
        showAlert(
          <div>
            <span className="alert-icon">✅</span>
            <strong>Upload Successful!</strong><br />
            {response.data.message}
          </div>,
          'success'
        );
        setFile(null);
        // Reset file input
        document.getElementById('fileInput').value = '';
        
        // Call the callback function if provided
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.response && error.response.data) {
        showAlert(
          <span><span className="alert-icon">❌</span>{error.response.data.message}</span>,
          'error'
        );
      } else {
        showAlert(
          <span><span className="alert-icon">🌐</span>Network error. Please try again.</span>,
          'error'
        );
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-section">
      <div className="upload-header">
        <h2>📊 Upload Student Data</h2>
        <p className="upload-description">
          Upload an Excel file with your student data. Required columns: <strong>system_id</strong>, <strong>name</strong>. Optional: <strong>team_id</strong>
        </p>
      </div>

      <div className="upload-form">
        <div className="file-input-container">
          <input
            type="file"
            id="fileInput"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="file-input"
            disabled={uploading}
          />
          <label htmlFor="fileInput" className="file-input-label">
            {file ? (
              <span>📁 {file.name}</span>
            ) : (
              <span>📁 Choose Excel File</span>
            )}
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn btn-primary upload-btn"
        >
          {uploading ? (
            <span>⏳ Uploading...</span>
          ) : (
            <span>📤 Upload Students</span>
          )}
        </button>
      </div>

      {uploadResult && (
        <div className="upload-result">
          <h3>📋 Upload Summary</h3>
          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-label">Total Rows:</span>
              <span className="stat-value">{uploadResult.summary.totalRows}</span>
            </div>
            <div className="stat-item success">
              <span className="stat-label">Inserted:</span>
              <span className="stat-value">{uploadResult.summary.inserted}</span>
            </div>
            <div className="stat-item info">
              <span className="stat-label">Updated:</span>
              <span className="stat-value">{uploadResult.summary.updated}</span>
            </div>
            {uploadResult.summary.errors > 0 && (
              <div className="stat-item error">
                <span className="stat-label">Errors:</span>
                <span className="stat-value">{uploadResult.summary.errors}</span>
              </div>
            )}
          </div>
          
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="error-details">
              <h4>⚠️ Error Details:</h4>
              <ul>
                {uploadResult.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {uploadResult.errors.length > 5 && (
                  <li>... and {uploadResult.errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}


      {alert && (
        <Alert 
          message={alert.message} 
          type={alert.type} 
          onClose={() => setAlert(null)} 
        />
      )}
    </div>
  );
};

export default FileUpload;

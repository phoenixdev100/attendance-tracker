import React from 'react';

const Alert = ({ message, type, onClose }) => {
  return (
    <div className={`alert alert-${type}`}>
      {message}
      <button className="alert-close" onClick={onClose}>
        &times;
      </button>
    </div>
  );
};

export default Alert;

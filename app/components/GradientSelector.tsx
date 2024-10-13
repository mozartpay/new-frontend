import React, { useState } from 'react';

const gradients = [
  { name: 'Default', light: 'var(--gradient-light-start), var(--gradient-light-end)', dark: 'var(--gradient-dark-start), var(--gradient-dark-end)' },
  { name: 'Sunset', light: '#ff9a9e, #fad0c4', dark: '#30cfd0, #330867' },
  { name: 'Ocean', light: '#48c6ef, #6f86d6', dark: '#0f2027, #203a43' },
  { name: 'Forest', light: '#56ab2f, #a8e063', dark: '#000000, #0f9b0f' },
];

const GradientSelector = ({ isDarkMode, onSelectGradient }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectGradient = (gradient) => {
    onSelectGradient(gradient);
    setIsOpen(false);
  };

  return (
    <div className="gradient-selector">
      <button onClick={() => setIsOpen(!isOpen)} className="gradient-toggle">
        Change Background
      </button>
      {isOpen && (
        <div className="gradient-options">
          {gradients.map((gradient, index) => (
            <button
              key={index}
              onClick={() => handleSelectGradient(gradient)}
              className="gradient-option"
              style={{
                background: `linear-gradient(135deg, ${isDarkMode ? gradient.dark : gradient.light})`,
              }}
            >
              {gradient.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GradientSelector;


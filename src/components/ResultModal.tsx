import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import '../styles/modal-styles.css';

interface ResultModalProps {
  formData: Record<string, any>;
  onClose: () => void;
  clearForm?: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ formData, onClose, clearForm }) => {
  // Refs for focus trapping
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const clearFormButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeModalButtonRef = useRef<HTMLButtonElement>(null);
  
  // Animation state
  const [isExiting, setIsExiting] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);

  // Format label for display (convert snake_case to Title Case)
  const formatLabel = (key: string): string => {
    // Remove the section prefix from the key if present
    const parts = key.split('_');
    const sectionPrefix = parts[0];
    
    // Remove section prefix if it exists in the formatted label
    const labelParts = sectionPrefix === parts[0] && parts.length > 1 
      ? parts.slice(1) 
      : parts;
    
    return labelParts
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Determine the field type based on key and value
  const getFieldType = (key: string, value: any): string => {
    const keyLower = key.toLowerCase();
    
    // Text area indicators
    const textAreaIndicators = [
      'description', 'comment', 'message', 'note', 'details', 
      'explanation', 'feedback', 'summary', 'content', 'text',
      'bio', 'about', 'paragraph', 'long', 'area'
    ];
    
    // Date indicators
    const dateIndicators = ['date', 'dob', 'birthday', 'birth_date', 'day'];
    
    // Email indicators 
    const emailIndicators = ['email', 'mail'];
    
    // Phone indicators
    const phoneIndicators = ['phone', 'mobile', 'cell', 'tel'];
    
    // URL indicators
    const urlIndicators = ['url', 'website', 'web', 'link', 'site'];
    
    // Number indicators
    const numberIndicators = [
      'number', 'amount', 'qty', 'quantity', 'count', 'num', 
      'age', 'year', 'price', 'cost', 'fee'
    ];
    
    // Check for text area by name or content
    if (
      textAreaIndicators.some(indicator => keyLower.includes(indicator)) ||
      (typeof value === 'string' && value.length > 100) ||
      (typeof value === 'string' && value.includes('\n'))
    ) {
      return 'textarea';
    }
    
    // Check for dates
    if (
      dateIndicators.some(indicator => keyLower.includes(indicator)) ||
      (typeof value === 'string' && /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(value))
    ) {
      return 'date';
    }
    
    // Check for emails
    if (
      emailIndicators.some(indicator => keyLower.includes(indicator)) ||
      (typeof value === 'string' && /^[^@]+@[^@]+\.[^@]+$/.test(value))
    ) {
      return 'email';
    }
    
    // Check for phones
    if (
      phoneIndicators.some(indicator => keyLower.includes(indicator)) ||
      (typeof value === 'string' && /^(\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}$/.test(value))
    ) {
      return 'phone';
    }
    
    // Check for URLs
    if (
      urlIndicators.some(indicator => keyLower.includes(indicator)) ||
      (typeof value === 'string' && /^https?:\/\//.test(value))
    ) {
      return 'url';
    }
    
    // Check for numbers
    if (
      numberIndicators.some(indicator => keyLower.includes(indicator)) ||
      (typeof value === 'number')
    ) {
      return 'number';
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return 'array';
    }
    
    // Handle booleans
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    
    // Default to input
    return 'input';
  };
  
  // Format value based on its type
  const formatValue = (value: any, fieldType: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    if (fieldType === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (fieldType === 'array') {
      return Array.isArray(value) 
        ? value.map((item, index) => (
            <span key={index} className="array-item">
              {String(item)}
            </span>
          ))
        : String(value);
    }
    
    if (fieldType === 'textarea') {
      return (
        <div className="textarea-value">
          {String(value).split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < String(value).split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      );
    }
    
    if (fieldType === 'url') {
      try {
        // Try to create a valid URL
        const url = value.startsWith('http') ? value : `https://${value}`;
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="url-link">
            {value}
          </a>
        );
      } catch (e) {
        return String(value);
      }
    }
    
    if (fieldType === 'email') {
      return (
        <a href={`mailto:${value}`} className="email-link">
          {value}
        </a>
      );
    }
    
    return String(value);
  };

  // Handle closing with animation
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  }, [onClose]);

  // Handle clear form with confirmation
  const handleClearForm = useCallback(() => {
    if (clearForm) {
      // Using state to close the current modal first
      setIsExiting(true);
      
      // Delay to allow animation to complete, then clear form
      setTimeout(() => {
        clearForm();
      }, 300);
    }
  }, [clearForm]);
  
  // Extract entries for display and sort alphabetically by key 
  const sortedEntries = useMemo(() => {
    return Object.entries(formData)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  }, [formData]);
  
  // Group entries by their section prefix for form-like display
  const groupedEntries = useMemo(() => {
    const groups: Record<string, Array<[string, any]>> = {};
    
    sortedEntries.forEach(entry => {
      const [key] = entry;
      const sectionName = key.split('_')[0];
      
      if (!groups[sectionName]) {
        groups[sectionName] = [];
      }
      
      groups[sectionName].push(entry);
    });
    
    return groups;
  }, [sortedEntries]);

  // Format section name for display
  const formatSectionName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Set up ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Set focus to close button when modal opens
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);
  
  // Show content with slight delay for animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentVisible(true);
    }, 150);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Set up focus trapping
  useEffect(() => {
    const modalElement = modalRef.current;
    if (!modalElement) return;
    
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      // If shift + tab and focused on first element, move to last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } 
      // If tab and focused on last element, move to first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    document.addEventListener('keydown', handleTabKey);
    
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, []);
  
  return (
    <div 
      className={`modal-backdrop ${isExiting ? 'fade-out' : ''}`} 
      onClick={handleClose}
    >
      <div 
        className={`modal-content result-modal ${isExiting ? 'slide-down' : ''} ${isContentVisible ? 'content-visible' : ''}`}
        ref={modalRef} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Form Submission Result</h2>
          <button 
            className="close-button"
            ref={closeButtonRef}
            onClick={handleClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        
        <div className="submission-form">
          {Object.keys(groupedEntries).length > 0 ? (
            Object.entries(groupedEntries).map(([sectionName, entries], index) => (
              <div 
                key={sectionName} 
                className={`result-section ${index % 2 === 0 ? 'section-even' : 'section-odd'}`}
              >
                <h3 className="result-section-title">{formatSectionName(sectionName)}</h3>
                <div className="result-fields">
                  {entries.map(([key, value]) => {
                    const fieldType = getFieldType(key, value);
                    const isFullWidth = fieldType === 'textarea' || 
                                       String(value).length > 50 || 
                                       (Array.isArray(value) && value.length > 3);
                    
                    return (
                      <div 
                        key={key} 
                        className={`result-field result-field-${fieldType} ${isFullWidth ? 'full-width' : ''}`}
                      >
                        <label className="result-field-label">{formatLabel(key)}</label>
                        <div className={`result-field-value result-field-${fieldType}`}>
                          {formatValue(value, fieldType)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-results">
              <p>No data submitted</p>
            </div>
          )}
        </div>
        
        <div className="submission-message">
          <p>Thank you for submitting the form. Your data has been received successfully.</p>
        </div>
        
        <div className="button-group">
          <button 
            className="modal-button close-modal-button"
            onClick={handleClose}
            ref={closeModalButtonRef}
          >
            Close
          </button>
          
          {clearForm && (
            <button 
              className="modal-button clear-form-button"
              onClick={handleClearForm}
              ref={clearFormButtonRef}
            >
              Clear & Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultModal; 
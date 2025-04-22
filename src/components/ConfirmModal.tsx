import React, { useCallback, useRef, useEffect } from 'react';
import '../styles/modal-styles.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonClass?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmButtonClass = 'danger-button'
}) => {
  // Refs for focus trapping
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Handle confirm action
  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  // Set up ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Set focus to cancel button when modal opens
    if (cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);
  
  // Set up focus trapping
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    
    const modalElement = modalRef.current;
    
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
  }, [isOpen]);

  if (!isOpen) return null;
  
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content confirm-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button 
            className="close-button"
            onClick={onCancel}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        
        <div className="modal-message">
          {message}
        </div>
        
        <div className="button-group">
          <button 
            className="modal-button cancel-button"
            onClick={onCancel}
            ref={cancelButtonRef}
          >
            {cancelText}
          </button>
          
          <button 
            className={`modal-button ${confirmButtonClass}`}
            onClick={handleConfirm}
            ref={confirmButtonRef}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal; 
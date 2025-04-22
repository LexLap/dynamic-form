import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { FormContextType, FormProviderProps, PersistentStateKey } from '../types/context';

// Helper to safely check if window/localStorage is available
const isLocalStorageAvailable = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Test localStorage access
    const testKey = '__test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Create form context
const FormContext = createContext<FormContextType | undefined>(undefined);

// Custom hook to use form context
export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

// Custom hook to manage persistent state
const usePersistentState = <T,>(key: PersistentStateKey, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    if (!isLocalStorageAvailable()) return initialValue;
    
    try {
      // Get stored value from localStorage
      const item = window.localStorage.getItem(key);
      // Return parsed stored value if exists, else return initialValue
      if (!item) return initialValue;
      
      try {
        // Try to parse the stored JSON
        return JSON.parse(item) as T;
      } catch {
        // If parsing fails, return the initial value and clean up corrupted storage
        window.localStorage.removeItem(key);
        return initialValue;
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  // Use ref to track previous state to avoid unnecessary localStorage updates
  const prevStateRef = useRef<T>(state);

  // Update localStorage when state changes
  useEffect(() => {
    // Skip localStorage operations if it's not available
    if (!isLocalStorageAvailable()) return;
    
    // Only update localStorage if the state actually changed (deep comparison)
    if (JSON.stringify(prevStateRef.current) !== JSON.stringify(state)) {
      try {
        if (Object.keys(state as any).length === 0) {
          // If state is empty, remove the item instead of storing empty object
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(state));
        }
        prevStateRef.current = state;
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    }
  }, [key, state]);

  // Create a wrapper for setState that handles empty state properly
  const setPersistedState = useCallback((value: React.SetStateAction<T>) => {
    setState(value);
    
    // If setting to empty object/array, explicitly clear localStorage
    if (typeof value !== 'function') {
      if (
        (typeof value === 'object' && value !== null && Object.keys(value).length === 0) || 
        (Array.isArray(value) && value.length === 0)
      ) {
        if (isLocalStorageAvailable()) {
          window.localStorage.removeItem(key);
        }
      }
    } else {
      // For function updates, check the result
      setState(prevState => {
        const updatedState = (value as (prevState: T) => T)(prevState);
        if (
          (typeof updatedState === 'object' && updatedState !== null && Object.keys(updatedState).length === 0) ||
          (Array.isArray(updatedState) && updatedState.length === 0)
        ) {
          if (isLocalStorageAvailable()) {
            window.localStorage.removeItem(key);
          }
        }
        return prevState; // Return the original state since setState will handle the update
      });
    }
  }, [key, setState]);

  return [state, setPersistedState];
};

// Form Provider component
export const FormProvider: React.FC<FormProviderProps> = ({ children }) => {
  const [formValues, setFormValues] = usePersistentState<Record<string, any>>(
    PersistentStateKey.FormData, 
    {}
  );

  // Update a single field value
  const updateFormValues = useCallback((fieldId: string, value: any) => {
    try {
      setFormValues(prevValues => {
        // Only update if the value actually changed
        if (prevValues[fieldId] === value) {
          return prevValues;
        }
        
        // If value is empty string, null, or undefined, remove the field entirely
        if (value === '' || value === null || value === undefined) {
          const newValues = { ...prevValues };
          delete newValues[fieldId];
          return newValues;
        }
        
        return {
          ...prevValues,
          [fieldId]: value
        };
      });
    } catch (error) {
      console.error('Error updating form values:', error);
      // In case of error, try to recover by removing the problematic field
      try {
        setFormValues(prevValues => {
          const newValues = { ...prevValues };
          delete newValues[fieldId];
          return newValues;
        });
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
      }
    }
  }, [setFormValues]);

  // Clear all form values
  const clearFormValues = useCallback(() => {
    try {
      // First ensure localStorage is cleared for this key
      if (isLocalStorageAvailable()) {
        try {
          window.localStorage.removeItem(PersistentStateKey.FormData);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      }
      
      // Then reset the state to empty object
      setFormValues({});
      
      // Force a direct localStorage removal as a final check
      if (isLocalStorageAvailable()) {
        window.localStorage.removeItem(PersistentStateKey.FormData);
      }
    } catch (error) {
      console.error('Error clearing form values:', error);
      // Force a final attempt at localStorage removal
      if (isLocalStorageAvailable()) {
        window.localStorage.removeItem(PersistentStateKey.FormData);
      }
    }
  }, [setFormValues]);

  // The context value is memoized to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    formValues,
    updateFormValues,
    clearFormValues
  }), [formValues, updateFormValues, clearFormValues]);

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
}; 
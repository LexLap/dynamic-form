import React, { useEffect, useState, useCallback } from 'react';
import { fetchFormSchema } from './services/api';
import { FormSchema } from './types/schema';
import DynamicForm from './components/DynamicForm';
import { FormProvider, useFormContext } from './context/FormContext';
import './styles/app-styles.css';

// Local storage keys
const STORAGE_KEYS = {
  SCHEMA_URL: 'schemaUrl',
  FORM_ACTIVE: 'formActive',
  SCHEMA_DATA: 'schemaData'
};

// Create a wrapper component to access the form context
const AppContent = () => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [schemaUrl, setSchemaUrl] = useState<string>('https://private-705dcb-formgenerator1.apiary-mock.com/form_fields');
  const [isFormActive, setIsFormActive] = useState<boolean>(false);
  
  // Access form context
  const { clearFormValues } = useFormContext();

  // Function to load schema without cleaning form data (used for page reload)
  const loadSchemaFromUrl = useCallback(async (url: string, skipCache = false) => {
    try {
      // Check if we have the schema cached in localStorage
      const cachedSchemaJSON = localStorage.getItem(STORAGE_KEYS.SCHEMA_DATA);
      
      // If we have cached schema and we're not explicitly skipping cache, use it
      if (cachedSchemaJSON && !skipCache) {
        try {
          const cachedSchema = JSON.parse(cachedSchemaJSON) as FormSchema;
          setSchema(cachedSchema);
          setIsFormActive(true);
          return; // Exit early, no need to fetch
        } catch (parseError) {
          console.error('Error parsing cached schema:', parseError);
          // If we can't parse the cached schema, continue to fetch a new one
          localStorage.removeItem(STORAGE_KEYS.SCHEMA_DATA);
        }
      }
      
      // If we don't have cached schema or cache parsing failed, fetch from API
      setLoading(true);
      setError(null);
      
      const data = await fetchFormSchema(url);
      
      // Cache the schema in localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.SCHEMA_DATA, JSON.stringify(data));
      } catch (storageError) {
        console.error('Error storing schema in localStorage:', storageError);
        // Continue even if storage fails
      }
      
      setSchema(data);
      
      // Save state in localStorage for persistence across page reloads
      localStorage.setItem(STORAGE_KEYS.SCHEMA_URL, url);
      localStorage.setItem(STORAGE_KEYS.FORM_ACTIVE, 'true');
      
      setIsFormActive(true);
    } catch (err) {
      let errorMessage = 'Failed to load the form schema. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching schema:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to generate a new form and clean all previous form data
  const generateNewForm = useCallback(async (url: string) => {
    try {
      // Clear any previous state
      setSchema(null);
      setLoading(true);
      setError(null);
      
      // Clear form data from context - ONLY when explicitly generating new form
      clearFormValues();
      
      // Clear localStorage items except for the URL and active state
      const storageKeys = Object.keys(localStorage);
      storageKeys.forEach(key => {
        if (key !== STORAGE_KEYS.SCHEMA_URL && key !== STORAGE_KEYS.FORM_ACTIVE && !key.startsWith('formData')) {
          localStorage.removeItem(key);
        }
      });
      
      // Remove cached schema data since we're generating a new form
      localStorage.removeItem(STORAGE_KEYS.SCHEMA_DATA);
      
      const data = await fetchFormSchema(url);
      
      // Cache the new schema
      try {
        localStorage.setItem(STORAGE_KEYS.SCHEMA_DATA, JSON.stringify(data));
      } catch (storageError) {
        console.error('Error storing schema in localStorage:', storageError);
      }
      
      setSchema(data);
      
      // Save state in localStorage for persistence across page reloads
      localStorage.setItem(STORAGE_KEYS.SCHEMA_URL, url);
      localStorage.setItem(STORAGE_KEYS.FORM_ACTIVE, 'true');
      
      setIsFormActive(true);
    } catch (err) {
      let errorMessage = 'Failed to load the form schema. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching schema:', err);
    } finally {
      setLoading(false);
    }
  }, [clearFormValues]);

  useEffect(() => {
    // Check localStorage for saved form state
    const savedUrl = localStorage.getItem(STORAGE_KEYS.SCHEMA_URL);
    const savedFormState = localStorage.getItem(STORAGE_KEYS.FORM_ACTIVE);
    
    if (savedUrl) {
      setSchemaUrl(savedUrl);
    }
    
    if (savedFormState === 'true') {
      setIsFormActive(true);
      // Use the saved URL or fall back to the default URL
      const urlToUse = savedUrl || schemaUrl;
      
      // Use loadSchemaFromUrl to load from cache or fetch if needed
      loadSchemaFromUrl(urlToUse);
    }
  }, [loadSchemaFromUrl, schemaUrl]);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    // Force skip cache on retry
    loadSchemaFromUrl(schemaUrl, true);
  }, [loadSchemaFromUrl, schemaUrl]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchemaUrl(e.target.value);
  };

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    // Use generateNewForm when explicitly submitting a new URL
    generateNewForm(schemaUrl);
  };

  const handleBackToMain = () => {
    setIsFormActive(false);
    setSchema(null);
    
    // Only remove formActive flag but keep the URL and form data for convenience
    localStorage.removeItem(STORAGE_KEYS.FORM_ACTIVE);
  };

  return (
    <div className="app-container">
      {!isFormActive ? (
        <div className="url-form-container">
          <h1>Dynamic Form Generator</h1>
          <p>Enter a URL that returns a form schema JSON to generate a dynamic form.</p>
          <form onSubmit={handleSubmitUrl} className="url-input-form">
            <input
              type="url"
              value={schemaUrl}
              onChange={handleUrlChange}
              placeholder="Enter schema URL"
              className="url-input"
              required
            />
            <button type="submit" className="generate-button">
              Generate Form
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="form-header">
            <button onClick={handleBackToMain} className="back-button">
              ← Back to Main
            </button>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="loading-spinner" />
              <h2 className="loading-text">Loading form...</h2>
            </div>
          )}

          {error && (
            <div className="error-container">
              <h2 className="error-message">Error</h2>
              <p className="error-details">{error}</p>
              <button className="retry-button" onClick={handleRetry}>
                {retryCount > 0 ? `Retry (${retryCount})` : 'Retry'}
              </button>
            </div>
          )}

          {!loading && !error && schema && (
            <DynamicForm schema={schema} />
          )}
        </>
      )}
    </div>
  );
};

// Main App component that provides the form context
function App() {
  return (
    <FormProvider>
      <AppContent />
    </FormProvider>
  );
}

export default App;

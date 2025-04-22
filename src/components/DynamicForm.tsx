import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { FormSchema } from '../types/schema';
import FormSection from './FormSection';
import ResultModal from './ResultModal';
import ConfirmModal from './ConfirmModal';
import { useFormContext } from '../context/FormContext';
import FormPersistenceStatus from './FormPersistenceStatus';
import '../styles/form-styles.css';

interface DynamicFormProps {
  schema: FormSchema;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ schema }) => {
  const [showResults, setShowResults] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { formValues, clearFormValues } = useFormContext();
  const [formKey, setFormKey] = useState<number>(0); // Add key to force form reset when needed
  
  // Use default values from persisted state or empty object when none exist
  const defaultValues = useMemo(() => {
    return Object.keys(formValues).length > 0 ? formValues : {};
  }, [formValues]);
  
  const methods = useForm({
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
    defaultValues: defaultValues
  });
  
  const { handleSubmit, formState: { isValid }, reset, getValues, trigger, clearErrors } = methods;

  // Check if form has any values or if the schema has at least one field (enabling reset button in all cases)
  const hasFormFields = useMemo(() => {
    // If schema exists and has at least one section with one field
    return schema.length > 0 && 
           schema.some(section => section.fields && section.fields.length > 0);
  }, [schema]);

  // Check if form has any values
  const hasValues = useMemo(() => {
    const values = getValues();
    return Object.keys(values).length > 0 && 
      Object.values(values).some(val => val !== undefined && val !== null && val !== '');
  }, [getValues]);

  // Trigger initial validation to ensure form validity is correctly initialized
  useEffect(() => {
    // Small delay to ensure form is fully rendered
    const validationTimer = setTimeout(() => {
      trigger();
    }, 100);
    
    return () => clearTimeout(validationTimer);
  }, [trigger, formKey]);

  // Effect to update form with saved values on initial load or when formValues change
  useEffect(() => {
    const valuesExist = Object.keys(formValues).length > 0;
    const currentValues = getValues();
    const currentValuesEmpty = Object.keys(currentValues).length === 0 || 
                             Object.values(currentValues).every(val => val === undefined || val === '');
    
    // Only reset if we have saved values AND current form is empty 
    // (prevents overwriting in-progress form entries)
    if (valuesExist && currentValuesEmpty) {
      reset(formValues);
      
      // Ensure validation gets triggered after reset
      setTimeout(() => {
        trigger();
      }, 100);
    }
  }, [formKey, formValues, reset, getValues, trigger]);

  // Force form re-render with a new key to ensure clean state
  const forceFormReset = useCallback(() => {
    setFormKey(prevKey => prevKey + 1);
  }, []);
  
  // Reset form when formValues are explicitly cleared externally
  useEffect(() => {
    // If form values are cleared externally (empty object)
    if (Object.keys(formValues).length === 0) {
      const currentValues = getValues();
      // Only reset if we currently have values in the form
      if (Object.keys(currentValues).length > 0) {
        // Clear form completely
        clearErrors();
        reset({}, {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false
        });
        forceFormReset();
      }
    }
  }, [formValues, getValues, clearErrors, reset, forceFormReset]);

  // Handle form submission
  const onSubmit = useCallback((data: Record<string, any>) => {
    // Create a clean copy of the data (removing empty fields)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => 
        value !== undefined && value !== null && value !== ''
      )
    );
    
    setFormData(cleanData);
    setShowResults(true);
  }, []);

  // Handle modal close
  const closeModal = useCallback(() => {
    setShowResults(false);
  }, []);

  // Show reset confirmation modal
  const showResetConfirmation = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  // Handle reset confirmation modal close
  const closeResetConfirmModal = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  // Handle form reset after confirmation
  const performFormReset = useCallback(() => {
    // Close the modals
    setShowResetConfirm(false);
    setShowResults(false);
    
    // Clear form data state
    setFormData({});
    
    // Clear all errors first
    clearErrors();
    
    // First clear context/persistent values to ensure they don't reload
    clearFormValues();
    
    // Then reset the react-hook-form state with empty values and reset validation state
    reset(
      {}, // Empty values
      {
        keepErrors: false,
        keepDirty: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false
      }
    );
    
    // Force form re-render with a new key to ensure complete clean state
    // This will reset all component states including touched states in form fields
    forceFormReset();
    
    // Trigger validation to update form validity after a longer delay
    // to ensure the form has been properly reset
    setTimeout(() => {
      // Force trigger validation on all fields
      trigger();
    }, 200);
  }, [clearFormValues, reset, forceFormReset, clearErrors, trigger]);

  // Force re-validation and update progress bar when any field changes
  useEffect(() => {
    // Set up an interval to check form state
    const validationInterval = setInterval(() => {
      // This will trigger validation and update the form state
      trigger();
    }, 500); // Check every 500ms
    
    return () => clearInterval(validationInterval);
  }, [trigger]);

  return (
    <div className="form-container">
      <div className="form-header">
        <h1 className="form-title">Dynamic Form</h1>
      </div>
      
      <FormProvider {...methods}>
        <form key={formKey} onSubmit={handleSubmit(onSubmit)}>
          <FormPersistenceStatus schema={schema} />
          <p className="required-fields-note">
            Fields marked with <span className="required-indicator">*</span> are mandatory.
          </p>
          {schema.map((section, index) => (
            <FormSection key={index} section={section} formKey={formKey} />
          ))}
          <div className="form-buttons">
            <button 
              className="submit-button" 
              type="submit" 
              disabled={!isValid}
            >
              Submit
            </button>
            <button 
              className="reset-button" 
              type="button" 
              onClick={showResetConfirmation}
              disabled={!hasFormFields}
            >
              Reset Form
            </button>
          </div>
        </form>
      </FormProvider>
      
      {/* Results Modal */}
      {showResults && (
        <ResultModal 
          formData={formData} 
          onClose={closeModal}
          clearForm={performFormReset}
        />
      )}
      
      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset Form"
        message="Are you sure you want to reset the form? All entered data will be lost and cannot be recovered."
        confirmText="Reset Form"
        cancelText="Cancel"
        onConfirm={performFormReset}
        onCancel={closeResetConfirmModal}
        confirmButtonClass="danger-button"
      />
    </div>
  );
};

export default DynamicForm; 
import React, { useMemo, memo } from 'react';
import { useFormContext as useReactHookFormContext } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import { FormSchema } from '../types/schema';
import '../styles/form-styles.css';

interface FormPersistenceStatusProps {
  schema?: FormSchema;
}

const FormPersistenceStatus: React.FC<FormPersistenceStatusProps> = memo(({ schema }) => {
  const { formValues } = useFormContext();
  const { formState: { errors } } = useReactHookFormContext();
  
  // Count required fields in the schema
  const requiredFieldsCount = useMemo(() => {
    if (!schema) return 0;
    
    return schema.reduce((count, section) => {
      return count + section.fields.filter(field => field.rules.required?.value).length;
    }, 0);
  }, [schema]);
  
  // Count filled required fields that pass validation
  const filledRequiredFields = useMemo(() => {
    if (!schema || !formValues) return 0;
    
    let count = 0;
    
    schema.forEach(section => {
      section.fields.forEach(field => {
        if (field.rules.required?.value) {
          const fieldId = field.id || 
            `${section.title.toLowerCase().replace(/\s+/g, '_')}_${field.label.toLowerCase().replace(/\s+/g, '_')}`;
          
          // A field is considered filled only if:
          // 1. It has a value (not empty/null/undefined)
          // 2. It doesn't have validation errors
          if (formValues[fieldId] !== undefined && 
              formValues[fieldId] !== null && 
              formValues[fieldId] !== '' && 
              !errors[fieldId]) {
            count++;
          }
        }
      });
    });
    
    return count;
  }, [schema, formValues, errors]);
  
  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (requiredFieldsCount === 0) return 100;
    return Math.round((filledRequiredFields / requiredFieldsCount) * 100);
  }, [filledRequiredFields, requiredFieldsCount]);
  
  // Memoize the field count to prevent unnecessary calculations
  const fieldCount = useMemo(() => 
    Object.keys(formValues).length, 
    [formValues]
  );
  
  // Always show progress for required fields, even if no fields are filled yet
  if (requiredFieldsCount > 0) {
    return (
      <div className="status-container fade-in">
        <div className="status-text full-width">
          <div className="status-icon"></div>
          <span className="status-message">Filled out {filledRequiredFields} of {requiredFieldsCount} required fields ({completionPercentage}%)</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  // For forms with no required fields, show the default message if there's saved data
  if (fieldCount > 0) {
    return (
      <div className="status-container fade-in">
        <div className="status-text full-width">
          <span className="status-message">You have {fieldCount} field{fieldCount !== 1 ? 's' : ''} with saved data</span>
        </div>
      </div>
    );
  }
  
  // Return null if there are no required fields and no saved data
  return null;
});

FormPersistenceStatus.displayName = 'FormPersistenceStatus';

export default FormPersistenceStatus; 
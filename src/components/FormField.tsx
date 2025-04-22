import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField as FormFieldType } from '../types/schema';
import { useFormContext as usePersistentFormContext } from '../context/FormContext';
import '../styles/form-styles.css';

interface FormFieldProps {
  field: FormFieldType;
  formKey?: number; // Added to detect form resets
}

// Custom hook for debounced value with improved type safety and cleanup
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on delay change or unmount)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const FormField: React.FC<FormFieldProps> = ({ field, formKey }) => {
  const { register, formState: { errors }, trigger, watch, getValues, setValue } = useFormContext();
  const { updateFormValues } = usePersistentFormContext();
  const [touched, setTouched] = useState(false);
  
  // Generate field name from id if available, otherwise from label
  const fieldName = useMemo(() => {
    // Use the id if available (which is already properly formatted in FormSection)
    if (field.id) {
      return field.id;
    }
    
    // Otherwise format the label consistently with how IDs are created in FormSection
    return `${field.label.toLowerCase().replace(/\s+/g, '_')}`;
  }, [field.label, field.id]);
  
  // Watch for field value changes
  const fieldValue = watch(fieldName);
  const previousValueRef = useRef<any>(undefined);
  
  // Debounce field value to reduce updates (increased to 500ms for better performance)
  const debouncedValue = useDebounce(fieldValue, 500);
  
  // Reset the touched state when form key changes (indicating form reset)
  useEffect(() => {
    if (formKey) {
      // Reset the touched state
      setTouched(false);
      // Reset the previous value reference
      previousValueRef.current = undefined;
      
      // Ensure field is properly re-registered with React Hook Form after reset
      const currentValue = getValues(fieldName);
      if (currentValue === undefined || currentValue === null || currentValue === '') {
        // If the field is empty after reset, explicitly set it to empty string to ensure proper form state
        setValue(fieldName, '', { shouldValidate: false, shouldDirty: false, shouldTouch: false });
      }
    }
  }, [formKey, fieldName, setValue, getValues]);
  
  // Reset the touched state when field value is reset to empty
  useEffect(() => {
    if (fieldValue === '' || fieldValue === undefined || fieldValue === null) {
      // If the form field is now empty, also clear the touched state
      if (previousValueRef.current !== undefined && 
          previousValueRef.current !== '' && 
          previousValueRef.current !== null) {
        setTouched(false);
      }
    }
  }, [fieldValue]);
  
  // Update persistent storage whenever the debounced field value changes
  useEffect(() => {
    // Skip initial undefined state
    if (debouncedValue === undefined && previousValueRef.current === undefined) {
      return;
    }
    
    // Check if value is different from previous (including empty string checks)
    const hasChanged = debouncedValue !== previousValueRef.current;
    const isPreviousEmpty = previousValueRef.current === '' || 
                           previousValueRef.current === null || 
                           previousValueRef.current === undefined;
    const isCurrentEmpty = debouncedValue === '' || 
                          debouncedValue === null || 
                          debouncedValue === undefined;
                          
    // Only update if the value has actually changed and they're not both empty
    if (hasChanged && !(isPreviousEmpty && isCurrentEmpty)) {
      // For number inputs, ensure we store the value as a number if it's a valid number
      if (field.type === 'input_number' && debouncedValue !== '' && debouncedValue !== null && debouncedValue !== undefined) {
        const numValue = Number(debouncedValue);
        if (!isNaN(numValue)) {
          updateFormValues(fieldName, numValue);
          previousValueRef.current = numValue;
          return;
        }
      }
      
      updateFormValues(fieldName, debouncedValue);
      previousValueRef.current = debouncedValue;
    }
  }, [debouncedValue, fieldName, updateFormValues, field.type]);

  // Build validation rules based on the field schema
  const validationRules = useMemo(() => {
    const rules: Record<string, any> = {};
    
    if (field.rules.required?.value) {
      rules.required = field.rules.required.error_message;
    }
    
    if (field.rules.min?.value) {
      // For numeric input, we need proper number validation
      if (field.type === 'input_number') {
        // Replace the react-hook-form built-in min validation with our custom validator
        // that properly handles numeric comparison
        rules.validate = {
          ...(rules.validate || {}),
          minValue: (value: string) => {
            // Skip validation for empty values (let required handle that)
            if (value === '' || value === undefined || value === null) {
              return true;
            }
            
            const numValue = Number(value);
            // Check if the parsed number is valid and meets the minimum
            if (isNaN(numValue) || numValue < field.rules.min!.value) {
              return field.rules.min!.error_message.replace('{{value}}', field.rules.min!.value.toString());
            }
            return true;
          }
        };
      } else {
        // For text inputs, use standard minLength
        rules.minLength = {
          value: field.rules.min.value,
          message: field.rules.min.error_message.replace('{{value}}', field.rules.min.value.toString())
        };
      }
    }
    
    if (field.rules.max?.value) {
      // For numeric input, we need proper number validation
      if (field.type === 'input_number') {
        // Replace the react-hook-form built-in max validation with our custom validator
        // that properly handles numeric comparison
        rules.validate = {
          ...(rules.validate || {}),
          maxValue: (value: string) => {
            // Skip validation for empty values (let required handle that)
            if (value === '' || value === undefined || value === null) {
              return true;
            }
            
            const numValue = Number(value);
            // Check if the parsed number is valid and meets the maximum
            if (isNaN(numValue) || numValue > field.rules.max!.value) {
              return field.rules.max!.error_message.replace('{{value}}', field.rules.max!.value.toString());
            }
            return true;
          }
        };
      } else {
        // For text inputs, use standard maxLength
        rules.maxLength = {
          value: field.rules.max.value,
          message: field.rules.max.error_message.replace('{{value}}', field.rules.max.value.toString())
        };
      }
    }
    
    if (field.rules.regex?.value) {
      rules.pattern = {
        value: new RegExp(field.rules.regex.value),
        message: field.rules.regex.error_message
      };
    }
    
    return rules;
  }, [field.rules, field.type]);

  // Handle blur event to show validation errors
  const handleBlur = useCallback(async () => {
    setTouched(true);
    await trigger(fieldName); // Trigger validation on this field
  }, [fieldName, trigger]);
  
  // Special handler for number input to ensure proper value handling
  const handleNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Let react-hook-form handle the raw string value in the input
    setValue(fieldName, value, { shouldValidate: true });
    
    // If the input is empty or not a valid number, we'll let the validation handle it
    if (value === '' || isNaN(Number(value))) {
      return;
    }
    
    // Trigger validation
    trigger(fieldName);
  }, [fieldName, setValue, trigger]);
  
  // Render the appropriate field based on type
  const renderField = () => {
    const commonProps = {
      ...register(fieldName, {
        ...validationRules,
        onChange: () => {
          // Trigger validation whenever the field value changes
          setTimeout(() => trigger(fieldName), 0);
        }
      }),
      id: fieldName,
      onBlur: handleBlur,
      required: field.rules.required?.value || undefined
    };

    switch (field.type) {
      case 'input':
        return <input {...commonProps} type="text" className="form-input" />;
      
      case 'input_number':
        return (
          <input 
            {...register(fieldName, {
              ...validationRules,
              onChange: (e) => {
                handleNumberChange(e);
                // Trigger validation on change
                setTimeout(() => trigger(fieldName), 0);
              }
            })}
            id={fieldName}
            type="number" 
            className="form-input"
            onBlur={handleBlur}
            required={field.rules.required?.value || undefined}
          />
        );
      
      case 'textarea':
        return <textarea {...commonProps} className="form-input form-textarea" />;
      
      case 'select':
        return (
          <select {...commonProps} className="form-input form-select">
            <option value="">-- Select an option --</option>
            {field.options?.map(option => (
              <option key={option.key} value={option.value}>
                {option.key}
              </option>
            ))}
          </select>
        );
      
      default:
        return <input {...commonProps} type="text" className="form-input" />;
    }
  };

  // Get the field error if exists
  const fieldError = errors[fieldName];
  const errorMessage = fieldError?.message as string | undefined;
  const showError = touched && errorMessage;
  
  return (
    <div className="field-container">
      <label htmlFor={fieldName} className="field-label">
        {field.label}
        {field.rules.required?.value && <span className="required-indicator">*</span>}
      </label>
      
      {renderField()}
      
      {showError && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default FormField; 
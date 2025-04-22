import React from 'react';
import { FormSection as FormSectionType } from '../types/schema';
import FormField from './FormField';
import '../styles/form-styles.css';

interface FormSectionProps {
  section: FormSectionType;
  formKey?: number;
}

const FormSection: React.FC<FormSectionProps> = ({ section, formKey }) => {
  // Use section title to generate IDs - process it the same way as in FormPersistenceStatus
  const sectionId = section.title.toLowerCase().replace(/\s+/g, '_');
  
  return (
    <div className="section-container">
      <h2 className="section-title">{section.title}</h2>
      {section.fields.map((field, index) => {
        // Create a scoped field with id if not already present
        const fieldWithId = {
          ...field,
          id: field.id || `${sectionId}_${field.label.toLowerCase().replace(/\s+/g, '_')}`
        };
        
        return <FormField key={index} field={fieldWithId} formKey={formKey} />;
      })}
    </div>
  );
};

export default FormSection; 
import { ReactNode } from 'react';

export enum PersistentStateKey {
  FormData = 'form_data',
}

export interface FormContextType {
  formValues: Record<string, any>;
  updateFormValues: (fieldId: string, value: any) => void;
  clearFormValues: () => void;
}

export interface FormProviderProps {
  children: ReactNode;
} 
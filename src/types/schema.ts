export interface ValidationRule {
  value: any;
  error_message: string;
}

export interface FieldRules {
  required?: ValidationRule;
  min?: ValidationRule | null;
  max?: ValidationRule | null;
  regex?: ValidationRule | null;
}

export interface SelectOption {
  key: string;
  value: string;
}

export interface FormField {
  id?: string;
  type: 'input' | 'input_number' | 'select' | 'textarea';
  label: string;
  options?: SelectOption[];
  rules: FieldRules;
}

export interface FormSection {
  title: string;
  fields: FormField[];
}

export type FormSchema = FormSection[]; 
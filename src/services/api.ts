import { FormSchema } from '../types/schema';

const DEFAULT_API_URL = 'https://private-705dcb-formgenerator1.apiary-mock.com/form_fields';
const TIMEOUT_MS = 10000; // 10 seconds timeout

// Helper function to handle fetch with timeout
const fetchWithTimeout = async (url: string, options = {}, timeout = TIMEOUT_MS) => {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const fetchFormSchema = async (url: string = DEFAULT_API_URL): Promise<FormSchema> => {
  try {
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Error ${response.status}: ${response.statusText}. ${errorText}`);
    }
    
    const data: unknown = await response.json();

    // Basic runtime validation to ensure the response conforms to FormSchema structure
    // Only perform lightweight checks to avoid adding a heavy validation library.
    if (!Array.isArray(data)) {
      throw new Error('Invalid schema format: Expected an array of form sections');
    }

    const isValidSchema = (data as unknown[]).every(section =>
      section &&
      typeof section === 'object' &&
      'title' in section &&
      'fields' in section &&
      Array.isArray((section as { fields: unknown }).fields)
    );

    if (!isValidSchema) {
      throw new Error('Invalid schema structure received from API');
    }

    const typedData = data as FormSchema;

    return typedData;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Request timeout: The server took too long to respond');
      throw new Error('Request timeout: The server took too long to respond');
    }
    console.error('Failed to fetch form schema:', error);
    throw error;
  }
}; 
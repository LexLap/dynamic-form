# Dynamic Form Generator

A responsive React TypeScript application that dynamically renders forms based on JSON schemas.

## Features

- Dynamically generates forms from JSON schema URLs
- Real-time validation according to the schema's rules
- Responsive design that works on desktop and mobile devices
- Session persistence to remember your form state
- Form submission with result display
- Support for multiple field types:
  - Text inputs
  - Number inputs
  - Select dropdowns
  - Textareas

## Technologies Used

- React 19
- TypeScript
- React Hook Form for form handling
- Session Storage for state persistence
- Responsive CSS

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/LexLap/dynamic-form.git
cd dynamic-form
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. When you first open the application, you'll see a form to enter a schema URL
2. By default, it uses `https://private-705dcb-formgenerator1.apiary-mock.com/form_fields`
3. Enter a valid URL that returns a form schema JSON
4. Click "Generate Form" to load the dynamic form
5. Fill out the form fields according to the validation rules
6. Submit the form when all fields are valid
7. View the submitted data in the result modal

## Schema Format

The application expects a JSON schema in the following format:

```json
[
  {
    "title": "Section Title",
    "fields": [
      {
        "id": "field_id",
        "type": "input",
        "label": "Field Label",
        "rules": {
          "required": {
            "value": true,
            "error_message": "This field is required"
          },
          "min": {
            "value": 5,
            "error_message": "Minimum length is 5 characters"
          },
          "max": {
            "value": 50,
            "error_message": "Maximum length is 50 characters"
          },
          "regex": {
            "value": "^[a-zA-Z0-9]+$",
            "error_message": "Only alphanumeric characters allowed"
          }
        }
      }
    ]
  }
]
```

Field types supported:
- `input`: Text input
- `input_number`: Number input
- `select`: Dropdown select (requires 'options' array)
- `textarea`: Multiline text area

import '@testing-library/jest-dom';

// Mock import.meta.env for tests
Object.defineProperty(window, 'import', {
  value: {
    meta: {
      env: {
        VITE_OPENAI_API_KEY: 'test-api-key'
      }
    }
  }
});
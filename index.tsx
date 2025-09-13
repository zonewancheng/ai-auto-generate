
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initDB } from './services/geminiService';
import { LanguageProvider } from './services/i18n';
import DbError from './components/DbError';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Initialize the database before rendering the app to ensure it's ready.
initDB().then(() => {
  console.log("Database connection established, rendering App.");
  root.render(
    <React.StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </React.StrictMode>
  );
}).catch(error => {
  console.error("Failed to initialize database. Application cannot start.", error);
  // Display a user-friendly error message if the database fails to open.
  root.render(<DbError error={error} />);
});

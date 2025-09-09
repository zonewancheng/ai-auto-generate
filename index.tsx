
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initDB } from './services/geminiService';

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
      <App />
    </React.StrictMode>
  );
}).catch(error => {
  console.error("Failed to initialize database. Application cannot start.", error);
  // Display a user-friendly error message if the database fails to open.
  rootElement.innerHTML = `
    <div style="color: #fca5a5; background-color: #111827; padding: 2rem; text-align: center; font-family: 'VT323', monospace; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 4px solid #8b5cf6;">
      <h1 style="font-size: 2.5rem; color: #facc15; font-family: 'Press Start 2P', cursive;">应用错误</h1>
      <p style="font-size: 1.25rem; margin-top: 1rem;">无法连接到本地数据库。</p>
      <p style="font-size: 1.25rem;">您的历史记录将无法保存。</p>
      <p style="font-size: 1rem; margin-top: 2rem; color: #9ca3af; max-width: 600px;">这可能是由于在隐私/无痕模式下浏览，或浏览器设置阻止了数据存储。请检查您的浏览器设置，然后刷新页面重试。</p>
      <p style="font-size: 0.8rem; margin-top: 1rem; color: #6b7280;">错误详情: ${error}</p>
    </div>
  `;
});

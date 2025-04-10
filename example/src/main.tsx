import { BrowserRouter } from "react-router";
import { createRoot } from 'react-dom/client';
import './index.scss';
import App from './App';

// Aspera properties are put on window to avoid building and minifying and losing commments
declare global {
  interface Window {
    [key: string]: any;
  }
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

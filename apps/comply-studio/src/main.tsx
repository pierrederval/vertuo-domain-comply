import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.js';
import './studio.css';

const mount = document.getElementById('studio');
if (mount === null) throw new Error('The Studio has nowhere to draw itself.');

createRoot(mount).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Polyfill Buffer for Stellar SDK in browser environment
import { Buffer } from 'buffer'
window.Buffer = window.Buffer || Buffer
globalThis.Buffer = globalThis.Buffer || Buffer

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

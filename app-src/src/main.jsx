import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './observatory.css'
import './journey.css'
import './universe.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

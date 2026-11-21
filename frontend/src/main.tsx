import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from './app/providers'
import AppRoutes from './app/routes'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </StrictMode>,
)

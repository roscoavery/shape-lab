import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isAndroid } from './lib/delayCameraPipeline'

function applyAndroidShell() {
  if (!isAndroid()) return
  document.documentElement.classList.add('android')
  const ensureMeta = (name: string, content: string) => {
    let el = document.querySelector(`meta[name="${name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', name)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }
  ensureMeta('theme-color', '#0f1419')
  ensureMeta('mobile-web-app-capable', 'yes')
}

applyAndroidShell()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

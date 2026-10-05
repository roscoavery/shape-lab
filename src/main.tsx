import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installLegacySafariShims } from './lib/legacySafari'
import './index.css'
import App from './App.tsx'
import PublicSharePage from './components/share/PublicSharePage.tsx'
import PublicFolderPage from './components/share/PublicFolderPage.tsx'
import { isAndroid } from './lib/delayCameraPipeline'

installLegacySafariShims()

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
    {shareFolderTokenFromPath() ? (
      <PublicFolderPage token={shareFolderTokenFromPath()!} />
    ) : shareCardIdFromPath() ? (
      <PublicSharePage cardId={shareCardIdFromPath()!} />
    ) : (
      <App />
    )}
  </StrictMode>,
)

/** /share/folder/<token> renders the public no-account athlete video folder. */
function shareFolderTokenFromPath(): string | null {
  try {
    const m = /^\/share\/folder\/([^/?#]+)/.exec(window.location.pathname)
    return m ? decodeURIComponent(m[1]) : null
  } catch {
    return null
  }
}

/** /share/<guideId|skillId> renders the public no-account card page. */
function shareCardIdFromPath(): string | null {
  try {
    const m = /^\/share\/([^/?#]+)/.exec(window.location.pathname)
    return m ? decodeURIComponent(m[1]) : null
  } catch {
    return null
  }
}

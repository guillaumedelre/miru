const MIRU_URL = (import.meta.env.VITE_MIRU_URL as string | undefined) ?? 'http://localhost:5173'

export function injectButton(title: string): void {
  if (document.getElementById('miru-import-btn')) return

  const logoUrl = chrome.runtime.getURL('icons/icon-32.png')

  const img = document.createElement('img')
  img.src = logoUrl
  img.style.cssText = 'width:20px;height:20px;object-fit:contain;flex-shrink:0'

  const label = document.createTextNode(' Ajouter à Miru')

  const btn = document.createElement('button')
  btn.id = 'miru-import-btn'
  btn.appendChild(img)
  btn.appendChild(label)
  btn.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    'display:flex', 'align-items:center', 'gap:8px',
    'padding:10px 18px', 'background:#18181b', 'color:#fff',
    'border:none', 'border-radius:8px', 'font-size:14px',
    'font-weight:600', 'cursor:pointer', 'box-shadow:0 4px 12px rgba(0,0,0,0.4)',
    'font-family:sans-serif',
  ].join(';')

  btn.addEventListener('click', () => {
    const url = new URL(`${MIRU_URL}/import`)
    url.searchParams.set('q', title)
    window.open(url.toString(), '_blank')
  })

  document.body.appendChild(btn)
}

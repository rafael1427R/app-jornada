/**
 * Impressão sem bibliotecas externas: `window.print()` + regra `@page`
 * injetada dinamicamente conforme o formato desejado.
 */

const PAGE_STYLE_ID = 'vitalis-page-style'

const PAGE_RULES = {
  badge: '@page { size: 100mm 65mm; margin: 0; }',
  a4: '@page { size: A4 portrait; margin: 12mm; }',
  'a4-landscape': '@page { size: A4 landscape; margin: 10mm; }',
}

export function applyPageRule(mode = 'a4') {
  if (typeof document === 'undefined') return
  let style = document.getElementById(PAGE_STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = PAGE_STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = PAGE_RULES[mode] || PAGE_RULES.a4
}

/**
 * Coloca o documento em modo de impressão (o conteúdo do #print-root passa
 * a ser o único visível), dispara window.print() e restaura o estado.
 */
export function runPrint(mode = 'a4') {
  if (typeof window === 'undefined') return
  applyPageRule(mode)
  document.body.classList.add('is-printing')
  const cleanup = () => {
    document.body.classList.remove('is-printing')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.setTimeout(() => {
    window.print()
    window.setTimeout(cleanup, 800)
  }, 120)
}

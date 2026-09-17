import { createPortal } from 'react-dom'

/**
 * Renderiza o conteúdo destinado à impressão dentro de #print-root.
 * Durante o `window.print()` apenas esse conteúdo fica visível.
 */
export default function PrintArea({ active, children }) {
  if (typeof document === 'undefined') return null
  const target = document.getElementById('print-root')
  if (!target || !active) return null
  return createPortal(children, target)
}

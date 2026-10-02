import { useState } from 'react'
import { Activity } from 'lucide-react'
import { HOSPITAL_NAME, HOSPITAL_SHORT, INSTITUTION_NAME, LOGOS } from '@/lib/brand'

/**
 * Exibe a arte oficial de `public/logos/`. Tenta os formatos suportados na
 * ordem definida em LOGOS e, se nenhum existir, cai para a marca padrão —
 * assim o sistema nunca quebra por falta do arquivo.
 */
export function Logo({ variant = 'hospital', className = 'h-10', alt }) {
  const fontes = LOGOS[variant] || []
  const [indice, setIndice] = useState(0)

  if (indice >= fontes.length) return <LogoFallback variant={variant} className={className} />

  return (
    <img
      src={fontes[indice]}
      alt={alt || (variant === 'isac' ? INSTITUTION_NAME : HOSPITAL_NAME)}
      className={`${className} w-auto object-contain`}
      onError={() => setIndice((atual) => atual + 1)}
    />
  )
}

/** Marca substituta usada enquanto o arquivo oficial não está na pasta. */
export function LogoFallback({ variant = 'hospital', className = 'h-10' }) {
  if (variant === 'isac') {
    return (
      <span className={`${className} inline-flex aspect-square items-center justify-center rounded-xl border-2 border-primary font-bold tracking-widest text-primary`}>
        ISAC
      </span>
    )
  }
  return (
    <span className={`${className} inline-flex aspect-square items-center justify-center rounded-xl bg-primary text-emerald-300`}>
      <Activity className="h-2/3 w-2/3" strokeWidth={2.6} />
    </span>
  )
}

/** Marca institucional impressa: hospital + ISAC lado a lado. */
export function LogoLockup({ className = '', size = 'h-12', textoClassName = '' }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Logo variant="hospital" className={size} />
      <span className="h-8 w-px bg-current opacity-20" aria-hidden="true" />
      <Logo variant="isac" className={size} />
      <span className={`sr-only ${textoClassName}`}>
        {HOSPITAL_SHORT} — {HOSPITAL_NAME} · {INSTITUTION_NAME}
      </span>
    </div>
  )
}

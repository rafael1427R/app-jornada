import { Logo } from '@/components/Logo'
import { HOSPITAL_NAME, INSTITUTION_NAME } from '@/lib/brand'
import { formatDateTime } from '@/lib/format'

/** Cabeçalho institucional padrão de todos os documentos impressos. */
export default function PrintHeader({ titulo, subtitulo }) {
  return (
    <header className="mb-3 border-b-2 border-black pb-2">
      <div className="flex items-center justify-between gap-4">
        <Logo variant="hospital" className="h-[12mm]" />
        <div className="flex-1 text-center">
          <p className="text-[10px] font-bold uppercase leading-tight">{HOSPITAL_NAME}</p>
          <p className="text-[9px] leading-tight">{INSTITUTION_NAME}</p>
        </div>
        <Logo variant="isac" className="h-[14mm]" />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{titulo}</p>
          {subtitulo ? <p className="text-[10px]">{subtitulo}</p> : null}
        </div>
        <p className="text-[9px]">Emitido em {formatDateTime(new Date().toISOString())}</p>
      </div>
    </header>
  )
}

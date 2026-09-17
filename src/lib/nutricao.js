import { ENTERAL_ROUTES } from './constants'

/**
 * Registros antigos guardavam a via como "Não se aplica"; a rotina do setor
 * trabalha com VO, SNG, SOG, SNE, GTT, NPT, Mista e Zero.
 */
export function viaDaDieta(dieta) {
  const via = dieta?.via_enteral
  if (!via || via === 'Não se aplica') return 'VO'
  return via
}

/** Paciente em terapia nutricional enteral (segue os horários da UTI). */
export function usaSonda(dieta) {
  return ENTERAL_ROUTES.includes(viaDaDieta(dieta))
}

/** Rótulo curto da dieta, do jeito que a UAN lê na etiqueta. */
export function resumoDaDieta(dieta) {
  const partes = [dieta?.consistencia]
  if (dieta?.modificacao && dieta.modificacao !== 'Sem modificação') partes.push(dieta.modificacao)
  const adequacoes = Array.isArray(dieta?.adequacoes) ? dieta.adequacoes : []
  return [partes.filter(Boolean).join(' · '), adequacoes.join(' · ')].filter(Boolean).join(' | ')
}

import { ENTERAL_ROUTES, MEALS } from './constants'

/**
 * Registros antigos guardavam a via como "Não se aplica"; a rotina do setor
 * trabalha com VO, SNG, SOG, SNE, GTT, JTT, NPT, Mista e Zero.
 */
export function viaDaDieta(dieta) {
  const via = dieta?.via_enteral
  if (!via || via === 'Não se aplica') return 'VO'
  return via
}

/**
 * Nome pelo qual o paciente deve ser chamado e identificado. O nome social,
 * quando informado, tem precedência sobre o nome de registro — é assim que a
 * etiqueta e a chamada à beira-leito devem sair.
 */
export function nomeDeChamada(pessoa) {
  const social = pessoa?.nome_social?.trim()
  if (social) return social
  return pessoa?.nome_paciente?.trim() || ''
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

/**
 * Próxima refeição a partir de um horário, respeitando o fluxo de UTI/sonda.
 * Passada a última refeição do dia, devolve a primeira do dia seguinte.
 */
export function proximaRefeicao(referencia = new Date(), sonda = false) {
  const minutosAgora = referencia.getHours() * 60 + referencia.getMinutes()
  const comMinutos = MEALS.map((refeicao) => {
    const [hora, minuto] = (sonda ? refeicao.horaUti : refeicao.hora).split(':').map(Number)
    return { ...refeicao, horario: sonda ? refeicao.horaUti : refeicao.hora, minutos: hora * 60 + minuto }
  })
  return comMinutos.find((refeicao) => refeicao.minutos > minutosAgora) || { ...comMinutos[0], amanha: true }
}

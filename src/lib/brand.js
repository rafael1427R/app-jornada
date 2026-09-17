/**
 * Identidade do sistema. Para renomear o produto inteiro basta alterar APP_NAME.
 */
export const APP_NAME = 'Vitalis'
export const APP_TAGLINE = 'Gestão Hospitalar'
export const HOSPITAL_NAME = 'Hospital Regional Chagas Rodrigues'
export const INSTITUTION_NAME = 'ISAC — Instituto de Saúde e Cidadania'
export const HOSPITAL_SHORT = 'HR'
export const SIDEBAR_TITLE = 'Centro Cirúrgico'
export const SIDEBAR_SUBTITLE = 'Sistema de Gestão'
export const LGPD_NOTICE = 'Conformidade LGPD — Sem dados pessoais identificáveis'

/**
 * Arquivos de identidade visual servidos de `public/logos/`.
 * Substitua os arquivos mantendo exatamente estes nomes — todo o sistema,
 * inclusive as impressões, passa a usar a arte oficial automaticamente.
 */
const EXTENSOES = ['png', 'svg', 'webp', 'jpg', 'jpeg']

const caminhos = (nome) => EXTENSOES.map((extensao) => `/logos/${nome}.${extensao}`)

export const LOGOS = {
  hospital: caminhos('hospital'),
  isac: caminhos('isac'),
}

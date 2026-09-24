/**
 * Exportação para CSV compatível com o Excel em português:
 * separador ponto e vírgula e BOM UTF-8 (senão os acentos saem quebrados).
 */
function escapar(valor) {
  const texto = valor == null ? '' : String(valor)
  if (/[";\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`
  return texto
}

export function baixarCsv(nomeArquivo, colunas, linhas) {
  if (typeof document === 'undefined') return
  const cabecalho = colunas.map((coluna) => escapar(coluna.label)).join(';')
  const corpo = linhas.map((linha) => colunas.map((coluna) => escapar(coluna.valor(linha))).join(';'))
  const conteudo = `﻿${[cabecalho, ...corpo].join('\r\n')}`

  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Sufixo de data para o nome do arquivo: relatorio-2026-09-17.csv */
export function carimboArquivo(base) {
  const agora = new Date()
  const data = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  return `${base}-${data}.csv`
}

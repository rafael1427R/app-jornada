import { supabase, supabaseEnabled } from './supabaseClient'

/**
 * Autenticação conferida dentro do banco (função `autenticar_usuario`,
 * criada por `supabase/security.sql`). A senha é comparada no servidor —
 * o navegador nunca recebe o hash.
 *
 * Quando o Supabase não está configurado, ou quando o security.sql ainda
 * não foi executado, devolve `{ unavailable: true }` e o app usa a
 * verificação local.
 */
const MENSAGENS = {
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado.',
  SENHA_INCORRETA: 'Senha incorreta.',
  USUARIO_INATIVO: 'Usuário inativo. Procure o administrador.',
}

function traduzir(mensagem = '') {
  const chave = Object.keys(MENSAGENS).find((item) => mensagem.includes(item))
  return chave ? MENSAGENS[chave] : null
}

export async function autenticarRemoto(usuario, senha) {
  if (!supabaseEnabled) return { unavailable: true }
  try {
    const { data, error } = await supabase.rpc('autenticar_usuario', { p_usuario: usuario, p_senha: senha })
    if (error) {
      const traduzida = traduzir(error.message)
      if (traduzida) return { ok: false, error: traduzida }
      return { unavailable: true }
    }
    const encontrado = Array.isArray(data) ? data[0] : data
    if (!encontrado) return { ok: false, error: MENSAGENS.USUARIO_NAO_ENCONTRADO }
    return { ok: true, user: encontrado }
  } catch {
    return { unavailable: true }
  }
}

/** Confere a senha atual sem trazer o hash para o navegador. */
export async function conferirSenhaRemota(id, senha) {
  if (!supabaseEnabled) return { unavailable: true }
  try {
    const { data, error } = await supabase.rpc('conferir_senha', { p_id: id, p_senha: senha })
    if (error) return { unavailable: true }
    return { ok: Boolean(data) }
  } catch {
    return { unavailable: true }
  }
}

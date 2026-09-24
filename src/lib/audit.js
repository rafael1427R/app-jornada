import { useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createRecord } from '@/data/store'

/**
 * Registro de auditoria: quem fez o quê, quando e em qual registro.
 * Conformidade LGPD: grava o número do prontuário, nunca o nome do paciente.
 */
export function useAudit() {
  const { user } = useAuth()

  return useCallback(
    async (entrada) => {
      try {
        await createRecord('auditoria', {
          data: new Date().toISOString(),
          usuario: user?.nome || 'Sistema',
          funcao: user?.funcao || '—',
          entidade: 'leito',
          entidade_id: '',
          referencia: '',
          prontuario: '',
          setor: '',
          detalhe: '',
          ...entrada,
        })
      } catch (error) {
        // A auditoria nunca pode derrubar a operação assistencial.
        // eslint-disable-next-line no-console
        console.warn('[auditoria] não foi possível registrar o log:', error.message)
      }
    },
    [user],
  )
}

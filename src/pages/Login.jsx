import { useState } from 'react'
import { Activity, Eye, EyeOff, Lock, LogIn, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { APP_NAME, APP_TAGLINE, HOSPITAL_NAME, INSTITUTION_NAME, LGPD_NOTICE } from '@/lib/brand'
import { Field, Input, Spinner } from '@/components/ui'

export default function Login() {
  const { login, loadingUsers } = useAuth()
  const toast = useToast()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!usuario.trim()) nextErrors.usuario = 'Informe o usuário.'
    if (!senha.trim()) nextErrors.senha = 'Informe a senha.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    window.setTimeout(() => {
      const result = login(usuario.trim(), senha)
      setSubmitting(false)
      if (!result.ok) {
        setErrors({ geral: result.error })
        toast.error(result.error)
        return
      }
      toast.success(`Bem-vindo(a), ${result.user.nome}.`)
    }, 350)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-white p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-emerald-300 shadow-lg">
            <Activity className="h-9 w-9" strokeWidth={2.6} />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">{APP_NAME}</h1>
          <p className="text-sm font-semibold text-slate-500">{APP_TAGLINE} · Centro Cirúrgico</p>
          <p className="mt-2 text-xs text-slate-400">{HOSPITAL_NAME}</p>
          <p className="text-xs text-slate-400">{INSTITUTION_NAME}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <h2 className="text-base font-semibold text-slate-800">Acesso ao sistema</h2>

          <Field label="Usuário" error={errors.usuario}>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                value={usuario}
                autoComplete="username"
                onChange={(event) => setUsuario(event.target.value)}
                placeholder="seu.usuario"
              />
            </div>
          </Field>

          <Field label="Senha" error={errors.senha}>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 pr-10"
                type={showPassword ? 'text' : 'password'}
                value={senha}
                autoComplete="current-password"
                onChange={(event) => setSenha(event.target.value)}
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 transition hover:bg-slate-100"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          {errors.geral ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{errors.geral}</p> : null}

          <button type="submit" className="btn-primary w-full" disabled={submitting || loadingUsers}>
            {submitting ? <Spinner className="h-4 w-4 text-white" /> : <LogIn className="h-4 w-4" />}
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-[11px] leading-snug text-slate-500">{LGPD_NOTICE}. Primeiro acesso do administrador: usuário <b>admin</b> · senha <b>1123</b>.</p>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          <a href="/status" className="font-semibold text-primary hover:underline">
            Painel de Acompanhantes
          </a>{' '}
          · acesso público sem login
        </p>
      </div>
    </div>
  )
}

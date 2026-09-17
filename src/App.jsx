import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import Layout from '@/components/layout/Layout'
import { EmptyState, LoadingState } from '@/components/ui'
import { ShieldAlert } from 'lucide-react'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import MapaCirurgico from '@/pages/MapaCirurgico'
import Agendamento from '@/pages/Agendamento'
import EquipeMedica from '@/pages/EquipeMedica'
import Prontuarios from '@/pages/Prontuarios'
import Equipamentos from '@/pages/Equipamentos'
import Indicadores from '@/pages/Indicadores'
import Rpa from '@/pages/Rpa'
import EscalaPlantao from '@/pages/EscalaPlantao'
import Visitantes from '@/pages/Visitantes'
import Leitos from '@/pages/Leitos'
import ProntoSocorro from '@/pages/ProntoSocorro'
import Usuarios from '@/pages/Usuarios'
import PainelStatus from '@/pages/PainelStatus'

function Guard({ moduleId, children }) {
  const { can } = useAuth()
  if (!can(moduleId)) {
    return (
      <div className="card">
        <EmptyState
          icon={ShieldAlert}
          title="Acesso não autorizado"
          description="Seu perfil não possui permissão para este módulo. Solicite liberação ao administrador do sistema."
        />
      </div>
    )
  }
  return children
}

function PrivateArea() {
  const { isAuthenticated, hydrated, loadingUsers } = useAuth()

  if (!hydrated || loadingUsers) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState label="Carregando sistema..." />
      </div>
    )
  }

  if (!isAuthenticated) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Guard moduleId="dashboard"><Dashboard /></Guard>} />
        <Route path="/mapa" element={<Guard moduleId="mapa"><MapaCirurgico /></Guard>} />
        <Route path="/agendamento" element={<Guard moduleId="agendamento"><Agendamento /></Guard>} />
        <Route path="/equipe" element={<Guard moduleId="equipe"><EquipeMedica /></Guard>} />
        <Route path="/prontuarios" element={<Guard moduleId="prontuarios"><Prontuarios /></Guard>} />
        <Route path="/equipamentos" element={<Guard moduleId="equipamentos"><Equipamentos /></Guard>} />
        <Route path="/indicadores" element={<Guard moduleId="indicadores"><Indicadores /></Guard>} />
        <Route path="/rpa" element={<Guard moduleId="rpa"><Rpa /></Guard>} />
        <Route path="/escala" element={<Guard moduleId="escala"><EscalaPlantao /></Guard>} />
        <Route path="/visitantes" element={<Guard moduleId="visitantes"><Visitantes /></Guard>} />
        <Route path="/leitos" element={<Guard moduleId="leitos"><Leitos /></Guard>} />
        <Route path="/pronto-socorro" element={<Guard moduleId="pronto-socorro"><ProntoSocorro /></Guard>} />
        <Route path="/usuarios" element={<Guard moduleId="usuarios"><Usuarios /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/status" element={<PainelStatus />} />
            <Route path="/*" element={<PrivateArea />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

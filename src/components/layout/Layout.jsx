import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MODULES } from '@/lib/constants'
import { HOSPITAL_NAME, INSTITUTION_NAME } from '@/lib/brand'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const current = MODULES.find((module) => (module.path === '/' ? location.pathname === '/' : location.pathname.startsWith(module.path)))

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-64">
        <Header title={current?.label || 'Painel'} description={`${HOSPITAL_NAME} · ${INSTITUTION_NAME}`} onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

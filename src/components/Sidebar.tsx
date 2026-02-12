'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { signOut } from '@/lib/auth'
import { Profile } from '@/lib/leads'
import ConfirmModal from './ConfirmModal'

interface SidebarProps {
  children: React.ReactNode
}

export default function Sidebar({ children }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(data)
      }
    }
    loadProfile()
  }, [supabase])

  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
  }

  const isActive = (path: string) => pathname === path

  const menuItems = [
    {
      label: 'Novos Leads',
      path: '/admin/kanban',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      visible: true,
    },
    {
      label: 'Meus Leads',
      path: '/sdr/kanban',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      visible: profile?.role === 'sdr' || profile?.role === 'admin',
    },

    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      visible: profile?.role === 'admin',
    },
    {
      label: 'Usuários',
      path: '/admin/usuarios',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      visible: profile?.role === 'admin',
    },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-[#8B0000] text-white rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M4 6h16M4 12h16M4 18h16" : "M6 18L18 6M6 6l12 12"} />
        </svg>
      </button>

      {/* Overlay for mobile when menu is open */}
      {!collapsed && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-[#8B0000] to-[#5C0000] text-white shadow-xl z-40 transition-all duration-300 ease-in-out 
          ${collapsed ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0 w-64'}
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              {/* Logo branca para sidebar vermelha */}
              <img src="/logo-white.png" alt="Two Legacy" className="w-8 h-8 object-contain" />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
              <div>
                <h1 className="font-bold text-lg whitespace-nowrap leading-tight">Two Legacy</h1>
                <p className="text-xs text-white/70 whitespace-nowrap">Leads</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:block absolute -right-3 top-20 bg-white shadow-lg rounded-full p-1.5 text-gray-600 hover:text-[#8B0000] transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {menuItems.filter(item => item.visible).map((item) => (
            <button
              key={item.path}
              onClick={() => {
                router.push(item.path)
                if (window.innerWidth < 768) setCollapsed(true)
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span className={`font-medium ${collapsed ? 'md:hidden' : 'block'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* User info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          {( !collapsed ) && profile && (
            <div className="mb-3 px-3">
              <p className="font-medium text-sm truncate">{profile.name}</p>
              <p className="text-xs text-white/60 capitalize">{profile.role}</p>
            </div>
          )}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`font-medium ${collapsed ? 'md:hidden' : 'block'}`}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 min-w-0 transition-all duration-300 ${collapsed ? 'md:ml-16' : 'md:ml-64'} ml-0 pt-16 md:pt-0`}>
        {children}
      </main>

      {/* Logout confirmation modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Confirmar saída"
        message="Tem certeza que deseja sair do sistema?"
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        variant="danger"
      />
    </div>
  )
}

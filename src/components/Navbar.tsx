import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface NavbarProps {
  /** Which nav item to highlight as active */
  activeItem?: 'Beranda' | 'Semua Aduan' | 'Profil' | 'Tentang'
  /** Custom CTA click handler — defaults to navigating to /chat */
  onCtaClick?: () => void
}

export function Navbar({ activeItem, onCtaClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const navigate = useNavigate()
  const { logout, isAuthenticated } = useAuthStore()
  const { openModal } = useAuthModalStore()
  const { toast } = useToast()

  // Navigation item definitions — dynamically calculated based on auth status
  const navItems = [
    { label: 'Beranda',     route: '/',           protected: false },
    { label: 'Semua Aduan', route: '/all-reports', protected: true  },
    ...(isAuthenticated ? [{ label: 'Profil', route: '/profile', protected: true }] : []),
    { label: 'Tentang',     route: '/about',      protected: false },
  ]

  // Track window scroll to toggle between transparent wide layout and floating pill layout
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    // Run once on mount to handle initial scroll position
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (item: { label: string; route: string; protected: boolean }) => {
    setMobileMenuOpen(false)
    if (item.protected && !isAuthenticated) {
      openModal('login')
    } else {
      navigate(item.route)
    }
  }

  const handleCta = () => {
    setMobileMenuOpen(false)
    if (onCtaClick) {
      onCtaClick()
    } else {
      navigate('/chat')
    }
  }

  const handleLogout = () => {
    setMobileMenuOpen(false)
    logout()
    toast({ title: 'Sesi Berakhir', description: 'Anda telah berhasil keluar dari sistem.', type: 'info' })
  }

  return (
    <>
      {/* Outer fixed header — covers 100% viewport width, acts as a layout container without shifting */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full flex items-center justify-center pointer-events-none h-[88px] bg-transparent border-none">
        
        {/* Inner dynamic wrapper — shrinks/expands dynamically centered via flex-justify-center */}
        <div
          className={cn(
            "flex items-center justify-between pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            isScrolled
              ? "w-[calc(100%-2rem)] max-w-5xl h-[54px] px-6 md:px-8 rounded-full border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-[0_20px_45px_rgba(0,0,0,0.65)] mt-4"
              : "w-full max-w-full h-[68px] px-6 md:px-10 border-b border-transparent bg-transparent mt-0"
          )}
        >
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 group select-none cursor-pointer shrink-0"
          >
            <img src="/assets/logo/komunitas.png" alt="KOMUNITAS Logo" className="h-7 w-7 object-contain rounded-md transition-opacity group-hover:opacity-85" />
            <span className="font-semibold text-[15px] tracking-[-0.02em] text-zinc-100">KOMUNITAS</span>
          </div>

          {/* Desktop Nav — flows naturally without absolute centering */}
          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={cn(
                  "text-[13px] transition-all duration-300 tracking-[-0.01em] cursor-pointer relative py-1.5",
                  activeItem === item.label
                    ? "text-zinc-100 font-semibold"
                    : "text-zinc-400 hover:text-zinc-100"
                )}
                onClick={() => handleNavClick(item)}
              >
                <span>{item.label}</span>
                {activeItem === item.label && (
                  <motion.span
                    layoutId="activeNavLine"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#DEDBC8] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Desktop Right Actions (Masuk/Keluar dynamically toggled) */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="h-8 px-4 text-[11px] font-bold rounded-full tracking-wide border bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-rose-400 border-zinc-850 hover:border-rose-950/40 transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Keluar
              </button>
            ) : (
              <button
                onClick={() => openModal('login')}
                className="h-8 px-4 text-[12px] font-medium rounded-full border border-zinc-800/80 hover:border-zinc-750 bg-transparent text-zinc-300 hover:text-white transition-all duration-300 active:scale-[0.97] cursor-pointer"
              >
                Masuk
              </button>
            )}
            <button
              onClick={handleCta}
              className="h-8 px-4 text-[12px] font-medium rounded-full tracking-[-0.01em] transition-all duration-300 active:scale-[0.97] cursor-pointer bg-zinc-100 hover:bg-white text-zinc-950 border border-transparent shadow hover:shadow-indigo-950/20"
            >
              Mulai Percakapan
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "fixed left-0 right-0 z-40 bg-zinc-950/98 backdrop-blur-xl border-b border-zinc-900 md:hidden flex flex-col px-6 py-5 space-y-5",
              isScrolled ? "top-[78px] mx-4 rounded-2xl border" : "top-[68px] w-full"
            )}
          >
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className={cn(
                    "text-left text-[15px] font-medium py-1 cursor-pointer transition-colors",
                    activeItem === item.label ? "text-white font-semibold" : "text-zinc-300 hover:text-white"
                  )}
                  onClick={() => handleNavClick(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="h-px bg-zinc-900" />

            <div className="flex flex-col gap-2.5">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full h-9 border border-zinc-800 text-rose-400 font-medium rounded-lg text-sm transition-colors cursor-pointer hover:bg-zinc-900"
                >
                  Keluar
                </button>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); openModal('login') }}
                  className="w-full h-9 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Masuk
                </button>
              )}
              <button
                onClick={handleCta}
                className="w-full h-9 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-sm transition-all cursor-pointer"
              >
                Mulai Percakapan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

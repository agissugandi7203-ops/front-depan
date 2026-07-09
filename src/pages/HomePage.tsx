import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Bot, Shield, FileText, Users,
  ArrowRight, Loader2, Sparkles,
  RefreshCw, CheckCircle2,
  AlertOctagon, HelpCircle,
  Camera, X, Paperclip, FileSpreadsheet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { chatService } from '@/services/api'
import { useChatStore } from '@/store/chatStore'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useAuthModalStore } from '@/store/authModalStore'
import Footer4Col from '@/components/ui/footer-column'
import { Navbar } from '@/components/Navbar'

// MermaidDiagram lazy-loaded — Mermaid library is ~2MB, only load when needed
const MermaidDiagram = lazy(() =>
  import('@/components/MermaidDiagram').then(m => ({ default: m.MermaidDiagram }))
)

// ─── Shared animation presets ────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } }
}

// ─── Feature card data ────────────────────────────────────────────────────────
const features = [
  {
    icon: Bot,
    title: 'Asisten AI 24/7',
    description: 'Pendampingan layanan publik dan administrasi pemerintahan kapan saja, tanpa antre.',
  },
  {
    icon: Shield,
    title: 'Verifikasi Berita',
    description: 'Cek silang klaim dan pesan berantai menggunakan basis data rujukan resmi terpercaya.',
  },
  {
    icon: FileText,
    title: 'Ringkasan Dokumen',
    description: 'Ubah teks birokrasi yang panjang menjadi instruksi konkret yang siap dieksekusi.',
  },
  {
    icon: Users,
    title: 'Inklusif & Terbuka',
    description: 'Dirancang untuk seluruh kalangan warga — tanpa hambatan teknis atau bahasa.',
  },
]


// ─── Inline markdown renderer for summary ─────────────────────────────────────
const parseLinks = (text: string) => {
  const parts = text.split(/(\[.*?\]\(.*?\))/g)
  return parts.map((part, i) => {
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
    if (linkMatch) {
      const linkText = linkMatch[1]
      const url = linkMatch[2]
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-100 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 font-medium transition-colors"
        >
          {linkText}
        </a>
      )
    }
    return part
  })
}

const parseItalics = (text: string) => {
  const parts = text.split(/(\*.*?\*)/g)
  return parts.flatMap((part, i): any => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return [
        <em key={i} className="italic text-zinc-300">
          {parseLinks(part.slice(1, -1))}
        </em>
      ]
    }
    return parseLinks(part)
  })
}

const parseMarkdownText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.flatMap((part, i): any => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return [
        <strong key={`b-${i}`} className="font-semibold text-zinc-100">
          {parseItalics(part.slice(2, -2))}
        </strong>
      ]
    }
    return parseItalics(part)
  })
}

const renderSummaryContent = (text: string) => {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let inMermaidBlock = false
  let mermaidLines: string[] = []

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    // Handle mermaid block opening
    if (trimmed.startsWith('```mermaid')) {
      inMermaidBlock = true
      inCodeBlock = true
      mermaidLines = []
      return
    }

    // Handle code block opening (non-mermaid)
    if (trimmed.startsWith('```') && !inCodeBlock) {
      inCodeBlock = true
      inMermaidBlock = false
      return
    }

    // Handle code block closing
    if (trimmed === '```' && inCodeBlock) {
      if (inMermaidBlock && mermaidLines.length > 0) {
        elements.push(
          <Suspense key={`mermaid-${idx}`} fallback={<div className="my-4 h-16 rounded-xl bg-zinc-900/80 border border-purple-900/30 animate-pulse" />}>
            <MermaidDiagram chart={mermaidLines.join('\n')} />
          </Suspense>
        )
      }
      inCodeBlock = false
      inMermaidBlock = false
      mermaidLines = []
      return
    }

    if (inMermaidBlock) {
      mermaidLines.push(line)
      return
    }

    if (inCodeBlock) {
      // Skip non-mermaid code block lines
      return
    }

    if (!trimmed) {
      elements.push(<div key={`empty-${idx}`} className="h-2" />)
      return
    }

    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={`hr-${idx}`} className="border-t border-zinc-800/80 my-3" />)
      return
    }

    // Headers
    if (trimmed.startsWith('#')) {
      const headerLevel = (trimmed.match(/^#+/) || ['#'])[0].length
      const cleanHeader = trimmed.replace(/^#+\s*/, '')
      const headerClass = headerLevel === 1
        ? "text-[14px] font-semibold text-zinc-100 mt-4 mb-2 tracking-tight"
        : headerLevel === 2
        ? "text-[13px] font-semibold text-zinc-100 mt-3.5 mb-1.5 tracking-tight"
        : "text-[12px] font-semibold text-zinc-200 mt-3 mb-1.5"
      elements.push(
        <div key={`h-${idx}`} className={headerClass}>
          {parseMarkdownText(cleanHeader)}
        </div>
      )
      return
    }

    // Unordered lists
    const bulletMatch = line.match(/^(\s*)([*+-])\s+(.*)/)
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1].length
      const indentLevel = Math.floor(indentSpaces / 2)
      const content = bulletMatch[3]
      elements.push(
        <div
          key={`li-${idx}`}
          className="text-[12px] text-zinc-300 leading-relaxed mb-2 flex items-start gap-2"
          style={{ paddingLeft: `${indentLevel * 1}rem` }}
        >
          <span className="text-zinc-500 shrink-0 select-none mt-1.5 text-[8px]">•</span>
          <span className="flex-1">{parseMarkdownText(content)}</span>
        </div>
      )
      return
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/)
    if (numberedMatch) {
      const indentSpaces = numberedMatch[1].length
      const indentLevel = Math.floor(indentSpaces / 2)
      const num = numberedMatch[2]
      const content = numberedMatch[3]
      elements.push(
        <div
          key={`nl-${idx}`}
          className="text-[12px] text-zinc-300 leading-relaxed mb-2 flex items-start gap-2"
          style={{ paddingLeft: `${indentLevel * 1}rem` }}
        >
          <span className="text-purple-400 shrink-0 select-none font-mono text-[11px] mt-0.5">{num}.</span>
          <span className="flex-1">{parseMarkdownText(content)}</span>
        </div>
      )
      return
    }

    elements.push(
      <p key={`p-${idx}`} className="text-[12px] text-zinc-300 leading-relaxed mb-2">
        {parseMarkdownText(trimmed)}
      </p>
    )
  })

  return elements
}

export function HomePage() {
  const [claim, setClaim]           = useState('')
  const [docText, setDocText]       = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimResult, setClaimResult]   = useState<any>(null)
  const [docLoading, setDocLoading]     = useState(false)
  const [docResult, setDocResult]       = useState<any>(null)

  // For Claim Verifier Image
  const [claimImage, setClaimImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null)
  const [claimImageLoading, setClaimImageLoading] = useState(false)
  const fileInputClaimRef = useRef<HTMLInputElement>(null)

  // For Document Summarizer File
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; size: number } | null>(null)
  const [docExtractLoading, setDocExtractLoading] = useState(false)
  const [isDraggingDoc, setIsDraggingDoc] = useState(false)
  const fileInputDocRef = useRef<HTMLInputElement>(null)

  const { createSession, setCurrentSession } = useChatStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { isAuthenticated, user, checkMe } = useAuthStore()
  const { openModal } = useAuthModalStore()

  useEffect(() => {
    if (isAuthenticated && !user) {
      checkMe().catch(() => {})
    }
  }, [isAuthenticated, user, checkMe])


  const heroVideoRef = useRef<HTMLVideoElement>(null)
  
  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return

    let rAF: number
    let direction: 'forward' | 'backward' = 'forward'
    let lastTime = performance.now()

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000
      lastTime = time

      if (direction === 'backward') {
        if (video.currentTime - dt <= 0) {
          video.currentTime = 0
          direction = 'forward'
          video.play().catch(() => {})
        } else {
          video.currentTime -= dt
          rAF = requestAnimationFrame(loop)
        }
      } else {
        rAF = requestAnimationFrame(loop)
      }
    }

    const handlePlay = () => {
      lastTime = performance.now()
      rAF = requestAnimationFrame(loop)
    }

    const handleEnded = () => {
      direction = 'backward'
      cancelAnimationFrame(rAF)
      lastTime = performance.now()
      rAF = requestAnimationFrame(loop)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('ended', handleEnded)

    video.play().catch(() => {})

    return () => {
      cancelAnimationFrame(rAF)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  const handleStartChat = useCallback(() => {
    const id = createSession(undefined, user?.id)
    setCurrentSession(id)
    navigate('/chat')
  }, [createSession, user?.id, setCurrentSession, navigate])

  // --- Claim Image Handlers ---
  const handleClaimImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Format Tidak Didukung', description: 'Silakan pilih file gambar.', type: 'error' })
      return
    }

    setClaimImageLoading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = (reader.result as string).replace(/^data:image\/[a-z]+;base64,/, '')
      setClaimImage({
        base64: base64String,
        mimeType: file.type,
        name: file.name
      })
      setClaimImageLoading(false)
    }
    reader.onerror = () => {
      toast({ title: 'Gagal Membaca File', description: 'Gagal memuat file gambar.', type: 'error' })
      setClaimImageLoading(false)
    }
    reader.readAsDataURL(file)
    if (fileInputClaimRef.current) fileInputClaimRef.current.value = ''
  }, [toast])

  const handlePasteClaim = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          setClaimImageLoading(true)
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64String = (reader.result as string).replace(/^data:image\/[a-z]+;base64,/, '')
            setClaimImage({
              base64: base64String,
              mimeType: file.type,
              name: file.name || `salinan_gambar_${Date.now()}.png`
            })
            setClaimImageLoading(false)
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }
  }, [])

  const handleVerifyClaim = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claim.trim() && !claimImage) return
    setClaimLoading(true)
    setClaimResult(null)
    try {
      const result = await chatService.validateClaim(
        claim,
        claimImage?.base64,
        claimImage?.mimeType
      )
      setClaimResult(result)
      if (result.isValid) {
        toast({ title: 'Informasi Valid', description: 'Klaim ini telah terverifikasi oleh lembaga resmi.', type: 'success' })
      } else if (result.confidence && result.confidence > 70) {
        toast({ title: 'Terindikasi Hoaks', description: 'Sistem mendeteksi klaim ini tidak akurat.', type: 'error' })
      } else {
        toast({ title: 'Belum Terverifikasi', description: 'Data rujukan untuk klaim ini belum memadai.', type: 'warning' })
      }
    } catch (err: any) {
      toast({ title: 'Kesalahan', description: err.message || 'Gagal memverifikasi klaim.', type: 'error' })
    } finally {
      setClaimLoading(false)
    }
  }, [claim, claimImage, toast])

  // --- Document File Handlers ---
  const processDocumentFile = useCallback(async (file: File) => {
    const supportedExtensions = ['pdf', 'docx', 'xlsx', 'xls', 'txt', 'md', 'markdown']
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    
    const isSupportedMime = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown'
    ].includes(file.type) || file.type.startsWith('text/')
    
    const isSupportedExt = supportedExtensions.includes(extension)

    if (!isSupportedMime && !isSupportedExt) {
      toast({ 
        title: 'Format Tidak Didukung', 
        description: 'Format berkas tidak didukung. Gunakan PDF, DOCX, XLSX, TXT, atau Markdown.', 
        type: 'error' 
      })
      return
    }

    setDocExtractLoading(true)
    try {
      const result = await chatService.extractFile(file)
      setDocText(result.text)
      setUploadedDoc({
        name: result.name,
        size: result.size
      })
      toast({ title: 'Teks Berhasil Diekstrak', description: `Selesai mengekstrak ${file.name}.`, type: 'success' })
    } catch (err: any) {
      toast({ title: 'Gagal Ekstraksi', description: err.message || 'Gagal mengekstrak teks dari berkas.', type: 'error' })
    } finally {
      setDocExtractLoading(false)
    }
  }, [toast])

  const handleDocFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processDocumentFile(file)
    }
    if (fileInputDocRef.current) fileInputDocRef.current.value = ''
  }, [processDocumentFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingDoc(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDraggingDoc(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingDoc(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processDocumentFile(file)
    }
  }, [processDocumentFile])

  const handlePasteDoc = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          processDocumentFile(file)
          break
        }
      }
    }
  }, [processDocumentFile])

  const handleSummarize = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docText.trim()) return
    setDocLoading(true)
    setDocResult(null)
    try {
      const result = await chatService.summarizeDocument(docText)
      setDocResult(result)
      toast({ title: 'Dokumen Diringkas', description: 'Poin-poin penting berhasil diekstrak.', type: 'success' })
    } catch (err: any) {
      toast({ title: 'Kesalahan', description: err.message || 'Gagal meringkas dokumen.', type: 'error' })
    } finally {
      setDocLoading(false)
    }
  }, [docText, toast])

  // Verdict badge config
  const getVerdict = (result: any) => {
    if (!result) return null
    if (result.isValid) return { label: 'VALID', Icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
    if (result.confidence && result.confidence > 70) return { label: 'TERINDIKASI HOAKS', Icon: AlertOctagon, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' }
    return { label: 'BELUM TERVERIFIKASI', Icon: HelpCircle, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
  }

  const verdict = getVerdict(claimResult)

  // Parallax scroll setup for Hero text elements
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"]
  })

  // Text vertical offsets based on scroll progress
  const titleY = useTransform(heroProgress, [0, 1], [0, -110])
  const subtitleY = useTransform(heroProgress, [0, 1], [0, -70])
  const ctaY = useTransform(heroProgress, [0, 1], [0, -40])

  return (
    <div className="min-h-screen bg-dot-pattern text-zinc-100 flex flex-col relative overflow-x-hidden">
      {/* ── Ambient radial glow — does not distract ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-zinc-500/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-indigo-500/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <Navbar activeItem="Beranda" onCtaClick={handleStartChat} />

      {/* ══ MAIN ═════════════════════════════════════════════════════════════ */}
      <main className="relative z-10 flex-1">

        {/* ── HERO — Fullscreen ping-pong video background, centered content ─── */}
        <section className="relative min-h-screen overflow-hidden bg-[#040404]">

          {/* Background Video (Ping-Pong controlled via refs) */}
          <video
            ref={heroVideoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover scale-105 opacity-80"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
          />

          {/* High-tech glassmorphism overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#040404] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#040404_100%)] pointer-events-none" />

          {/* Hero content — Centered */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 sm:px-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl flex flex-col items-center"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/20 backdrop-blur-md mb-6 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[11px] font-mono font-semibold tracking-widest text-cyan-300 uppercase">
                  Sistem Intelijen Publik
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-[2.5rem] sm:text-[3.5rem] md:text-[4rem] leading-[1.05] font-bold text-white tracking-tighter mb-6 drop-shadow-2xl">
                Akses Layanan <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Transparan</span> & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Terverifikasi</span>
              </h1>

              {/* Subtext */}
              <p className="text-[15px] md:text-[17px] text-zinc-300/90 font-light mb-10 max-w-xl mx-auto leading-relaxed drop-shadow-lg">
                Validasi informasi faktual, lacak laporan warga, dan pahami ringkasan regulasi birokrasi pemerintahan dengan bantuan AI super cepat.
              </p>

              {/* CTA */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  handleStartChat()
                }}
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-[14px] text-white overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-indigo-600 transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 tracking-wide">Mulai Konsultasi AI</span>
                <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </motion.div>
          </div>
        </section>

        {/* ── Transition strip — light → dark ─────────────────────────────── */}
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

        {/* ── FEATURES ────────────────────────────────────────────────────── */}
        <section id="features-section" className="max-w-5xl mx-auto px-6 md:px-10 pt-24 pb-28">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.45 }}
                  className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/55 hover:border-zinc-700/60 p-6 flex flex-col gap-5 transition-all duration-300 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-indigo-500/30 group-hover:bg-indigo-950/15 transition-all duration-300">
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors duration-300" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[14px] font-medium text-zinc-150 tracking-[-0.01em]">{f.title}</h3>
                    <p className="text-[12.5px] text-zinc-450 leading-relaxed font-light">{f.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* ── INTERACTIVE TOOLS ───────────────────────────────────────────── */}
        <section
          id="tools-section"
          className="max-w-5xl mx-auto px-6 md:px-10 pb-32 relative"
        >
          {/* Subtle background ambient glow for highlight */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-indigo-500/[0.015] rounded-full blur-[140px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="mb-12 flex flex-col items-center text-center space-y-2 relative z-10"
          >
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-widest mb-1.5">
              Akses Mandiri
            </span>
            <h2 className="text-[26px] md:text-[32px] font-semibold text-zinc-100 tracking-[-0.03em]">Alat Mandiri</h2>
            <div className="h-0.5 w-10 bg-indigo-500/40 rounded-full my-1" />
            <p className="text-[13.5px] text-zinc-400 font-normal max-w-md leading-relaxed pt-1">
              Gunakan langsung tanpa perlu membuka percakapan — cukup tempel teks dan dapatkan hasilnya secara instan.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Fact-Checker ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5 hover:border-zinc-700 transition-colors duration-300"
            >
              {/* Card header */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-zinc-100 tracking-[-0.02em]">Verifikasi Klaim</h3>
                  <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
                    Tempel berita atau pesan yang meragukan untuk divalidasi berdasarkan data resmi.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleVerifyClaim} className="space-y-3">
                <div className="relative group">
                  <textarea
                    value={claim}
                    onChange={(e) => setClaim(e.target.value)}
                    onPaste={handlePasteClaim}
                    placeholder="Contoh: Bantuan sosial Rp5 juta dari tautan Telegram resmi pemerintah..."
                    className="w-full h-28 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3.5 pb-10 text-[12px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:bg-zinc-800 focus:ring-1 focus:ring-zinc-700 transition-all resize-none leading-relaxed"
                  />
                  {/* Camera attachment button inside textarea */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputClaimRef}
                      onChange={handleClaimImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={claimLoading || claimImageLoading}
                      onClick={() => fileInputClaimRef.current?.click()}
                      className="h-7 w-7 rounded-md border border-zinc-750 bg-zinc-900 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer hover:bg-zinc-800"
                      title="Lampirkan tangkapan layar gambar"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    {claimImageLoading && (
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Membaca...
                      </span>
                    )}
                  </div>
                </div>

                {/* Claim Image Preview Thumbnail */}
                {claimImage && (
                  <div className="flex items-center justify-between p-2 rounded-lg border border-zinc-750 bg-zinc-850 text-[11px] text-zinc-300">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img
                        src={`data:${claimImage.mimeType};base64,${claimImage.base64}`}
                        alt="Klaim preview"
                        className="h-8 w-8 object-cover rounded border border-zinc-700"
                      />
                      <span className="truncate max-w-[180px] text-zinc-400">{claimImage.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClaimImage(null)}
                      className="text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={claimLoading || claimImageLoading || (!claim.trim() && !claimImage)}
                  className="w-full h-9 bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-md text-[12px] tracking-[-0.01em] transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  {claimLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Menganalisis...</>
                  ) : (
                    <><RefreshCw className="h-3.5 w-3.5 mr-2" />Cek Validitas</>
                  )}
                </Button>
              </form>

              {/* Result — Confidence Score Visual */}
              <AnimatePresence>
                {claimResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.35 }}
                    className="mt-1 rounded-2xl border bg-zinc-900/90 overflow-hidden"
                    style={{
                      borderColor: claimResult.isValid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'
                    }}
                  >
                    {/* Header Badge */}
                    <div
                      className="flex items-center gap-3 px-5 py-4"
                      style={{
                        background: claimResult.isValid
                          ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, transparent 60%)'
                          : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, transparent 60%)'
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded-full text-2xl font-bold border-2 shrink-0"
                        style={{
                          borderColor: claimResult.isValid ? '#10b981' : '#ef4444',
                          color: claimResult.isValid ? '#10b981' : '#ef4444',
                          background: claimResult.isValid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'
                        }}
                      >
                        {claimResult.isValid ? '✓' : '✗'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[15px] font-bold tracking-wide"
                          style={{ color: claimResult.isValid ? '#10b981' : '#ef4444' }}
                        >
                          {claimResult.isValid ? 'INFORMASI VALID' : 'TERINDIKASI HOAKS'}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">Hasil Verifikasi Fact-Checker AI</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-3xl font-black"
                          style={{ color: claimResult.isValid ? '#10b981' : '#ef4444' }}
                        >
                          {claimResult.confidence ?? (claimResult.isValid ? 90 : 20)}%
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Confidence</div>
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="px-5 pb-3">
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${claimResult.confidence ?? (claimResult.isValid ? 90 : 20)}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{
                            background: claimResult.isValid
                              ? 'linear-gradient(90deg, #059669, #10b981)'
                              : 'linear-gradient(90deg, #dc2626, #ef4444)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="px-5 pb-4">
                      <p className="text-[12px] text-zinc-300 leading-relaxed">
                        {claimResult.explanation || claimResult.reasoning}
                      </p>
                    </div>

                    {/* Sources */}
                    {claimResult.sources && claimResult.sources.length > 0 && (
                      <div className="border-t border-zinc-800 px-5 py-3">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-semibold">Sumber Referensi</p>
                        <div className="flex flex-col gap-1.5">
                          {claimResult.sources.slice(0, 5).map((src: any, i: number) => (
                            <a
                              key={i}
                              href={typeof src === 'string' ? src : src.url || src.link || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-sky-400 hover:text-sky-300 truncate underline underline-offset-2 transition"
                            >
                              {typeof src === 'string' ? src : (src.title || src.url || src.link || `Sumber ${i + 1}`)}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fallback source footer */}
                    {(!claimResult.sources || claimResult.sources.length === 0) && (
                      <div className="border-t border-zinc-800/60 px-5 py-2.5 flex justify-between text-[10px] text-zinc-600">
                        <span>{claimResult.source || 'Kominfo / TurnBackHoax'}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── Document Summarizer ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5 hover:border-zinc-700 transition-colors duration-300"
            >
              {/* Card header */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-zinc-100 tracking-[-0.02em]">Ringkasan Dokumen</h3>
                  <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">
                    Tempel regulasi atau persyaratan administrasi untuk mendapat intisari yang mudah dipahami.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form 
                onSubmit={handleSummarize} 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputDocRef}
                  onChange={handleDocFileChange}
                  accept=".pdf,.docx,.xlsx,.xls,.txt,.md,.markdown"
                  className="hidden"
                />

                {docExtractLoading ? (
                  <div className="w-full h-28 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/25 flex flex-col items-center justify-center gap-2 text-[12px] text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    <span>Mengekstrak teks berkas...</span>
                  </div>
                ) : uploadedDoc ? (
                  <div className="w-full h-28 rounded-lg border border-dashed border-zinc-700 bg-zinc-800/30 p-4 flex flex-col items-center justify-center text-center gap-1.5 relative group">
                    {uploadedDoc.name.endsWith('.xlsx') || uploadedDoc.name.endsWith('.xls') ? (
                      <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
                    ) : (
                      <FileText className="w-7 h-7 text-indigo-400" />
                    )}
                    <div className="text-[12px] font-medium text-zinc-250 truncate max-w-[280px]">
                      {uploadedDoc.name}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {(uploadedDoc.size / 1024).toFixed(1)} KB · Teks berhasil diekstrak
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedDoc(null)
                        setDocText('')
                      }}
                      className="absolute top-2.5 right-2.5 h-6 w-6 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer hover:bg-zinc-800"
                      title="Hapus berkas"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className={cn(
                    "relative group rounded-lg border bg-zinc-800/50 transition-all duration-200 overflow-hidden",
                    isDraggingDoc ? "border-indigo-500 ring-1 ring-indigo-500/30 bg-indigo-950/10" : "border-zinc-750 focus-within:border-zinc-600 focus-within:bg-zinc-800"
                  )}>
                    <textarea
                      value={docText}
                      onChange={(e) => setDocText(e.target.value)}
                      onPaste={handlePasteDoc}
                      placeholder="Tempel teks birokrasi, atau drag & drop file PDF, DOCX, XLSX, TXT, MD ke sini..."
                      className="w-full h-28 p-3.5 pb-10 text-[12px] text-zinc-300 placeholder:text-zinc-600 bg-transparent focus:outline-none resize-none leading-relaxed"
                    />
                    
                    {/* File Picker button inside textarea */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <button
                        type="button"
                        onClick={() => fileInputDocRef.current?.click()}
                        className="h-7 w-7 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer hover:bg-zinc-800"
                        title="Pilih file dokumen"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <span className="hidden group-hover:inline select-none">
                        Dukung PDF, Word, Excel, TXT, MD
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={docLoading || docExtractLoading || !docText.trim()}
                  className="w-full h-9 bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-md text-[12px] tracking-[-0.01em] transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  {docLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Meringkas...</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-2" />Mulai Ringkas</>
                  )}
                </Button>
              </form>

              {/* Result */}
              <AnimatePresence>
                {docResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 space-y-2"
                  >
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium block">Intisari Prosedur</span>
                    <div className="space-y-1 text-zinc-300">
                      {renderSummaryContent(docResult.summary)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

        {/* ── CTA BANNER ──────────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden"
          >
            {/* Decorative corner glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-500/[0.03] rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2 relative z-10 max-w-md">
              <h3 className="text-[18px] md:text-[20px] font-semibold text-zinc-100 tracking-[-0.03em]">
                Butuh bantuan spesifik?
              </h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed">
                Tanyakan persyaratan bansos, alur pelaporan ke KPAI, penanggulangan PMI,
                atau pelanggaran HAM langsung ke asisten AI kami.
              </p>
            </div>
            <Button
              onClick={handleStartChat}
              className="gap-2 bg-zinc-100 hover:bg-white text-zinc-900 text-[13px] font-medium px-6 h-11 rounded-md transition-all active:scale-[0.97] shrink-0 relative z-10"
            >
              Mulai Diskusi
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        </section>
      </main>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <Footer4Col />
    </div>
  )
}

export default HomePage

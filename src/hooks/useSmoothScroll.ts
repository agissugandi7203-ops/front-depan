import { useEffect } from 'react'

export function useSmoothScroll() {
  useEffect(() => {
    // Disable Lenis on touch/mobile devices — native scroll is smoother on iOS/Android
    // and Lenis + GSAP ticker overhead causes visible jank on low-end phones
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isTouchDevice || isReducedMotion) {
      // Native scroll on mobile is already smooth — no Lenis needed
      return
    }

    // Dynamic import: only loaded on desktop (no performance cost on mobile)
    let cleanup: (() => void) | null = null

    Promise.all([import('lenis'), import('gsap')]).then(([{ default: Lenis }, { gsap }]) => {
      const lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.9,
      })

      const update = (time: number) => {
        lenis.raf(time * 1000)
      }

      gsap.ticker.add(update)
      gsap.ticker.lagSmoothing(0)
      ;(window as any).lenis = lenis

      cleanup = () => {
        lenis.destroy()
        gsap.ticker.remove(update)
        delete (window as any).lenis
      }
    })

    return () => {
      cleanup?.()
    }
  }, [])
}

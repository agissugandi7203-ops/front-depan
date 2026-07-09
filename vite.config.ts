import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { compression } from 'vite-plugin-compression2'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    // Brotli compression (smaller than gzip, supported by modern browsers + CDN)
    compression({ algorithm: 'brotliCompress', exclude: [/\.(png|jpg|jpeg|gif|webp|avif|mp4|webm)$/] }),
    // Gzip as fallback for older servers/proxies
    compression({ algorithm: 'gzip', exclude: [/\.(png|jpg|jpeg|gif|webp|avif|mp4|webm)$/] }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    cssMinify: true,
    // Terser: more aggressive dead-code elimination & minification than esbuild
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,        // Strip all console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2,                 // Two compression passes for smaller output
        ecma: 2020,
        unsafe_arrows: true,
        unsafe_methods: true,
      },
      mangle: {
        safari10: false,
      },
      format: {
        comments: false,           // Strip all comments
      },
    },
    // Target modern browsers to reduce polyfill overhead
    target: ['es2020', 'chrome87', 'firefox78', 'safari14'],
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching & parallel loading
        manualChunks(id) {
          // Core React runtime — rarely changes, isolated for long-term caching
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react'
          }
          // Framer Motion — large, isolated
          if (id.includes('node_modules/framer-motion/') || id.includes('node_modules/motion/')) {
            return 'vendor-motion'
          }
          // Mermaid is very large (~2MB) — defer it completely
          if (id.includes('node_modules/mermaid/') || id.includes('node_modules/d3') || id.includes('node_modules/dagre')) {
            return 'vendor-mermaid'
          }
          // Supabase client
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase'
          }
          // Radix UI primitives
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix'
          }
          // State management
          if (id.includes('node_modules/zustand/') || id.includes('node_modules/@tanstack/')) {
            return 'vendor-state'
          }
          // Lucide icons — tree-shaken but still sizeable
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons'
          }
          // Form utilities
          if (id.includes('node_modules/react-hook-form/') || id.includes('node_modules/@hookform/') || id.includes('node_modules/zod/')) {
            return 'vendor-forms'
          }
          // HTTP
          if (id.includes('node_modules/axios/')) {
            return 'vendor-http'
          }
          // Markdown rendering
          if (id.includes('node_modules/react-markdown/') || id.includes('node_modules/remark') || id.includes('node_modules/rehype')) {
            return 'vendor-markdown'
          }
          // Lenis + GSAP smooth scroll — loaded in App, isolated
          if (id.includes('node_modules/lenis/') || id.includes('node_modules/gsap/')) {
            return 'vendor-scroll'
          }
        },
        // Clean, cache-friendly filenames
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop() ?? ''
          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'].includes(ext)) {
            return 'assets/img/[name]-[hash][extname]'
          }
          if (['mp4', 'webm', 'ogg'].includes(ext)) {
            return 'assets/video/[name]-[hash][extname]'
          }
          if (['woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
      // Treeshaking: remove unused exports aggressively
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
      },
    },
  },
  // Optimize deps pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'zustand',
      'lucide-react',
      'axios',
      'react-markdown',
      'remark-gfm',
    ],
    // Exclude mermaid & heavy scroll libs from pre-bundling (lazy loaded)
    exclude: ['mermaid', 'lenis', 'gsap'],
  },
})

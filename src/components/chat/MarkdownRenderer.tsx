import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { repairStreamingMarkdown } from '@/lib/streamingMarkdown'
import { cn } from '@/lib/utils'
import { MermaidDiagram } from '@/components/MermaidDiagram'

// Streaming cursor — identical style to ChatGPT's blinking block cursor
const StreamingCursor = () => (
  <span
    aria-hidden="true"
    className="inline-block w-[2px] h-[1.1em] bg-zinc-400 ml-0.5 align-middle rounded-[1px] animate-cursor-blink"
  />
)

// ── Custom component overrides ─────────────────────────────────────────────────
// These give us full control over how each markdown element looks, while
// keeping the semantic HTML structure react-markdown produces.

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  // ── Headings ──────────────────────────────────────────────────────────────
  h1: ({ children }) => (
    <h1 className="text-[17px] font-bold text-zinc-100 mt-7 mb-3 leading-tight tracking-tight first:mt-1">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15.5px] font-semibold text-zinc-100 mt-6 mb-2.5 leading-tight tracking-tight first:mt-1">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold text-zinc-200 mt-4 mb-2 leading-snug first:mt-1">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13.5px] font-semibold text-zinc-300 mt-3 mb-1.5 leading-snug first:mt-1">
      {children}
    </h4>
  ),

  // ── Paragraph ─────────────────────────────────────────────────────────────
  p: ({ children }) => (
    <p className="text-[14px] text-zinc-300 leading-[1.75] mb-3.5 last:mb-0 font-normal">
      {children}
    </p>
  ),

  // ── Lists ─────────────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul className="my-3 pl-5 space-y-1.5 list-none">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 pl-5 space-y-1.5 list-none counter-reset-[item]">
      {children}
    </ol>
  ),
  li: ({ children, ordered, ...props }: any) => {
    return (
      <li className="flex items-start gap-2.5 text-[14px] text-zinc-300 leading-[1.7]">
        {ordered ? (
          <span className="shrink-0 font-mono text-[12px] text-zinc-500 min-w-[18px] mt-[3px] text-right select-none">
            {(props.index ?? 0) + 1}.
          </span>
        ) : (
          <span className="shrink-0 text-indigo-400 mt-[6px] text-[8px] select-none">●</span>
        )}
        <span className="flex-1 min-w-0">{children}</span>
      </li>
    )
  },

  // ── Inline code ───────────────────────────────────────────────────────────
  code: ({ node, inline, className, children, ...props }: any) => {
    const isInline = inline || !className

    // Check if this is a mermaid block
    const language = (className || '').replace('language-', '')
    if (!isInline && language === 'mermaid') {
      return <MermaidDiagram chart={String(children)} />
    }

    if (isInline) {
      return (
        <code
          className="bg-zinc-800 text-emerald-400 rounded-md px-1.5 py-0.5 font-mono text-[12.5px] font-normal border border-zinc-700/60"
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <code className={cn('font-mono text-[12.5px] leading-[1.65]', className)} {...props}>
        {children}
      </code>
    )
  },

  // ── Code block (pre) ──────────────────────────────────────────────────────
  pre: ({ children, ...props }: any) => {
    // Extract language from child code element
    const codeChild = children?.props
    const lang = (codeChild?.className || '').replace('language-', '') || 'code'
    const codeText = String(codeChild?.children || '')

    const handleCopy = () => {
      navigator.clipboard.writeText(codeText).catch(() => {})
    }

    return (
      <div className="relative my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-sm">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
            {lang}
          </span>
          <button
            onClick={handleCopy}
            className="text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors duration-150 font-medium"
          >
            Salin
          </button>
        </div>
        <pre
          className="overflow-x-auto p-4 text-[13px] leading-[1.65] font-mono"
          {...props}
        >
          {children}
        </pre>
      </div>
    )
  },

  // ── Blockquote ────────────────────────────────────────────────────────────
  blockquote: ({ children }) => (
    <blockquote className="my-4 pl-4 border-l-2 border-indigo-500/60 italic text-zinc-400 text-[13.5px] leading-relaxed">
      {children}
    </blockquote>
  ),

  // ── Horizontal rule ───────────────────────────────────────────────────────
  hr: () => <hr className="my-5 border-t border-zinc-800" />,

  // ── Links ─────────────────────────────────────────────────────────────────
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/40 hover:decoration-indigo-400 transition-colors duration-150"
    >
      {children}
    </a>
  ),

  // ── Strong / Em ───────────────────────────────────────────────────────────
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-zinc-300">{children}</em>
  ),

  // ── Strikethrough (GFM) ───────────────────────────────────────────────────
  del: ({ children }) => (
    <del className="line-through text-zinc-500">{children}</del>
  ),

  // ── Table (GFM) ───────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-[13px] text-zinc-300">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-900 border-b border-zinc-800">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-zinc-800/60">{children}</tbody>,
  tr: ({ children }) => (
    <tr className="hover:bg-zinc-900/40 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-[11.5px] font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-zinc-300 leading-relaxed">{children}</td>
  ),

  // ── Task list items (GFM checkboxes) ─────────────────────────────────────
  input: ({ type, checked, ...props }: any) => {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-2 accent-indigo-500 rounded-sm pointer-events-none"
          {...props}
        />
      )
    }
    return <input type={type} {...props} />
  },
}

// ── Main MarkdownRenderer Component ───────────────────────────────────────────

interface MarkdownRendererProps {
  content: string
  isStreaming?: boolean
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  isStreaming = false,
}: MarkdownRendererProps) {
  // Repair incomplete tokens during streaming to prevent raw syntax from leaking
  const safeContent = useMemo(
    () => (isStreaming ? repairStreamingMarkdown(content) : content),
    [content, isStreaming]
  )

  return (
    <div className="ai-markdown-response min-w-0 w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={mdComponents}
      >
        {safeContent}
      </ReactMarkdown>
      {isStreaming && <StreamingCursor />}
    </div>
  )
})

MarkdownRenderer.displayName = 'MarkdownRenderer'

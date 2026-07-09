/**
 * streamingMarkdown.ts
 *
 * Repairs incomplete markdown tokens during AI streaming so the renderer
 * never sees dangling `**`, unclosed code fences, or partial links.
 *
 * Strategy (same as Streamdown / Claude frontend):
 *  1. Detect open bold/italic markers and close them temporarily
 *  2. Detect unclosed code fences and close them
 *  3. Detect incomplete inline code and close it
 *  4. Detect partial links [text]( and strip them until complete
 */

export function repairStreamingMarkdown(text: string): string {
  if (!text) return text

  let result = text

  // ── 1. Handle unclosed code fences (``` or ~~~) ─────────────────────────────
  // Count opening fences — if odd, close the last one
  const fenceMatches = result.match(/^(`{3,}|~{3,})/gm) || []
  if (fenceMatches.length % 2 !== 0) {
    result = result + '\n```'
  }

  // ── 2. Handle unclosed inline code (`code`) ──────────────────────────────────
  // Outside of code blocks, count backtick pairs
  const inlineCodeCount = (result.match(/(?<!`)`(?!`)/g) || []).length
  if (inlineCodeCount % 2 !== 0) {
    result = result + '`'
  }

  // ── 3. Handle unclosed bold (**text) ─────────────────────────────────────────
  const boldCount = (result.match(/\*\*/g) || []).length
  if (boldCount % 2 !== 0) {
    result = result + '**'
  }

  // ── 4. Handle unclosed italic (*text, but not part of **) ────────────────────
  const withoutBold = result.replace(/\*\*/g, '')
  const italicCount = (withoutBold.match(/\*/g) || []).length
  if (italicCount % 2 !== 0) {
    result = result + '*'
  }

  // ── 5. Strip dangling partial links [text]( without closing ) ────────────────
  result = result.replace(/\[([^\]]*)\]\([^)]*$/g, '$1')

  // ── 6. Strip dangling partial link labels [ without ] ────────────────────────
  result = result.replace(/\[([^\][]*)$/g, '$1')

  return result
}

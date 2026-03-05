/**
 * Strip markdown syntax from raw text, returning plain prose.
 * Order matters: frontmatter and code blocks must be removed first
 * before inline patterns are applied.
 */
export function stripMarkdown(raw: string): string {
  let text = raw;

  // 1. YAML frontmatter
  text = text.replace(/^---[\s\S]*?---\n?/, '');

  // 2. Fenced code blocks (``` and ~~~)
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/~~~[\s\S]*?~~~/g, '');

  // 3. Inline code
  text = text.replace(/`[^`]*`/g, '');

  // 4. Obsidian image embeds — strip entirely (no useful text)
  text = text.replace(/!\[\[([^\]]*)\]\]/g, '');

  // 5. Standard markdown images — strip entirely
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');

  // 6. Wikilinks — keep display text: [[link|display]] → display, [[link]] → link
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');

  // 7. Markdown hyperlinks — keep display text
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // 8. HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 9. Bold / italic / strikethrough (order: longest markers first)
  text = text.replace(/(\*{3}|_{3})(.*?)\1/gs, '$2');
  text = text.replace(/(\*{2}|_{2})(.*?)\1/gs, '$2');
  text = text.replace(/(\*|_)(.*?)\1/gs, '$2');
  text = text.replace(/~~(.*?)~~/gs, '$1');

  // 10. Heading markers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 11. Blockquote markers
  text = text.replace(/^>\s?/gm, '');

  // 12. Horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');

  // 13. List markers (unordered and ordered)
  text = text.replace(/^[\t ]*[-*+]\s+/gm, '');
  text = text.replace(/^[\t ]*\d+\.\s+/gm, '');

  // 14. Collapse excess blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

export function countWords(raw: string): number {
  const text = stripMarkdown(raw).trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function countCharacters(raw: string): number {
  const text = stripMarkdown(raw);
  return (text.match(/\S/g) ?? []).length;
}

export function countSentences(raw: string): number {
  const text = stripMarkdown(raw);
  const matches = text.match(/[.!?]+(?:\s|$)/g);
  return matches ? matches.length : 0;
}

export function countParagraphs(raw: string): number {
  const text = stripMarkdown(raw);
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
}

export function estimatePages(words: number, wordsPerPage: number): number {
  if (words === 0 || wordsPerPage <= 0) return 0;
  return Math.ceil(words / wordsPerPage);
}

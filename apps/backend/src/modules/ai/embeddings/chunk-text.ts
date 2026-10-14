/**
 * Splits a document into chunks of at most `maxTokens` tokens for embedding
 * (spec §5.2). Paragraphs are kept together where possible; oversized
 * paragraphs are split into sentences, and oversized sentences into words.
 */
export function chunkText(
  text: string,
  countTokens: (text: string) => number,
  maxTokens: number,
): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const pieces = paragraphs.flatMap((paragraph) =>
    countTokens(paragraph) <= maxTokens
      ? [paragraph]
      : paragraph
          .split(/(?<=[.!?])\s+/)
          .flatMap((sentence) =>
            countTokens(sentence) <= maxTokens ? [sentence] : sentence.split(' '),
          ),
  );

  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    const candidate = current ? `${current} ${piece}` : piece;
    if (countTokens(candidate) <= maxTokens) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

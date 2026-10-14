import { chunkText } from './chunk-text.js';

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;
const words = (n: number, word = 'word') => Array.from({ length: n }, () => word).join(' ');

describe('chunkText', () => {
  it('returns no chunks for empty or whitespace-only input', () => {
    expect(chunkText('', countWords, 10)).toEqual([]);
    expect(chunkText(' \n\n  \n', countWords, 10)).toEqual([]);
  });

  it('keeps a short document in one chunk and collapses whitespace', () => {
    expect(chunkText('Hello   world.\n\nSecond  paragraph.', countWords, 10)).toEqual([
      'Hello world. Second paragraph.',
    ]);
  });

  it('packs whole paragraphs without exceeding the limit', () => {
    const text = [words(4, 'a'), words(4, 'b'), words(4, 'c')].join('\n\n');

    const chunks = chunkText(text, countWords, 8);

    expect(chunks).toEqual([`${words(4, 'a')} ${words(4, 'b')}`, words(4, 'c')]);
  });

  it('splits an oversized paragraph into sentences, and an oversized sentence into words', () => {
    const paragraph = `${words(3, 'short')}. ${words(12, 'long')}.`;

    const chunks = chunkText(paragraph, countWords, 5);

    for (const chunk of chunks) {
      expect(countWords(chunk)).toBeLessThanOrEqual(5);
    }
    expect(chunks.join(' ').split(' ')).toHaveLength(15);
  });
});

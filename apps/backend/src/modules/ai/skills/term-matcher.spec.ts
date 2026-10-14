import { containsTerm, findFirstTerm, normalizeForMatching } from './term-matcher.js';

describe('term matcher', () => {
  const text = normalizeForMatching(
    'Built SPAs in JavaScript and React.js. Backend: Node.js,\nExpress  and C++ tooling; some C#.',
  );

  it.each([
    ['javascript', true],
    ['React.js', true],
    ['node.js', true],
    ['C++', true],
    ['C#', true],
    ['express', true],
    ['Express and C++', true], // multi-word terms tolerate collapsed whitespace
  ])('finds "%s"', (term, expected) => {
    expect(containsTerm(text, term)).toBe(expected);
  });

  it.each([
    ['React', 'React.js'],
    ['Node', 'Node.js'],
  ])('matches "%s" in "%s" because "." ends a term', (term) => {
    expect(containsTerm(text, term)).toBe(true);
  });

  it.each([
    ['Java', 'inside "JavaScript"'],
    ['C', 'inside "C++" or "C#"'],
    ['Script', 'inside "JavaScript"'],
    ['JS', 'inside "React.js" or "Node.js"'],
    ['Angular', 'when absent'],
  ])('does not match "%s" %s', (term) => {
    expect(containsTerm(text, term)).toBe(false);
  });

  it('treats regex special characters literally', () => {
    expect(containsTerm(normalizeForMatching('Experience with .NET and ASP.NET'), '.NET')).toBe(
      true,
    );
    expect(containsTerm(normalizeForMatching('networking'), '.NET')).toBe(false);
  });

  it('never matches an empty term', () => {
    expect(containsTerm(text, '  ')).toBe(false);
  });

  it('returns the first matching term', () => {
    expect(findFirstTerm(text, ['Vue', 'ReactJS', 'React.js', 'React'])).toBe('React.js');
    expect(findFirstTerm(text, ['Angular'])).toBeUndefined();
  });
});

import { isMentionedIn } from './skill-grounding.js';
import { normalizeForMatching } from './term-matcher.js';

describe('isMentionedIn', () => {
  const jd = normalizeForMatching(
    'Build UIs with ReactJS and Node.js services. Run A/B test analysis and basic forecasting. ' +
      'Manage Helm charts on Google Cloud (GKE).',
  );

  it.each([
    ['Node.js', 'exact name'],
    ['React', 'a dictionary alias of the skill (ReactJS)'],
    ['A/B Testing', 'every word, with a different ending'],
    ['Basic Forecasting', 'every word'],
    ['Helm charts', 'every word'],
    ['GKE', 'an abbreviation that appears in the text'],
  ])('accepts %s (%s)', (skill) => {
    expect(isMentionedIn(jd, skill)).toBe(true);
  });

  it.each([
    ['Agile', 'not in the text'],
    ['Financial modelling', 'no word in the text'],
    ['Google Kubernetes Engine', 'only some words in the text'],
    ['JS', 'only inside "Node.js"'],
    ['', 'blank'],
  ])('rejects %s (%s)', (skill) => {
    expect(isMentionedIn(jd, skill)).toBe(false);
  });
});

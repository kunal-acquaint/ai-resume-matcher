export interface SkillDefinition {
  name: string;
  aliases: readonly string[];
}

/**
 * Common technical skills and their alternative spellings (spec §5.5). Used to
 * enrich AI-extracted skills with aliases and by the stand-in skill extractor.
 * Aliases are chosen to avoid ordinary English words ("rest", "spring", "go").
 */
export const SKILLS_DICTIONARY: readonly SkillDefinition[] = [
  // Languages
  { name: 'JavaScript', aliases: ['JS', 'ECMAScript', 'ES6'] },
  { name: 'TypeScript', aliases: ['TS'] },
  { name: 'Java', aliases: [] },
  { name: 'Kotlin', aliases: [] },
  { name: 'Python', aliases: [] },
  { name: 'Golang', aliases: [] },
  { name: 'C#', aliases: ['CSharp'] },
  { name: 'C++', aliases: ['CPP'] },
  { name: 'PHP', aliases: [] },
  { name: 'Ruby', aliases: [] },
  { name: 'SQL', aliases: [] },
  { name: 'HTML', aliases: ['HTML5'] },
  { name: 'CSS', aliases: ['CSS3'] },
  // Frontend
  { name: 'React', aliases: ['React.js', 'ReactJS'] },
  { name: 'Next.js', aliases: ['NextJS'] },
  { name: 'Angular', aliases: ['AngularJS'] },
  { name: 'Vue.js', aliases: ['Vue', 'VueJS'] },
  { name: 'Redux', aliases: ['Redux Toolkit'] },
  { name: 'React Query', aliases: ['TanStack Query'] },
  { name: 'Tailwind CSS', aliases: ['Tailwind', 'TailwindCSS'] },
  { name: 'Webpack', aliases: [] },
  { name: 'Vite', aliases: [] },
  // Backend
  { name: 'Node.js', aliases: ['NodeJS', 'Node'] },
  { name: 'Express', aliases: ['Express.js', 'ExpressJS'] },
  { name: 'NestJS', aliases: ['Nest.js'] },
  { name: 'Spring Boot', aliases: ['Spring Framework'] },
  { name: 'Django', aliases: [] },
  { name: 'Flask', aliases: [] },
  { name: '.NET', aliases: ['dotnet', 'ASP.NET'] },
  { name: 'Ruby on Rails', aliases: ['Rails'] },
  { name: 'REST APIs', aliases: ['REST API', 'RESTful'] },
  { name: 'GraphQL', aliases: [] },
  { name: 'Microservices', aliases: ['Microservice'] },
  { name: 'JWT', aliases: ['JSON Web Token'] },
  { name: 'OAuth', aliases: ['OAuth2'] },
  { name: 'Socket.io', aliases: ['WebSockets', 'WebSocket'] },
  // Data
  { name: 'MongoDB', aliases: ['Mongo'] },
  { name: 'Mongoose', aliases: [] },
  { name: 'PostgreSQL', aliases: ['Postgres'] },
  { name: 'MySQL', aliases: [] },
  { name: 'Redis', aliases: [] },
  { name: 'Elasticsearch', aliases: [] },
  { name: 'Kafka', aliases: ['Apache Kafka'] },
  { name: 'RabbitMQ', aliases: [] },
  { name: 'Firebase', aliases: [] },
  // DevOps & cloud
  { name: 'Docker', aliases: [] },
  { name: 'Kubernetes', aliases: ['K8s'] },
  { name: 'AWS', aliases: ['Amazon Web Services'] },
  { name: 'Azure', aliases: ['Microsoft Azure'] },
  { name: 'GCP', aliases: ['Google Cloud'] },
  { name: 'Terraform', aliases: [] },
  { name: 'Ansible', aliases: [] },
  {
    name: 'CI/CD',
    aliases: ['Continuous Integration', 'Continuous Delivery', 'Continuous Deployment'],
  },
  { name: 'GitHub Actions', aliases: [] },
  { name: 'Jenkins', aliases: [] },
  { name: 'Git', aliases: [] },
  { name: 'Linux', aliases: [] },
  { name: 'Prometheus', aliases: [] },
  { name: 'Grafana', aliases: [] },
  // Testing
  { name: 'Jest', aliases: [] },
  { name: 'Vitest', aliases: [] },
  { name: 'React Testing Library', aliases: ['RTL', 'Testing Library'] },
  { name: 'Cypress', aliases: [] },
  { name: 'Playwright', aliases: [] },
  { name: 'Mocha', aliases: [] },
  { name: 'JUnit', aliases: [] },
  // Data & analytics
  { name: 'Machine Learning', aliases: ['ML'] },
  { name: 'TensorFlow', aliases: [] },
  { name: 'PyTorch', aliases: [] },
  { name: 'Pandas', aliases: [] },
  { name: 'Power BI', aliases: ['PowerBI'] },
  { name: 'Tableau', aliases: [] },
  { name: 'Excel', aliases: ['Microsoft Excel'] },
  // Practices & tools
  { name: 'Agile', aliases: ['Scrum'] },
  { name: 'Figma', aliases: [] },
];

const byTerm = new Map<string, SkillDefinition>(
  SKILLS_DICTIONARY.flatMap((skill) =>
    [skill.name, ...skill.aliases].map((term) => [term.toLowerCase(), skill] as const),
  ),
);

/** Finds a dictionary entry by its name or any alias (case-insensitive). */
export function lookupSkill(term: string): SkillDefinition | undefined {
  return byTerm.get(term.trim().toLowerCase());
}

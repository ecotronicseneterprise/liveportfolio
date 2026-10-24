// Turning GitHub languages + topics into a short, human skills list.
// Whitelist approach: a topic or language becomes a skill only if it is in ALIASES. Everything else
// (gdpr-compliant, career-tech, cloud, deployment, config, …) is dropped, as are typos we cannot map.

/** canonical skill name, and how much one repo "vote" for it is worth (1 = full). */
interface Alias { name: string; w?: number }
const A = (name: string, w = 1): Alias => ({ name, w })

// keys are lower-case; spaces/underscores/hyphens are normalised to '-' before lookup
export const ALIASES: Record<string, Alias> = {
  // languages (GitHub "language" values)
  python: A('Python'), 'jupyter-notebook': A('Python', 0.8), typescript: A('TypeScript'), javascript: A('JavaScript'),
  java: A('Java'), go: A('Go'), rust: A('Rust'), 'c++': A('C++'), c: A('C'), 'c#': A('C#'), php: A('PHP'), ruby: A('Ruby'),
  swift: A('Swift'), kotlin: A('Kotlin'), dart: A('Dart'), r: A('R'), sql: A('SQL'), tsql: A('SQL', 0.8), plpgsql: A('PostgreSQL', 0.8),
  shell: A('Shell scripting', 0.4), dockerfile: A('Docker', 0.6), hcl: A('Terraform', 0.6),
  html: A('HTML', 0.3), css: A('CSS', 0.3), scss: A('CSS', 0.3), vue: A('Vue.js'),
  // web / backend
  react: A('React'), 'next-js': A('Next.js'), nextjs: A('Next.js'), 'node-js': A('Node.js'), nodejs: A('Node.js'), express: A('Express'),
  django: A('Django'), flask: A('Flask'), fastapi: A('FastAPI'), streamlit: A('Streamlit'), flutter: A('Flutter'), tailwindcss: A('Tailwind CSS'),
  graphql: A('GraphQL'), 'rest-api': A('REST APIs', 0.6), api: A('REST APIs', 0.4),
  // data / ML / AI
  'machine-learning': A('Machine Learning'), 'deep-learning': A('Deep Learning'), 'data-science': A('Data Science'),
  'artificial-intelligence': A('AI'), ai: A('AI'), nlp: A('NLP'), llm: A('LLMs'), llms: A('LLMs'), rag: A('RAG'), openai: A('OpenAI'),
  langchain: A('LangChain'), huggingface: A('Hugging Face'), 'computer-vision': A('Computer Vision'), 'generative-ai': A('Generative AI'),
  pandas: A('Pandas'), 'pandas-dataframe': A('Pandas', 0.8), numpy: A('NumPy'), 'scikit-learn': A('scikit-learn'), sklearn: A('scikit-learn'),
  tensorflow: A('TensorFlow'), pytorch: A('PyTorch'), keras: A('Keras'), opencv: A('OpenCV'), matplotlib: A('Matplotlib', 0.7), plotly: A('Plotly', 0.7),
  'power-bi': A('Power BI'), powerbi: A('Power BI'), tableau: A('Tableau'), spark: A('Spark'), airflow: A('Airflow'), dbt: A('dbt'),
  'data-engineering': A('Data Engineering'), 'data-pipeline': A('Data Pipelines'), 'sentiment-analysis': A('Sentiment Analysis', 0.6),
  'time-series': A('Time Series'), 'predictive-modeling': A('Predictive Modeling', 0.7), 'semantic-search-engine': A('Semantic Search', 0.7),
  'information-retrieval': A('Information Retrieval', 0.7), 'decision-trees': A('Decision Trees', 0.5), 'kmeans-clustering': A('Clustering', 0.5),
  // cloud / devops
  azure: A('Azure'), aws: A('AWS'), gcp: A('Google Cloud'), docker: A('Docker'), kubernetes: A('Kubernetes'), terraform: A('Terraform'),
  'github-actions': A('GitHub Actions'), linux: A('Linux'), git: A('Git', 0.5), 'ci-cd': A('CI/CD'),
  // databases
  postgresql: A('PostgreSQL'), postgres: A('PostgreSQL'), mysql: A('MySQL'), mongodb: A('MongoDB'), redis: A('Redis'), supabase: A('Supabase'), firebase: A('Firebase'),
  // embedded / hardware / security
  arduino: A('Arduino'), 'raspberry-pi': A('Raspberry Pi'), 'embedded-systems': A('Embedded Systems'), robotics: A('Robotics'), iot: A('IoT'),
  automation: A('Automation', 0.6), cybersecurity: A('Cybersecurity'), 'autonomous-navigation': A('Autonomous Navigation', 0.5),
  // typos seen in real accounts (renewab → dropped on purpose: not a skill)
  opeanai: A('OpenAI'), tensroflow: A('TensorFlow'), mathplotlib: A('Matplotlib', 0.7), pyhton: A('Python'),
}

export function lookup(token: string): Alias | null {
  const k = token.toLowerCase().trim().replace(/[\s_]+/g, '-')
  return ALIASES[k] ?? null
}

export const SKILL_CAP = 12

interface RepoLike { language: string | null; topics?: string[]; selected: boolean }

/**
 * Weighted vote across repos: a selected repo counts fully, the other candidates a quarter.
 * Score = sum(vote weight × alias weight); one repo votes at most once per canonical skill.
 */
export function aggregateSkills(repos: RepoLike[], cap = SKILL_CAP): string[] {
  const score = new Map<string, number>()
  for (const r of repos) {
    const repoWeight = r.selected ? 1 : 0.25
    const seen = new Map<string, number>()
    for (const tok of [...(r.language ? [r.language] : []), ...(r.topics ?? [])]) {
      const a = lookup(tok)
      if (!a) continue
      seen.set(a.name, Math.max(seen.get(a.name) ?? 0, a.w ?? 1))
    }
    for (const [name, w] of seen) score.set(name, (score.get(name) ?? 0) + repoWeight * w)
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, cap)
    .map(([name]) => name)
}

/** Tech stack for one project: aliased language first, then known topics by alias weight, ≤ 6, no duplicates. */
export function projectStack(language: string | null, topics: string[] = []): string[] {
  const out = new Map<string, number>()
  const add = (tok: string, bonus = 0) => {
    const a = lookup(tok)
    if (a && !out.has(a.name)) out.set(a.name, (a.w ?? 1) + bonus)
  }
  if (language) add(language, 1)
  for (const t of topics) add(t)
  return [...out.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n)
}

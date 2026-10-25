/**
 * Curated Tech Brand Icons and Logos Catalog
 * Single source of truth shared between client canvas rendering, media search, and API controllers.
 */

export interface TechIconItem {
  name: string;
  title: string;
  url: string;
  category: string;
  aliases?: string[];
}

export const TECH_ICONS_LIST: TechIconItem[] = [
  { name: 'docker', title: 'Docker', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/docker.svg', category: 'DevOps & Containers' },
  { name: 'kubernetes', title: 'Kubernetes', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/kubernetes.svg', category: 'DevOps & Containers', aliases: ['k8s'] },
  { name: 'redis', title: 'Redis', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/redis.svg', category: 'Databases & Caching' },
  { name: 'postgresql', title: 'PostgreSQL', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/postgresql.svg', category: 'Databases & Caching', aliases: ['postgres'] },
  { name: 'mysql', title: 'MySQL', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/mysql.svg', category: 'Databases & Caching' },
  { name: 'mongodb', title: 'MongoDB', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/mongodb.svg', category: 'Databases & Caching' },
  { name: 'clickhouse', title: 'ClickHouse', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/clickhouse.svg', category: 'Databases & Analytics' },
  { name: 'apachekafka', title: 'Apache Kafka', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/apachekafka.svg', category: 'Distributed Systems', aliases: ['kafka'] },
  { name: 'fastapi', title: 'FastAPI', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/fastapi.svg', category: 'Backend & APIs' },
  { name: 'python', title: 'Python', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/python.svg', category: 'Languages' },
  { name: 'go', title: 'Go (Golang)', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/go.svg', category: 'Languages', aliases: ['golang'] },
  { name: 'rust', title: 'Rust', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/rust.svg', category: 'Languages' },
  { name: 'typescript', title: 'TypeScript', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/typescript.svg', category: 'Languages' },
  { name: 'javascript', title: 'JavaScript', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/javascript.svg', category: 'Languages' },
  { name: 'linux', title: 'Linux', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/linux.svg', category: 'Operating Systems' },
  { name: 'ubuntu', title: 'Ubuntu', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/ubuntu.svg', category: 'Operating Systems' },
  { name: 'git', title: 'Git', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/git.svg', category: 'VCS & Tooling' },
  { name: 'github', title: 'GitHub', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/github.svg', category: 'VCS & Tooling' },
  { name: 'gitlab', title: 'GitLab', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/gitlab.svg', category: 'VCS & Tooling' },
  { name: 'amazonwebservices', title: 'AWS', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/amazonwebservices.svg', category: 'Cloud Infrastructure', aliases: ['aws'] },
  { name: 'googlecloud', title: 'Google Cloud', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/googlecloud.svg', category: 'Cloud Infrastructure' },
  { name: 'microsoftazure', title: 'Microsoft Azure', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/microsoftazure.svg', category: 'Cloud Infrastructure', aliases: ['azure'] },
  { name: 'cloudflare', title: 'Cloudflare', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/cloudflare.svg', category: 'Cloud & Networking' },
  { name: 'nginx', title: 'Nginx', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/nginx.svg', category: 'Networking' },
  { name: 'graphql', title: 'GraphQL', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/graphql.svg', category: 'Backend & APIs' },
  { name: 'terraform', title: 'Terraform', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/terraform.svg', category: 'DevOps & IaC' },
  { name: 'ansible', title: 'Ansible', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/ansible.svg', category: 'DevOps & IaC' },
  { name: 'prometheus', title: 'Prometheus', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/prometheus.svg', category: 'Observability' },
  { name: 'grafana', title: 'Grafana', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/grafana.svg', category: 'Observability' },
  { name: 'anthropic', title: 'Anthropic', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/anthropic.svg', category: 'AI Research' },
  { name: 'openai', title: 'OpenAI', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/openai.svg', category: 'AI Research' },
  { name: 'react', title: 'React', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/react.svg', category: 'Frontend' },
  { name: 'nodejs', title: 'Node.js', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/nodedotjs.svg', category: 'Backend' },
  { name: 'cplusplus', title: 'C++', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/cplusplus.svg', category: 'Languages' },
  { name: 'sqlite', title: 'SQLite', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/sqlite.svg', category: 'Databases' },
  { name: 'supabase', title: 'Supabase', url: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/supabase.svg', category: 'Backend & DB' },
];

/**
 * Direct lookup map from tech brand name or alias to CDN SVG URL.
 */
export const KNOWN_TECH_LOGOS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const item of TECH_ICONS_LIST) {
    map[item.name.toLowerCase()] = item.url;
    if (item.aliases) {
      for (const alias of item.aliases) {
        map[alias.toLowerCase()] = item.url;
      }
    }
  }
  return map;
})();

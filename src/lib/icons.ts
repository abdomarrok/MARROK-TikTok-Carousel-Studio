export interface IconDefinition {
  name: string;
  label: string;
  paths?: string[];
  isCustom?: boolean;
  dataUrl?: string;
}

export const ICONS_REGISTRY: Record<string, { label: string; svgInner: string }> = {
  gitMerge: {
    label: 'Git Merge',
    svgInner: `
      <circle cx="18" cy="18" r="6" />
      <circle cx="18" cy="46" r="6" />
      <circle cx="46" cy="28" r="6" />
      <path d="M18 24v16" />
      <path d="M18 36c4 0 16 0 24-4" />
    `,
  },
  shieldAlert: {
    label: 'Shield Alert',
    svgInner: `
      <path d="M32 8s16 4 20 8v16c0 14-20 24-20 24S12 46 12 32V16c4-4 20-8 20-8z" />
      <line x1="32" y1="22" x2="32" y2="34" />
      <circle cx="32" cy="42" r="2.5" fill="currentColor" />
    `,
  },
  binary: {
    label: 'Binary Code',
    svgInner: `
      <rect x="14" y="14" width="14" height="20" rx="6" />
      <line x1="42" y1="14" x2="42" y2="34" />
      <line x1="36" y1="18" x2="42" y2="14" />
      <rect x="36" y="30" width="14" height="20" rx="6" />
      <line x1="20" y1="36" x2="20" y2="52" />
    `,
  },
  codeFile: {
    label: 'Code File',
    svgInner: `
      <path d="M38 8H16a4 4 0 0 0-4 4v40a4 4 0 0 0 4 4h32a4 4 0 0 0 4-4V22z" />
      <polyline points="38 8 38 22 52 22" />
      <polyline points="24 38 18 43 24 48" />
      <polyline points="34 38 40 43 34 48" />
    `,
  },
  search: {
    label: 'Search',
    svgInner: `
      <circle cx="28" cy="28" r="16" />
      <line x1="40" y1="40" x2="52" y2="52" />
    `,
  },
  database: {
    label: 'Database',
    svgInner: `
      <ellipse cx="32" cy="18" rx="20" ry="8" />
      <path d="M12 18v14c0 4.4 9 8 20 8s20-3.6 20-8V18" />
      <path d="M12 32v14c0 4.4 9 8 20 8s20-3.6 20-8V32" />
    `,
  },
  server: {
    label: 'Server Rack',
    svgInner: `
      <rect x="12" y="12" width="40" height="16" rx="4" />
      <rect x="12" y="36" width="40" height="16" rx="4" />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
      <circle cx="20" cy="44" r="2.5" fill="currentColor" />
      <line x1="28" y1="20" x2="44" y2="20" />
      <line x1="28" y1="44" x2="44" y2="44" />
    `,
  },
  funnel: {
    label: 'Funnel / Filter',
    svgInner: `
      <polygon points="10 14 54 14 38 34 38 50 26 54 26 34 10 14" />
    `,
  },
  alerts: {
    label: 'Alerts',
    svgInner: `
      <path d="M32 10L10 48h44L32 10z" />
      <line x1="32" y1="24" x2="32" y2="34" />
      <circle cx="32" cy="42" r="2.5" fill="currentColor" />
    `,
  },
  lifecycle: {
    label: 'Lifecycle / Loop',
    svgInner: `
      <path d="M48 24A18 18 0 1 0 50 36" />
      <polyline points="40 14 50 24 50 14" />
    `,
  },
  eyeRisk: {
    label: 'Eye / Risk',
    svgInner: `
      <path d="M8 32s9-16 24-16 24 16 24 16-9 16-24 16-24-16-24-16z" />
      <circle cx="32" cy="32" r="7" />
    `,
  },
  gauge: {
    label: 'Gauge / Speed',
    svgInner: `
      <path d="M12 40a22 22 0 1 1 40 0" />
      <line x1="32" y1="38" x2="44" y2="26" />
      <circle cx="32" cy="38" r="4" fill="currentColor" />
    `,
  },
  lightbulb: {
    label: 'Lightbulb / Lesson',
    svgInner: `
      <path d="M22 36c-4-4-6-9-6-15a16 16 0 1 1 32 0c0 6-2 11-6 15" />
      <path d="M24 44h16" />
      <path d="M26 50h12" />
      <line x1="32" y1="26" x2="32" y2="36" />
    `,
  },
  cpu: {
    label: 'CPU / Microchip',
    svgInner: `
      <rect x="18" y="18" width="28" height="28" rx="6" />
      <rect x="25" y="25" width="14" height="14" rx="2" />
      <line x1="24" y1="8" x2="24" y2="18" />
      <line x1="32" y1="8" x2="32" y2="18" />
      <line x1="40" y1="8" x2="40" y2="18" />
      <line x1="24" y1="46" x2="24" y2="56" />
      <line x1="32" y1="46" x2="32" y2="56" />
      <line x1="40" y1="46" x2="40" y2="56" />
      <line x1="8" y1="24" x2="18" y2="24" />
      <line x1="8" y1="32" x2="18" y2="32" />
      <line x1="8" y1="40" x2="18" y2="40" />
      <line x1="46" y1="24" x2="56" y2="24" />
      <line x1="46" y1="32" x2="56" y2="32" />
      <line x1="46" y1="40" x2="56" y2="40" />
    `,
  },
  clock: {
    label: 'Clock / Timer',
    svgInner: `
      <circle cx="32" cy="32" r="22" />
      <polyline points="32 18 32 32 42 32" />
    `,
  },
  scales: {
    label: 'Scales of Justice / Trade-off',
    svgInner: `
      <line x1="32" y1="12" x2="32" y2="52" />
      <line x1="16" y1="20" x2="48" y2="20" />
      <path d="M12 36l4-16 4 16c0 3-3.6 5-8 5s-8-2-8-5z" />
      <path d="M44 36l4-16 4 16c0 3-3.6 5-8 5s-8-2-8-5z" />
      <line x1="22" y1="52" x2="42" y2="52" />
    `,
  },
  robot: {
    label: 'AI Robot Agent',
    svgInner: `
      <rect x="14" y="20" width="36" height="30" rx="8" />
      <line x1="32" y1="10" x2="32" y2="20" />
      <circle cx="32" cy="9" r="3" fill="currentColor" />
      <circle cx="24" cy="32" r="3" fill="currentColor" />
      <circle cx="40" cy="32" r="3" fill="currentColor" />
      <line x1="24" y1="42" x2="40" y2="42" />
      <line x1="8" y1="35" x2="14" y2="35" />
      <line x1="50" y1="35" x2="56" y2="35" />
    `,
  },
  calculator: {
    label: 'Calculator',
    svgInner: `
      <rect x="14" y="10" width="36" height="44" rx="6" />
      <rect x="20" y="16" width="24" height="10" rx="2" />
      <circle cx="22" cy="34" r="2.5" fill="currentColor" />
      <circle cx="32" cy="34" r="2.5" fill="currentColor" />
      <circle cx="42" cy="34" r="2.5" fill="currentColor" />
      <circle cx="22" cy="44" r="2.5" fill="currentColor" />
      <circle cx="32" cy="44" r="2.5" fill="currentColor" />
      <circle cx="42" cy="44" r="2.5" fill="currentColor" />
    `,
  },
  gradCap: {
    label: 'Graduation Cap',
    svgInner: `
      <polygon points="32 12 56 24 32 36 8 24 32 12" />
      <path d="M16 28v14c0 6 7.2 10 16 10s16-4 16-10V28" />
      <line x1="56" y1="24" x2="56" y2="44" />
      <circle cx="56" cy="45" r="2" fill="currentColor" />
    `,
  },
  brain: {
    label: 'Brain / Intelligence',
    svgInner: `
      <path d="M26 16a8 8 0 0 0-14 8 8 8 0 0 0-2 6 8 8 0 0 0 4 7 8 8 0 0 0 0 7 8 8 0 0 0 8 4h4" />
      <path d="M38 16a8 8 0 0 1 14 8 8 8 0 0 1 2 6 8 8 0 0 1-4 7 8 8 0 0 1 0 7 8 8 0 0 1-8 4h-4" />
      <path d="M32 14v34" />
    `,
  },
  changesets: {
    label: 'Changesets',
    svgInner: `
      <line x1="12" y1="32" x2="52" y2="32" />
      <circle cx="32" cy="32" r="7" />
    `,
  },
  users: {
    label: 'Users / Team',
    svgInner: `
      <circle cx="32" cy="22" r="7" />
      <path d="M18 46c0-6.6 6.3-12 14-12s14 5.4 14 12" />
    `,
  },
  terminal: {
    label: 'Terminal',
    svgInner: `
      <rect x="10" y="12" width="44" height="40" rx="6" />
      <polyline points="18 24 26 32 18 40" />
      <line x1="30" y1="40" x2="42" y2="40" />
    `,
  },
  lock: {
    label: 'Security Lock',
    svgInner: `
      <rect x="14" y="26" width="36" height="28" rx="6" />
      <path d="M22 26V18a10 10 0 0 1 20 0v8" />
      <circle cx="32" cy="40" r="3" fill="currentColor" />
    `,
  },
  zap: {
    label: 'Speed / Latency / Zap',
    svgInner: `
      <polygon points="36 6 16 36 32 36 28 58 48 28 32 28 36 6" />
    `,
  },
  layers: {
    label: 'Architecture Layers',
    svgInner: `
      <polygon points="32 10 54 22 32 34 10 22 32 10" />
      <polyline points="10 32 32 44 54 32" />
      <polyline points="10 42 32 54 54 42" />
    `,
  },
  cloud: {
    label: 'Cloud Native / AWS',
    svgInner: `
      <path d="M46 44a12 12 0 0 0 2-23.8 18 18 0 0 0-34.8 4.6A10 10 0 0 0 16 44h30z" />
    `,
  },
  box: {
    label: 'Docker / Container / Pod',
    svgInner: `
      <path d="M52 20L32 9 12 20v24l20 11 20-11V20z" />
      <line x1="32" y1="9" x2="32" y2="55" />
      <polyline points="12 20 32 31 52 20" />
    `,
  },
  bug: {
    label: 'Bug / Vulnerability / Defect',
    svgInner: `
      <rect x="22" y="22" width="20" height="24" rx="10" />
      <path d="M26 14l-4-6" /><path d="M38 14l4-6" />
      <path d="M14 26l8 4" /><path d="M50 26l-8 4" />
      <path d="M12 36h10" /><path d="M42 36h10" />
      <path d="M14 46l8-4" /><path d="M50 46l-8-4" />
    `,
  },
  gitBranch: {
    label: 'Git Branch / Workflow',
    svgInner: `
      <line x1="18" y1="12" x2="18" y2="52" />
      <circle cx="18" cy="18" r="6" /><circle cx="18" cy="46" r="6" /><circle cx="46" cy="18" r="6" />
      <path d="M46 24c0 12-28 10-28 22" />
    `,
  },
  network: {
    label: 'Network / Mesh / Traffic',
    svgInner: `
      <circle cx="32" cy="14" r="6" /><circle cx="14" cy="48" r="6" /><circle cx="50" cy="48" r="6" />
      <line x1="32" y1="20" x2="14" y2="42" /><line x1="32" y1="20" x2="50" y2="42" /><line x1="20" y1="48" x2="44" y2="48" />
    `,
  },
  key: {
    label: 'API Key / Secret / Auth',
    svgInner: `
      <circle cx="24" cy="32" r="12" /><line x1="36" y1="32" x2="52" y2="32" />
      <line x1="44" y1="32" x2="44" y2="40" /><line x1="50" y1="32" x2="50" y2="38" />
    `,
  },
  activity: {
    label: 'Activity / Pulse / Health',
    svgInner: `
      <polyline points="10 34 22 34 28 14 36 50 42 34 54 34" />
    `,
  },
  hardDrive: {
    label: 'Hard Drive / Storage / SSD',
    svgInner: `
      <rect x="12" y="16" width="40" height="32" rx="6" />
      <line x1="12" y1="36" x2="52" y2="36" />
      <circle cx="42" cy="42" r="2.5" fill="currentColor" />
      <circle cx="34" cy="42" r="2.5" fill="currentColor" />
    `,
  },
  arrowRightLeft: {
    label: 'Compare / Migration / Exchange',
    svgInner: `
      <polyline points="44 14 52 22 44 30" /><line x1="12" y1="22" x2="52" y2="22" />
      <polyline points="20 34 12 42 20 50" /><line x1="52" y1="42" x2="12" y2="42" />
    `,
  },
  checkCircle: {
    label: 'Success / Validated',
    svgInner: `
      <circle cx="32" cy="32" r="22" />
      <polyline points="22 32 29 39 42 24" />
    `,
  },
  xCircle: {
    label: 'Failure / Legacy / Flaw',
    svgInner: `
      <circle cx="32" cy="32" r="22" />
      <line x1="23" y1="23" x2="41" y2="41" />
      <line x1="41" y1="23" x2="23" y2="41" />
    `,
  },
};

// Curated map of top tech brand logos hosted on Simple Icons CDN
export const KNOWN_TECH_LOGOS: Record<string, string> = {
  docker: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/docker.svg',
  kubernetes: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/kubernetes.svg',
  k8s: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/kubernetes.svg',
  redis: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/redis.svg',
  postgresql: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/postgresql.svg',
  postgres: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/postgresql.svg',
  mysql: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/mysql.svg',
  mongodb: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/mongodb.svg',
  clickhouse: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/clickhouse.svg',
  apachekafka: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/apachekafka.svg',
  kafka: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/apachekafka.svg',
  fastapi: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/fastapi.svg',
  python: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/python.svg',
  go: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/go.svg',
  golang: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/go.svg',
  rust: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/rust.svg',
  typescript: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/typescript.svg',
  javascript: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/javascript.svg',
  linux: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/linux.svg',
  ubuntu: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/ubuntu.svg',
  git: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/git.svg',
  github: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/github.svg',
  gitlab: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/gitlab.svg',
  aws: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/amazonwebservices.svg',
  amazonwebservices: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/amazonwebservices.svg',
  googlecloud: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/googlecloud.svg',
  microsoftazure: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/microsoftazure.svg',
  azure: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/microsoftazure.svg',
  cloudflare: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/cloudflare.svg',
  nginx: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/nginx.svg',
  graphql: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/graphql.svg',
  terraform: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/terraform.svg',
  ansible: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/ansible.svg',
  prometheus: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/prometheus.svg',
  grafana: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/grafana.svg',
  anthropic: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/anthropic.svg',
  openai: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/openai.svg',
  react: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/react.svg',
  nodejs: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/nodedotjs.svg',
  cplusplus: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/cplusplus.svg',
  sqlite: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/sqlite.svg',
  supabase: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/supabase.svg',
};

// Global in-memory custom icon storage for user uploads
const CUSTOM_ICONS_MAP: Record<string, string> = {};

export function registerCustomIcon(id: string, dataUrl: string): void {
  CUSTOM_ICONS_MAP[id] = dataUrl;
}

export function getCustomIcon(id: string): string | undefined {
  return CUSTOM_ICONS_MAP[id];
}

export function getIconSvg(iconName: string, strokeColor = '#13131E', strokeWidth = 4.2): string {
  const icon = ICONS_REGISTRY[iconName] || ICONS_REGISTRY.gitMerge;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      ${icon.svgInner}
    </svg>
  `.trim();
}

export function getIconDataUrl(iconName: string, strokeColor = '#13131E', strokeWidth = 4.2): string {
  // Check if it's a registered custom icon data URL
  if (CUSTOM_ICONS_MAP[iconName]) {
    return CUSTOM_ICONS_MAP[iconName];
  }
  // Check if iconName is already a data URL or blob URL
  if (iconName.startsWith('data:') || iconName.startsWith('blob:')) {
    return iconName;
  }
  // Check if iconName is a direct web URL
  if (iconName.startsWith('http://') || iconName.startsWith('https://')) {
    const colorParam = strokeColor ? `&color=${encodeURIComponent(strokeColor)}` : '';
    return `/api/proxy-image?url=${encodeURIComponent(iconName)}${colorParam}`;
  }
  // Check if iconName is a known tech logo
  const lower = iconName.toLowerCase().trim();
  if (KNOWN_TECH_LOGOS[lower]) {
    const colorParam = strokeColor ? `&color=${encodeURIComponent(strokeColor)}` : '';
    return `/api/proxy-image?url=${encodeURIComponent(KNOWN_TECH_LOGOS[lower])}${colorParam}`;
  }
  const svg = getIconSvg(iconName, strokeColor, strokeWidth);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

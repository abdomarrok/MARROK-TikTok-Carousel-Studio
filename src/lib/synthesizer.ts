import { CarouselData, SlideData, DiagramNode, DiagramVariant, HookVariant, CaptionVariant, ExtractedFact, PostSourceMeta } from '../types.ts';
import { KNOWN_TECH_LOGOS } from './icons.ts';
import {
  extractCleanHeadline,
  sanitizeMetricForArabic,
  sanitizeFullCarousel,
  stripMarkdown,
  normalizePunctuation,
} from './textSanitizer.ts';

interface SynthesisInput {
  prompt?: string;
  imageFileName?: string;
  categoryHint?: string;
  inputMode?: string;
}

interface DomainRule {
  category: string;
  theme: string;
  centerIcon: string;
  satIcons: string[];
  keywords: string[];
  metricFallback: string;
}

/**
 * Automatically maps input technical topic or prompt to the best MARROK ThemePalette:
 * - 'teal': SRE / DevTools / Backend / Monorepos / CI/CD
 * - 'cyber': Security / Post-Quantum / Zero-Trust / Exploits / CVEs
 * - 'violet': AI / LLMs / Neural Models / Inference / Transformers
 * - 'blueprint': Cloud / K8s / System Architecture / Infrastructure
 * - 'amber': Databases / SQL / Caching / In-Memory / Distributed Storage
 * - 'emerald': Linux Kernel / eBPF / Low-Level Systems / C++
 */
export function resolveDomainTheme(topicOrText: string): 'teal' | 'cyber' | 'violet' | 'blueprint' | 'amber' | 'emerald' {
  const lower = (topicOrText || '').toLowerCase();

  // 1. Cyber Threat Crimson: Security, Zero-Trust, Post-Quantum, Exploits, CVEs
  if (
    /\b(security|zero[- ]?trust|zerotrust|mtls|post[- ]?quantum|quantum|cve|exploit|malware|reverse|ghidra|ida|disassembl|vulnerab|defectdojo|sast|dast|trivy|semgrep|attack|hacker|firewall|cryptograph|least[- ]?privilege|perimeter|blast radius)\b/i.test(lower)
  ) {
    return 'cyber';
  }

  // 2. Electric AI Violet: AI, LLMs, Neural Models, Inference, Tokens
  if (
    /\b(ai|llm|llms|gpt|gpt-4|claude|gemini|transformer|deep learning|neural|weights|inference|tokens?|embedding|embeddings|rag|agentic|copilot|fine-tuning)\b/i.test(lower)
  ) {
    return 'violet';
  }

  // 3. Matrix Emerald: Linux Kernel, eBPF, Low-Level, Syscalls, Firmware
  if (
    /\b(kernel|ebpf|xdp|bpf|linux|syscall|syscalls|assembly|asm|low[- ]?level|firmware|memory safety|c\+\+|driver)\b/i.test(lower)
  ) {
    return 'emerald';
  }

  // 4. Solarized Amber: Databases, SQL, Caching, Redis, In-Memory, Storage
  if (
    /\b(redis|valkey|memcached|cache|caching|in[- ]?memory|database|sql|nosql|postgres|postgresql|mysql|sqlite|clickhouse|kafka|distributed systems?|storage|replication|raft|paxos|rocksdb|lsm|key[- ]?value)\b/i.test(lower)
  ) {
    return 'amber';
  }

  // 5. Enterprise Blueprint: Cloud, Kubernetes, K8s, Docker, Cloud-Native, System Architecture
  if (
    /\b(kubernetes|k8s|cloud|docker|container|containers|helm|ingress|aws|gcp|azure|serverless|microservices?|service[- ]?mesh|envoy|istio|architecture|system architecture|cluster|infrastructure|terraform)\b/i.test(lower)
  ) {
    return 'blueprint';
  }

  // 6. Terminal Teal (Default MARROK SRE & DevTools): SRE, VCS, Git, CI/CD, Monorepo, DevTools, Performance
  return 'teal';
}

/**
 * Dynamic diagram and satellite enrichment:
 * Guarantees that every slide carries 100% topic-relevant technical diagram data
 * (satLabels, diagramVariant, diagramNodes, diagramEdges, diagramFooter).
 * NEVER leaves generic Zero-Trust / Envoy Proxy / mTLS terms on non-security topics!
 */
export function enrichCarouselDiagrams(
  slides: SlideData[],
  topicOrText: string,
  category: string,
  brand: string = 'MARROK'
): SlideData[] {
  const lower = `${topicOrText || ''} ${category || ''}`.toLowerCase();

  const isPostgres = /\b(postgres|postgresql|sql|database|db|query|indexing|index|btree|pgbouncer|vacuum|wal|explain|storage engine)\b/i.test(lower);
  const isDockerVirt = /\b(docker|proxmox|virtualization|container|containers|lxc|qemu|kvm|overlayfs|cgroup|cgroups|hypervisor|kernel isolation|bare-metal)\b/i.test(lower);
  const isNextWeb = /\b(next\.js|nextjs|react|frontend|edge|cdn|ssr|isr|rsc|typescript|web framework|vercel)\b/i.test(lower);
  const isAiAgent = /\b(ai|llm|llms|agent|agents|rag|embedding|embeddings|transformer|inference|tokens|vllm)\b/i.test(lower);
  const isRedis = /\b(redis|valkey|memcached|cache|caching|in-memory|lru)\b/i.test(lower);
  const isScion = /\b(scion|vcs|git|monorepo|changeset|anthropic)\b/i.test(lower);
  const isZeroTrust = /\b(zero-trust|zerotrust|mtls|envoy|spiffe|perimeter|least-privilege|microsegmentation)\b/i.test(lower);

  // Extract clean keywords for generic fallback
  const cleanTokens = (topicOrText || '')
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(the|and|for|with|from|this|that|your|into|about|over)$/i.test(w));

  return slides.map((slide, idx) => {
    // 1. Hub Slide (Slide 1)
    if (idx === 0 || slide.type === 'hub') {
      let satLabels = slide.satLabels;
      if (!satLabels || satLabels.length < 6) {
        if (isPostgres) {
          satLabels = ['PgBouncer Pool', 'Shared Buffers', 'WAL Engine', 'B-Tree Index', 'Query Planner', 'Vacuum Worker'];
        } else if (isDockerVirt) {
          satLabels = ['OCI Container', 'OverlayFS', 'cgroups v2', 'Bridge Net', 'Host Kernel', 'ZFS Storage'];
        } else if (isNextWeb) {
          satLabels = ['Edge CDN', 'RSC Engine', 'SSR Worker', 'Static ISR', 'API Route', 'Client DOM'];
        } else if (isAiAgent) {
          satLabels = ['Prompt Core', 'Context Window', 'Vector Store', 'Tool Calling', 'Inference Run', 'Token Stream'];
        } else if (isRedis) {
          satLabels = ['Shared Memory', 'Sub-ms Cache', 'Memory P99', 'Cluster Shards', 'Persistence', 'Replica Sync'];
        } else if (isScion) {
          satLabels = ['Virtual FS', 'Server Merge', 'API VCS', 'Changesets', 'CI Runners', 'Telemetry'];
        } else if (isZeroTrust) {
          satLabels = ['mTLS / x509', 'Envoy Mesh', 'IAM Policy', 'Micro-Seg', 'Cert Rotation', 'Telemetry API'];
        } else {
          satLabels = [
            cleanTokens[0] ? cleanTokens[0].toUpperCase() : 'INGRESS',
            cleanTokens[1] ? cleanTokens[1].toUpperCase() : 'EXECUTION',
            cleanTokens[2] ? cleanTokens[2].toUpperCase() : 'RUNTIME',
            'STORAGE',
            'TELEMETRY',
            'API CORE',
          ];
        }
      }
      return {
        ...slide,
        type: 'hub',
        satLabels,
      };
    }

    // 2. Final Slide (CTA)
    if (idx === slides.length - 1 || slide.type === 'cta') {
      return {
        ...slide,
        type: 'cta',
      };
    }

    // 3. Technical Mechanism / Mid-Deck Slides
    // If slide is a number, metric, code, or compare, keep its type but ensure diagram fields are clean if needed
    if (slide.type === 'code' || slide.type === 'compare' || slide.type === 'metric' || slide.type === 'number') {
      return slide;
    }

    // Determine or honor diagramVariant
    const slideText = `${slide.enTitle || ''} ${slide.enBody || ''} ${slide.arTitle || ''}`.toLowerCase();
    let variant: DiagramVariant = slide.diagramVariant || 'topology';

    if (!slide.diagramVariant) {
      if (
        slideText.includes('blast radius') ||
        slideText.includes('microsegment') ||
        slideText.includes('isolation') ||
        slideText.includes('isolate') ||
        slideText.includes('perimeter') ||
        slideText.includes('firewall') ||
        slideText.includes('quarantine') ||
        slideText.includes('sandbox')
      ) {
        variant = 'isolation';
      } else if (
        slideText.includes('stack') ||
        slideText.includes('layer') ||
        slideText.includes('pipeline') ||
        slideText.includes('server-side') ||
        slideText.includes('engine') ||
        slideText.includes('tier') ||
        idx === 4
      ) {
        variant = 'stack';
      } else if (slide.icons?.length === 1 || slideText.includes('rule') || slideText.includes('principle') || slideText.includes('takeaway')) {
        variant = 'takeaway';
      } else {
        variant = 'topology';
      }
    }

    // If diagramNodes are already provided and don't contain hardcoded generic mTLS on non-security topics, keep them
    const hasExistingNodes = slide.diagramNodes && slide.diagramNodes.length >= 3;
    const isConflictedGeneric =
      hasExistingNodes &&
      !isZeroTrust &&
      slide.diagramNodes!.some((n) => /envoy|mtls|spiffe|quarantined pod/i.test(n.label || '') || /envoy|mtls|spiffe/i.test(n.sublabel || ''));

    if (hasExistingNodes && !isConflictedGeneric) {
      return {
        ...slide,
        diagramVariant: variant,
      };
    }

    // Synthesize topic-specific diagram nodes, edges, and footer
    let diagramNodes: DiagramNode[];
    let diagramEdges: string[];
    let diagramFooter: string;

    if (isPostgres) {
      if (variant === 'stack') {
        diagramNodes = [
          { label: 'CONNECTION POOL & INGRESS', sublabel: 'PgBouncer • Transaction Mode • 10k Conns', status: 'LAYER 01', icon: 'network' },
          { label: 'QUERY OPTIMIZER & INDEX SCAN', sublabel: 'Cost Planner • B-Tree Index • Parallel Scan', status: 'LAYER 02', icon: 'cpu' },
          { label: 'BUFFER CACHE & STORAGE', sublabel: 'Shared Buffers • ACID WAL Write • Dirty Flush', status: 'LAYER 03', icon: 'database' },
        ];
        diagramEdges = ['PARSE', 'EXECUTE'];
        diagramFooter = 'ZERO UNINDEXED TABLE SCANS • EXPLAIN ANALYZE < 1.0ms';
      } else if (variant === 'isolation') {
        diagramNodes = [
          { label: 'Unindexed Scan', sublabel: 'Seq Scan Blocked', status: 'DENIED', icon: 'alertCircle' },
          { label: 'Index Scan Buffer', sublabel: 'Index Hit (0.2ms)', status: 'ACTIVE', icon: 'zap' },
          { label: 'Cold Storage / WAL', sublabel: 'WAL Sync Commit', status: 'COMMITTED', icon: 'database' },
        ];
        diagramEdges = ['GUARD', 'WRITE'];
        diagramFooter = 'QUERY COST MINIMIZED • LOCK CONTENTION: 0ms • READ COMMITTED';
      } else if (variant === 'takeaway') {
        diagramNodes = [
          { label: 'Index First', sublabel: 'B-Tree & GiST Coverage', status: 'RULE 01', icon: 'database' },
          { label: 'Pool Early', sublabel: 'Transaction Mode PgBouncer', status: 'RULE 02', icon: 'zap' },
          { label: 'Profile p99', sublabel: 'EXPLAIN (ANALYZE, BUFFERS)', status: 'RULE 03', icon: 'activity' },
        ];
        diagramEdges = ['INDEX', 'VERIFY'];
        diagramFooter = 'DATABASE OPTIMIZATION: ELIMINATE DISK SEQUENTIAL READS';
      } else {
        diagramNodes = [
          { label: 'Client Worker', sublabel: 'Port 5432 / TCP', status: 'CLIENT', icon: 'server' },
          { label: 'PgBouncer Pool', sublabel: 'Tx Mode (64)', status: 'ROUTED', icon: 'database' },
          { label: 'Primary DB', sublabel: 'Shared Buffers', status: 'COMMITTED', icon: 'hardDrive' },
        ];
        diagramEdges = ['10k Conns', '64 Pooled'];
        diagramFooter = 'POOL MODE: TRANSACTION • P99 LATENCY: 0.8ms • MAX CLIENTS: 10,000';
      }
    } else if (isDockerVirt) {
      if (variant === 'stack') {
        diagramNodes = [
          { label: 'CONTAINER WORKLOAD & SHIM', sublabel: 'containerd • OCI Bundle • Virtual veth Bridge', status: 'LAYER 01', icon: 'box' },
          { label: 'KERNEL VIRTUALIZATION ENGINE', sublabel: 'PID / MNT Namespaces • cgroups v2 Quotas • seccomp', status: 'LAYER 02', icon: 'cpu' },
          { label: 'HARDWARE HOST & HYPERVISOR', sublabel: 'Bare-Metal CPU • Proxmox VE / KVM • ZFS Thin Pools', status: 'LAYER 03', icon: 'server' },
        ];
        diagramEdges = ['SYSCALL', 'VM RUN'];
        diagramFooter = 'ZERO EMULATION PENALTY • HARDWARE-ASSISTED VIRTUALIZATION';
      } else if (variant === 'isolation') {
        diagramNodes = [
          { label: 'Quarantined Container', sublabel: 'seccomp Denied', status: 'RESTRICTED', icon: 'shieldAlert' },
          { label: 'Bridge VLAN', sublabel: 'veth0 Isolated', status: 'ISOLATED', icon: 'network' },
          { label: 'Proxmox Core', sublabel: 'Host Ring 0', status: 'PROTECTED', icon: 'server' },
        ];
        diagramEdges = ['DENY', 'ALLOW'];
        diagramFooter = 'CONTAINER ESCAPES PREVENTED • BARE-METAL HARDWARE BOUNDARY';
      } else if (variant === 'takeaway') {
        diagramNodes = [
          { label: 'Namespace Guard', sublabel: 'PID/MNT Isolation', status: 'RULE 01', icon: 'box' },
          { label: 'Cgroup Limits', sublabel: 'RAM/CPU Quota', status: 'RULE 02', icon: 'cpu' },
          { label: 'Seccomp Filter', sublabel: 'Block Dangerous Syscalls', status: 'RULE 03', icon: 'lock' },
        ];
        diagramEdges = ['ISOLATE', 'QUOTA'];
        diagramFooter = 'VIRTUALIZATION ARCHITECTURE: SECURE RUNTIME DEFAULTS';
      } else {
        if (slideText.includes('proxmox') || slideText.includes('hypervisor') || slideText.includes('kvm') || slideText.includes('qemu')) {
          diagramNodes = [
            { label: 'Proxmox API / Web', sublabel: 'Port 8006 / HTTPS', status: 'CLIENT', icon: 'server' },
            { label: 'KVM / QEMU Core', sublabel: 'Hardware Virtualization', status: 'HYPERVISOR', icon: 'cpu' },
            { label: 'ZFS Storage Pool', sublabel: 'Thin Provisioned LVM', status: 'STORAGE', icon: 'hardDrive' },
          ];
          diagramEdges = ['PVE REST', 'IOCTL / KVM'];
          diagramFooter = 'HYPERVISOR: KVM/QEMU • STORAGE: ZFS RAID-Z2 • HARDWARE: VT-X';
        } else {
          diagramNodes = [
            { label: 'Docker CLI', sublabel: 'CLI / REST API', status: 'CLIENT', icon: 'terminal' },
            { label: 'containerd Shim', sublabel: 'UNIX Socket / OCI', status: 'RUNTIME', icon: 'box' },
            { label: 'Host Kernel', sublabel: 'cgroups & Namespaces', status: 'ISOLATED', icon: 'cpu' },
          ];
          diagramEdges = ['REST API', 'OCI Shim'];
          diagramFooter = 'CGROUPS V2 • OVERHEAD: < 1.2% • RUNTIME: BARE-METAL';
        }
      }
    } else if (isNextWeb) {
      if (variant === 'stack') {
        diagramNodes = [
          { label: 'GLOBAL EDGE & ROUTING', sublabel: 'Edge Middleware • Route Matcher • Geo POP', status: 'LAYER 01', icon: 'network' },
          { label: 'REACT SERVER COMPONENTS', sublabel: 'Async Streaming • Server Actions • React Tree', status: 'LAYER 02', icon: 'code' },
          { label: 'DATA FETCH & BACKEND', sublabel: 'REST / GraphQL • Connection Pool • Redis Cache', status: 'LAYER 03', icon: 'database' },
        ];
        diagramEdges = ['DISPATCH', 'RESOLVE'];
        diagramFooter = 'CORE WEB VITALS: 100/100 • INSTANT CLIENT INTERACTIVITY';
      } else {
        diagramNodes = [
          { label: 'Client Browser', sublabel: 'HTTP/3 / SSL', status: 'CLIENT', icon: 'globe' },
          { label: 'Edge CDN Cache', sublabel: 'Cloudflare / Vercel', status: 'ROUTED', icon: 'network' },
          { label: 'RSC Stream', sublabel: 'Streaming HTML', status: 'RENDERED', icon: 'code' },
        ];
        diagramEdges = ['GET /page', 'Cache HIT'];
        diagramFooter = 'TTFB: 18ms • HYDRATION: ZERO JS • REVALIDATE: ISR';
      }
    } else if (isAiAgent) {
      diagramNodes = [
        { label: 'Agent Planner', sublabel: 'Task Prompt', status: 'INPUT', icon: 'robot' },
        { label: 'Vector Store', sublabel: 'Top-K Retrieval', status: 'RETRIEVED', icon: 'search' },
        { label: 'Inference Engine', sublabel: 'Quantized Model', status: 'STREAMING', icon: 'cpu' },
      ];
      diagramEdges = ['Embedding', 'RAG Context'];
      diagramFooter = 'TTFT: 110ms • TOKENS/SEC: 85 • CONTEXT: 128k';
    } else if (isRedis) {
      diagramNodes = [
        { label: 'App Client', sublabel: 'RESP3 Protocol', status: 'CLIENT', icon: 'server' },
        { label: 'Redis 8 Engine', sublabel: 'Multi-Thread I/O', status: 'ACTIVE', icon: 'zap' },
        { label: 'In-Memory Shard', sublabel: 'Zero-Copy Cache', status: 'POOLED', icon: 'database' },
      ];
      diagramEdges = ['GET key', '0.18ms HIT'];
      diagramFooter = 'THROUGHPUT: 1.2M OPS/S • P99: 0.18ms • SHARDS: ACTIVE';
    } else if (isScion) {
      diagramNodes = [
        { label: 'AI Agent Worker', sublabel: 'Sparse Workspace', status: 'CLIENT', icon: 'robot' },
        { label: 'Scion VFS Daemon', sublabel: 'Virtual File Mount', status: 'MOUNTED', icon: 'server' },
        { label: 'Monorepo Server', sublabel: 'Authoritative Store', status: 'COMMITTED', icon: 'database' },
      ];
      diagramEdges = ['Virtual Read', 'Atomic Commit'];
      diagramFooter = 'CONCURRENCY: 25M CHECKOUTS/DAY • LOCAL DISK BLOAT: 0MB';
    } else if (isZeroTrust) {
      diagramNodes = [
        { label: 'Client Node', sublabel: '10.0.1.4:8443', status: 'INITIATOR', icon: 'server' },
        { label: 'Envoy Proxy', sublabel: 'SPIFFE ID Valid', status: 'VERIFIED', icon: 'shieldAlert' },
        { label: 'Target Workload', sublabel: 'Zero-Trust Policy', status: 'ISOLATED', icon: 'lock' },
      ];
      diagramEdges = ['mTLS 1.3', 'ALLOW'];
      diagramFooter = 'HANDSHAKE: 0.4ms P99 • CIPHER: TLS_AES_256_GCM_SHA384 • EGRESS: ENFORCED';
    } else {
      const titleClean = (slide.enTitle || 'Core Pipeline').replace(/[.?!]$/, '').slice(0, 16);
      diagramNodes = [
        { label: 'Client Ingress', sublabel: 'Input Request Stream', status: 'CLIENT', icon: 'server' },
        { label: titleClean, sublabel: 'Execution Engine', status: 'ACTIVE', icon: 'cpu' },
        { label: 'Target State', sublabel: 'Persistent Output', status: 'COMMITTED', icon: 'database' },
      ];
      diagramEdges = ['DISPATCH', 'SYNC'];
      diagramFooter = 'LATENCY: P99 < 1.0ms • SYSTEM: ONLINE • PIPELINE: VERIFIED';
    }

    return {
      ...slide,
      diagramVariant: variant,
      diagramNodes,
      diagramEdges,
      diagramFooter,
    };
  });
}

/**
 * Visual Pacing & Anti-Repetition Balancer
 * Guarantees zero adjacent or repeated diagram layouts across all mechanism slides in a carousel.
 * Cycles intelligently through ['topology', 'stack', 'isolation', 'takeaway'] based on slide semantics,
 * and repairs any missing fields (nodes, edges, footer, code, metric) so no slide ever renders half-empty.
 */
export function balanceCarouselVisualPacing(slides: SlideData[]): SlideData[] {
  const ALL_VARIANTS: DiagramVariant[] = ['topology', 'stack', 'isolation', 'takeaway'];
  let lastMechanismVariant: DiagramVariant | null = null;
  const variantCounts: Record<DiagramVariant, number> = {
    topology: 0,
    stack: 0,
    isolation: 0,
    takeaway: 0,
  };

  return slides.map((slide, idx) => {
    // Hub Slide (Slide 1)
    if (idx === 0 || slide.type === 'hub') {
      const satLabels = slide.satLabels && slide.satLabels.length >= 6
        ? slide.satLabels
        : ['INGRESS', 'RUNTIME', 'EXECUTION', 'STORAGE', 'TELEMETRY', 'CORE API'];
      return {
        ...slide,
        type: 'hub',
        satLabels,
      };
    }

    // CTA Slide (Final Slide)
    if (idx === slides.length - 1 || slide.type === 'cta') {
      return {
        ...slide,
        type: 'cta',
        ctaText: slide.ctaText || 'DM us  •  رسالة خاصة',
      };
    }

    // Specialized Archetypes: Validate & Repair Missing Data
    if (slide.type === 'code') {
      return {
        ...slide,
        codeFileName: slide.codeFileName || 'system_core.rs',
        codeLanguage: slide.codeLanguage || 'rust',
        codeSnippet: slide.codeSnippet || `// Architecture execution engine\n+ pub async fn execute_pipeline() -> Result<()> {\n+     let node = Engine::spawn().await?;\n+     node.commit_state().await\n+ }`,
      };
    }

    if (slide.type === 'metric') {
      return {
        ...slide,
        metricValue: slide.metricValue || '10x',
        metricLabel: slide.metricLabel || 'THROUGHPUT MULTIPLIER',
        metricDiff: slide.metricDiff || '▲ 94% faster vs legacy baseline',
        metricIcon: slide.metricIcon || 'zap',
      };
    }

    if (slide.type === 'compare') {
      return {
        ...slide,
        compareLeftTitle: slide.compareLeftTitle || 'Legacy Baseline',
        compareLeftBody: slide.compareLeftBody || '• Monolithic bottlenecks\n• High memory drift\n• Unindexed state scans',
        compareRightTitle: slide.compareRightTitle || 'Modern Engine',
        compareRightBody: slide.compareRightBody || '• Zero-copy dataflow\n• Deterministic execution\n• Sub-millisecond latency',
      };
    }

    if (slide.type === 'number') {
      const stepStr = slide.stepNumber || String(idx + 1).padStart(2, '0');
      return {
        ...slide,
        stepNumber: stepStr,
        stepLabel: slide.stepLabel || `STEP ${stepStr}`,
      };
    }

    if (slide.type === 'image') {
      return slide;
    }

    // Mechanism (Row) Slides: Enforce Anti-Repetition & Variety
    const slideText = `${slide.enTitle || ''} ${slide.enBody || ''} ${slide.arTitle || ''}`.toLowerCase();

    // Determine semantic affinity
    let preferredVariant: DiagramVariant = 'topology';
    if (
      slideText.includes('blast radius') ||
      slideText.includes('microsegment') ||
      slideText.includes('isolation') ||
      slideText.includes('isolate') ||
      slideText.includes('perimeter') ||
      slideText.includes('firewall') ||
      slideText.includes('quarantine') ||
      slideText.includes('sandbox') ||
      slideText.includes('boundary') ||
      slideText.includes('guard')
    ) {
      preferredVariant = 'isolation';
    } else if (
      slideText.includes('stack') ||
      slideText.includes('layer') ||
      slideText.includes('pipeline') ||
      slideText.includes('server-side') ||
      slideText.includes('engine') ||
      slideText.includes('tier') ||
      slideText.includes('storage') ||
      slideText.includes('virtual mount')
    ) {
      preferredVariant = 'stack';
    } else if (
      slideText.includes('rule') ||
      slideText.includes('principle') ||
      slideText.includes('takeaway') ||
      slideText.includes('lesson') ||
      slideText.includes('best practice') ||
      slide.icons?.length === 1
    ) {
      preferredVariant = 'takeaway';
    } else {
      preferredVariant = 'topology';
    }

    // Anti-repetition: if preferred matches immediately previous mechanism slide,
    // or if preferred has already been used more than others in this deck, cycle to least used candidate
    let chosenVariant: DiagramVariant = preferredVariant;
    if (chosenVariant === lastMechanismVariant || variantCounts[chosenVariant] > 0) {
      const candidates = ALL_VARIANTS.filter((v) => v !== lastMechanismVariant);
      candidates.sort((a, b) => variantCounts[a] - variantCounts[b]);
      if (candidates.length > 0) {
        chosenVariant = candidates[0];
      }
    }

    lastMechanismVariant = chosenVariant;
    variantCounts[chosenVariant]++;

    // Validate and repair diagram nodes, edges, footer
    const defaultTitleWords = (slide.enTitle || 'System Component')
      .replace(/[.?!]$/, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const n1Name = defaultTitleWords[0] || 'Client Ingress';
    const n2Name = defaultTitleWords[1] || 'Execution Core';
    const n3Name = defaultTitleWords[2] || 'Storage State';

    const rawNodes = slide.diagramNodes || [];
    const diagramNodes: DiagramNode[] = [
      {
        label: rawNodes[0]?.label || n1Name,
        sublabel: rawNodes[0]?.sublabel || 'Port 443 / Ingress',
        status: rawNodes[0]?.status || 'ACTIVE',
        icon: rawNodes[0]?.icon || slide.icons?.[0]?.icon || 'server',
      },
      {
        label: rawNodes[1]?.label || n2Name,
        sublabel: rawNodes[1]?.sublabel || 'Policy Engine',
        status: rawNodes[1]?.status || 'VERIFIED',
        icon: rawNodes[1]?.icon || slide.icons?.[1]?.icon || 'cpu',
      },
      {
        label: rawNodes[2]?.label || n3Name,
        sublabel: rawNodes[2]?.sublabel || 'Encrypted Storage',
        status: rawNodes[2]?.status || 'SECURED',
        icon: rawNodes[2]?.icon || slide.icons?.[2]?.icon || 'database',
      },
    ];

    const rawEdges = slide.diagramEdges || [];
    const diagramEdges = [rawEdges[0] || 'MUTUAL AUTH', rawEdges[1] || 'SYNC PIPE'];
    const diagramFooter = slide.diagramFooter || 'LATENCY: P99 < 1.0ms • PROTOCOL: DETERMINISTIC • STATUS: 100% HEALTHY';

    return {
      ...slide,
      type: 'row',
      diagramVariant: chosenVariant,
      diagramNodes,
      diagramEdges,
      diagramFooter,
    };
  });
}

const DOMAIN_RULES: DomainRule[] = [
  {
    category: 'CYBERSECURITY & ZERO-TRUST MESH',
    theme: 'cyber',
    centerIcon: 'lock',
    satIcons: ['shieldAlert', 'network', 'key', 'server', 'eyeRisk', 'terminal'],
    keywords: ['zero-trust', 'zerotrust', 'mtls', 'egress', 'bastion', 'perimeter', 'least-privilege', 'mesh', 'mutual-tls', 'envoy', 'service-mesh', 'microsegmentation'],
    metricFallback: '100% mTLS encrypted',
  },
  {
    category: 'IN-MEMORY CACHE & DATA STORES',
    theme: 'amber',
    centerIcon: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/redis.svg',
    satIcons: ['database', 'zap', 'hardDrive', 'server', 'cpu', 'activity'],
    keywords: ['redis', 'valkey', 'memcached', 'cache', 'key-value', 'in-memory', 'eviction', 'lru', 'redis 8', 'throughput'],
    metricFallback: '1.2M ops/sec',
  },
  {
    category: 'VCS & DEVSECOPS',
    theme: 'teal',
    centerIcon: 'gitMerge',
    satIcons: ['server', 'cpu', 'database', 'changesets', 'terminal', 'gauge'],
    keywords: ['git', 'vcs', 'monorepo', 'ci/cd', 'devops', 'scion', 'changeset', 'pull request', 'github', 'version control', 'source control', 'agent-scale'],
    metricFallback: '25M checkouts/day',
  },
  {
    category: 'LINUX KERNEL & OBSERVABILITY',
    theme: 'emerald',
    centerIcon: 'terminal',
    satIcons: ['cpu', 'lock', 'server', 'gauge', 'binary', 'codeFile'],
    keywords: ['kernel', 'ebpf', 'c/c++', 'assembly', 'xdp', 'bpf', 'linux', 'syscall'],
    metricFallback: '0 context switches',
  },
  {
    category: 'REVERSE ENGINEERING & EXPLOITS',
    theme: 'cyber',
    centerIcon: 'shieldAlert',
    satIcons: ['binary', 'search', 'lock', 'alerts', 'eyeRisk', 'terminal'],
    keywords: ['cve', 'exploit', 'revers', 'binary', 'ghidra', 'ida', 'malware', 'zero-day', 'disassembler'],
    metricFallback: '30 min turnaround',
  },
  {
    category: 'AI MODELS & INFERENCE',
    theme: 'violet',
    centerIcon: 'brain',
    satIcons: ['cpu', 'robot', 'database', 'lightbulb', 'gauge', 'changesets'],
    keywords: ['llm', 'gpt', 'inference', 'token', 'deep learning', 'weights', 'transformer', 'neural network', 'embedding'],
    metricFallback: '10x token efficiency',
  },
  {
    category: 'KUBERNETES & CLOUD SEC',
    theme: 'blueprint',
    centerIcon: 'server',
    satIcons: ['lock', 'database', 'shieldAlert', 'gitMerge', 'alerts', 'gauge'],
    keywords: ['kubernetes', 'k8s', 'container', 'cloud', 'docker', 'webhook', 'ingress', 'helm', 'cloud-native'],
    metricFallback: '99.99% uptime',
  },
  {
    category: 'DISTRIBUTED SYSTEMS & STORAGE',
    theme: 'amber',
    centerIcon: 'database',
    satIcons: ['server', 'gitMerge', 'cpu', 'changesets', 'clock', 'scales'],
    keywords: ['consensus', 'raft', 'paxos', 'database', 'distributed', 'kafka', 'replication', 'storage', 'postgres', 'clickhouse'],
    metricFallback: '50x query speedup',
  },
  {
    category: 'DEVSECOPS & VULNERABILITY',
    theme: 'cyber',
    centerIcon: 'shieldAlert',
    satIcons: ['funnel', 'alerts', 'eyeRisk', 'search', 'lock', 'terminal'],
    keywords: ['security', 'appsec', 'vulnerability', 'defectdojo', 'sast', 'dast', 'trivy', 'semgrep'],
    metricFallback: '95% noise reduction',
  },
];

const DEFAULT_RULE: DomainRule = {
  category: 'SYSTEMS ARCHITECTURE',
  theme: 'teal',
  centerIcon: 'cpu',
  satIcons: ['database', 'server', 'gitMerge', 'changesets', 'robot', 'gauge'],
  keywords: [],
  metricFallback: '100x scalability',
};

const ICON_AFFINITY: Record<string, string[]> = {
  zap: ['speed', 'latency', 'faster', 'p99', 'fast', 'quick', 'boost', 'ms', 'instant', 'throttle'],
  gauge: ['benchmark', 'rps', 'requests', 'scale', 'load', 'metric', 'rate', 'performance'],
  activity: ['health', 'pulse', 'monitor', 'uptime', 'sla', 'status', 'telemetry', 'realtime'],
  database: ['sql', 'postgres', 'clickhouse', 'database', 'table', 'store', 'storage', 'data', 'db'],
  hardDrive: ['disk', 'ssd', 'memory', 'ram', 'io', 'iops', 'cache', 'nvme', 'filesystem', 'heap'],
  server: ['server', 'node', 'cluster', 'backend', 'instance', 'bare-metal', 'datacenter'],
  cloud: ['cloud', 'aws', 'gcp', 'azure', 'serverless', 'lambda', 's3', 'vpc'],
  box: ['docker', 'container', 'pod', 'kubernetes', 'k8s', 'image', 'microservice', 'helm'],
  layers: ['architecture', 'stack', 'layer', 'monolith', 'infrastructure', 'foundation'],
  network: ['network', 'mesh', 'traffic', 'http', 'grpc', 'tcp', 'proxy', 'dns', 'gateway', 'ip', 'mtls'],
  shieldAlert: ['cve', 'exploit', 'vulnerability', 'attack', 'zero-day', 'hacker', 'breach', 'ransomware', 'threat'],
  lock: ['security', 'auth', 'oauth', 'token', 'jwt', 'encrypt', 'tls', 'ssl', 'cert', 'zero-trust', 'zerotrust'],
  key: ['key', 'secret', 'credentials', 'vault', 'api-key'],
  bug: ['bug', 'defect', 'crash', 'panic', 'flaw', 'fix', 'patch', 'error'],
  eyeRisk: ['audit', 'risk', 'inspect', 'scan', 'sast', 'dast', 'trivy', 'leak'],
  gitMerge: ['merge', 'pull-request', 'pr', 'branch', 'git', 'vcs', 'trunk', 'scion'],
  gitBranch: ['branch', 'checkout', 'fork', 'commit', 'diff', 'repo', 'repository'],
  codeFile: ['code', 'file', 'script', 'source', 'syntax', 'function', 'class'],
  terminal: ['terminal', 'cli', 'bash', 'shell', 'command', 'exec', 'sh', 'linux'],
  binary: ['binary', 'elf', 'pe', 'assembly', 'asm', 'ghidra', 'ida', 'disassembly', 'hex'],
  cpu: ['cpu', 'processor', 'core', 'thread', 'hardware', 'chip', 'instruction', 'kernel', 'ebpf'],
  brain: ['ai', 'llm', 'gpt', 'model', 'neural', 'transformer', 'deep learning', 'weights'],
  robot: ['bot', 'automation', 'crawler', 'agentic', 'copilot', 'agent'],
  lightbulb: ['idea', 'tip', 'lesson', 'rule', 'learn', 'pattern', 'insight'],
  scales: ['tradeoff', 'balance', 'vs', 'compare', 'contrast', 'cost'],
  arrowRightLeft: ['migration', 'transition', 'sync', 'transfer', 'switch'],
  checkCircle: ['validated', 'success', 'compliant', 'passed'],
  xCircle: ['flaw', 'bottleneck', 'failed', 'outdated'],
};

/**
 * Dynamically extract relevant icons based on user input keywords and theme context.
 * Automatically resolves official web tech brand logos (Simple Icons) when specific technologies are mentioned.
 */
function extractDynamicIcons(lowerText: string, fallbackBase: string[]): { centerIcon: string; satIcons: string[] } {
  const scoredIcons: { icon: string; score: number }[] = [];

  // 1. Check for official tech brand logos with strict word-boundary matching
  for (const [techKey, cdnUrl] of Object.entries(KNOWN_TECH_LOGOS)) {
    // Avoid substring false matches (e.g. 'rust' inside 'trust' or 'zero-trust')
    if (techKey === 'rust') {
      const stripped = lowerText.replace(/\bzero[- ]trust\b/gi, '').replace(/\btrust\b/gi, '');
      if (!/\brust\b/i.test(stripped)) {
        continue;
      }
    }
    if (techKey === 'go') {
      if (!/\bgo\b/i.test(lowerText) || /\b(google|golang|cargo|django)\b/i.test(lowerText)) {
        continue;
      }
    }

    const regex = new RegExp(`\\b${techKey}\\b`, 'i');
    if (regex.test(lowerText)) {
      scoredIcons.push({ icon: cdnUrl, score: 10 });
    }
  }

  // 2. Check general conceptual technical icons
  for (const [icon, keywords] of Object.entries(ICON_AFFINITY)) {
    let score = 0;
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        score += 2;
      }
    }
    if (score > 0) {
      scoredIcons.push({ icon, score });
    }
  }

  scoredIcons.sort((a, b) => b.score - a.score);

  const centerIcon = scoredIcons[0]?.icon || fallbackBase[0] || 'cpu';

  const satSet = new Set<string>();
  for (const item of scoredIcons) {
    if (item.icon !== centerIcon && satSet.size < 6) {
      satSet.add(item.icon);
    }
  }

  const defaultFillers = ['zap', 'layers', 'box', 'shieldAlert', 'database', 'gitMerge', 'server', 'terminal', 'cpu', 'brain'];
  for (const f of [...fallbackBase, ...defaultFillers]) {
    if (f !== centerIcon && satSet.size < 6) {
      satSet.add(f);
    }
  }

  return { centerIcon, satIcons: Array.from(satSet).slice(0, 6) };
}

/**
 * Extracts meaningful lines, bullet points, and metrics from raw technical user input.
 */
function extractUserInsights(rawText: string) {
  const lines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((l) => l.length > 15 && !l.startsWith('http'));

  // Extract explicit metrics (e.g. 50x, 25%, 100GB, 25M, 30ms, $50k)
  const metricRegex = /\b\d+(?:\.\d+)?\s*(?:%|x|X|GB|TB|MB|ms|s|req|rps|checkouts|k|M|B)\b/gi;
  const metricsFound = Array.from(new Set(rawText.match(metricRegex) || []));

  return { lines, metrics: metricsFound };
}

/**
 * Brand wordmark is strictly MARROK per brand identity specification.
 * Domain topics and technologies are represented via category tags and slide copy.
 */
function detectBrandAndUrl(_lowerText: string): { brand: string; brandUrl: string } {
  return { brand: 'MARROK', brandUrl: 'marrok.org' };
}

/**
 * MARROK Context-Driven Content Synthesizer
 * Dynamically synthesizes content-aware slide structures and tailored branding.
 */
export function synthesizeCarousel(input: SynthesisInput): CarouselData {
  const rawText = (input.prompt || input.imageFileName || '').trim();
  const lowerText = rawText.toLowerCase();

  // 1. Scored Domain Detection via Config Rules (highest specificity wins)
  let bestScore = -1;
  let matchedRule: DomainRule | undefined;

  for (const rule of DOMAIN_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lowerText.includes(kw)) {
        if (['zero-trust', 'zerotrust', 'mtls', 'scion', 'monorepo', 'redis', 'redis 8', 'valkey', 'ebpf', 'cve'].includes(kw)) {
          score += 10;
        } else {
          score += 2;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      matchedRule = rule;
    }
  }

  if (input.categoryHint && input.categoryHint !== 'auto') {
    const hintMatch = DOMAIN_RULES.find((r) => r.category.includes(input.categoryHint!));
    matchedRule = hintMatch || {
      ...DEFAULT_RULE,
      category: input.categoryHint.toUpperCase(),
    };
  }

  const autoTheme = resolveDomainTheme(rawText);
  const activeRule = (bestScore > 0 && matchedRule) ? matchedRule : (matchedRule || DEFAULT_RULE);
  const domainCategory = activeRule.category;
  const recommendedTheme = (bestScore > 0 && matchedRule) ? activeRule.theme : autoTheme;

  // Extract smart subject-aware dynamic icons (never static/repeated)
  const { centerIcon, satIcons } = extractDynamicIcons(lowerText, activeRule.satIcons);

  // 2. Strict Brand Wordmark (Always MARROK per Spec)
  const { brand, brandUrl } = detectBrandAndUrl(lowerText);

  // 3. Extract Clean Title and User Points
  const { headline, cleanTitle } = extractCleanHeadline(rawText, domainCategory);

  const { lines, metrics } = extractUserInsights(rawText);
  const userPoint1 = lines[0] || `Scaling ${cleanTitle} requires rethinking state isolation and memory allocation patterns.`;
  const userPoint2 = lines[1] || `Decoupled authoritative state ensures compute resources scale with actual payload size.`;
  const userPoint3 = lines[2] || `Offloading intensive runtime computations eliminates user-facing latency stalls.`;

  const rawMetric1 = metrics[0] || activeRule.metricFallback;
  const metric1 = normalizePunctuation(stripMarkdown(rawMetric1)).replace(/[.?!]+$/, '');
  const arMetric1 = sanitizeMetricForArabic(metric1);

  // 4. Content Blueprint Classification
  const isZeroTrust =
    lowerText.includes('zero-trust') ||
    lowerText.includes('zerotrust') ||
    lowerText.includes('mtls') ||
    lowerText.includes('mutual-tls') ||
    lowerText.includes('least-privilege') ||
    domainCategory.includes('ZERO-TRUST');

  const isRedis =
    lowerText.includes('redis') ||
    lowerText.includes('valkey') ||
    lowerText.includes('memcached') ||
    domainCategory.includes('IN-MEMORY CACHE');

  const isScion =
    lowerText.includes('scion') ||
    (lowerText.includes('anthropic') && lowerText.includes('git')) ||
    (lowerText.includes('beyond git') && lowerText.includes('vcs'));

  const isBenchmark =
    metrics.length >= 2 ||
    lowerText.includes('speedup') ||
    lowerText.includes('benchmark') ||
    lowerText.includes('latency') ||
    lowerText.includes('faster') ||
    lowerText.includes('cost') ||
    lowerText.includes('reduced storage');

  const isSecurity =
    lowerText.includes('cve') ||
    lowerText.includes('exploit') ||
    lowerText.includes('vulnerab') ||
    lowerText.includes('malware') ||
    lowerText.includes('reverse') ||
    lowerText.includes('ghidra') ||
    lowerText.includes('defectdojo');

  const isMigration =
    lowerText.includes('migrat') ||
    lowerText.includes('moved') ||
    lowerText.includes('beyond git') ||
    lowerText.includes('transition') ||
    lowerText.includes('replace');

  // 5. Determine Dynamic Slide Count (Spec §7: 8 slides standard for technical narrative arc)
  let targetSlideCount = 8;
  if (lines.length <= 1 && rawText.length < 80) {
    targetSlideCount = 6;
  }

  // 6. Generate Hook Variants (A/B testing) adhering strictly to 2-5 words ending in a period
  const hookVariants: HookVariant[] = [
    {
      tag: 'Curiosity & Shift',
      enTitle: isZeroTrust ? 'Zero-Trust, explained.' : isRedis ? 'Redis 8 gets faster.' : isScion ? 'Beyond traditional Git.' : `${headline}.`,
      arTitle: isZeroTrust ? 'شرح معمارية Zero-Trust' : isRedis ? 'تسريع محرك Redis 8' : isScion ? 'منظومة Scion لإدارة الشيفرات' : `هندسة منظومة ${cleanTitle}`,
      enBody: `How engineering constraints forced an architectural paradigm shift in ${domainCategory.toLowerCase()}.`,
      arBody: `كيف أدت التحديات الهندسية إلى إعادة التفكير بالكامل في بنية النظام.`,
      centerIcon,
    },
    {
      tag: 'Hard Metrics & Scale',
      enTitle: isZeroTrust ? 'mTLS encryption at scale.' : isRedis ? 'Redis 8 throughput record.' : 'Performance telemetry at scale.',
      arTitle: isZeroTrust ? 'تأمين الشبكات عند التوسع' : isRedis ? 'رقم قياسي في سرعة المعالجة' : 'معايير الأداء عند أقصى ضغط',
      enBody: `Key benchmarks (${metric1}) and lessons learned from high-throughput production.`,
      arBody: `أهم معايير الأداء والدروس المستفادة (${arMetric1}) من تشغيل الأنظمة تحت ضغط هائل.`,
      centerIcon: 'gauge',
    },
    {
      tag: 'Problem & Solution',
      enTitle: isZeroTrust ? 'Why perimeter firewalls failed.' : isRedis ? 'Eliminating memory bottlenecks.' : 'Overcoming legacy system limits.',
      arTitle: isZeroTrust ? 'لماذا فشلت الجدران النارية التقليدية؟' : isRedis ? 'التخلص من اختناقات الذاكرة' : 'تجاوز حدود الأنظمة السابقة',
      enBody: `Moving beyond legacy assumptions to build modern high-efficiency software.`,
      arBody: `تجاوز الأساليب القديمة لبناء برمجيات عالية الكفاءة والأمان.`,
      centerIcon: 'shieldAlert',
    },
  ];

  // Helper to trim candidate slides to exact dynamic target count while keeping Slide 1 (Hub) and Last Slide (CTA)
  function trimSlides(candidates: SlideData[], count: number): SlideData[] {
    if (candidates.length <= count) return candidates;
    const first = candidates[0];
    const last = candidates[candidates.length - 1];
    const middle = candidates.slice(1, candidates.length - 1);
    const needed = Math.max(count - 2, 1);
    return [first, ...middle.slice(0, needed), last];
  }

  // 7. Generate Rich, Multi-Archetype Slide Structure
  let slides: SlideData[];

  if (isZeroTrust) {
    // Dedicated Zero-Trust & mTLS Narrative Arc
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'lock',
        satIcons: ['shieldAlert', 'network', 'key', 'server', 'activity', 'terminal'],
        satLabels: ['mTLS / x509', 'Envoy Mesh', 'IAM Policy', 'Micro-Seg', 'Cert Rotation', 'Telemetry API'],
        enTitle: 'Zero-Trust, explained.',
        arTitle: 'شرح معمارية Zero-Trust',
        enBody: 'How cryptographic identity and least-privilege egress replace perimeter networks.',
        arBody: 'كيف تلغي معمارية التحقق المستمر الثغرات التقليدية وتؤمن بيئات الإنتاج السحابية.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'server', label: 'Client Node' },
          { icon: 'shieldAlert', label: 'Envoy Proxy' },
          { icon: 'lock', label: 'Isolated Pod' },
        ],
        enTitle: 'Mutual TLS encryption active.',
        arTitle: 'تشفير كامل عبر mTLS',
        enBody: 'Every internal microservice verifies identity with short-lived cryptographic certificates.',
        arBody: 'كل خدمة داخلية تتحقق من هوية الطرف الآخر باستخدام شهادات رقمية مؤقتة وموثقة.',
      },
      {
        type: 'compare',
        compareLeftTitle: 'Perimeter Defense',
        compareLeftBody: '• Flat internal network\n• Implicit trust inside\n• Lateral move exploits',
        compareRightTitle: 'Zero-Trust Mesh',
        compareRightBody: '• Cryptographic auth\n• Strict egress control\n• Zero implicit access',
        enTitle: 'Perimeter vs Zero-Trust.',
        arTitle: 'الدفاع التقليدي مقابل العزل',
        enBody: 'Breaching one container no longer grants access to the surrounding cluster.',
        arBody: 'اختراق أي حاوية فردية لا يمنح المهاجم أي وصول إلى بقية أجزاء الشبكة الداخلية.',
      },
      {
        type: 'code',
        codeFileName: 'envoy-mtls.yaml',
        codeLanguage: 'YAML',
        codeSnippet: `# Envoy Strict TLS Handshake Enforcement\n$ envoy -c /etc/envoy.yaml --validate\n- tls_mode: PERMISSIVE (unencrypted fallback)\n+ tls_mode: STRICT_MUTUAL (require x509 cert)\n✔ Handshake: STRICT_MTLS [SPIFFE ID VERIFIED]`,
        enTitle: 'Strict client certificate proof.',
        arTitle: 'إثبات الهوية بالشهادات الرقمية',
        enBody: 'Traffic between services fails closed without a valid mutual cryptographic handshake.',
        arBody: 'يتم رفض أي اتصال داخلي فوراً ما لم يقدم شهادة مصادقة مشفرة وسارية المفعول.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'shieldAlert', label: 'Breached Pod' },
          { icon: 'lock', label: 'Protected Mesh' },
          { icon: 'database', label: 'Air-Gapped DB' },
        ],
        enTitle: 'Microsegmentation limits blast radius.',
        arTitle: 'تقسيم الشبكة يحد الأضرار',
        enBody: 'Network policies restrict egress to only pre-approved service dependencies.',
        arBody: 'سياسات العزل الصارمة تمنع خروج أي حزم بيانات إلا إلى الخدمات المعرفة مسبقاً.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'network', label: 'Ingress Gateway' },
          { icon: 'gitMerge', label: 'Envoy Mesh' },
          { icon: 'database', label: 'Secure Storage' },
        ],
        enTitle: 'The Catch: Pipeline and cert rotation.',
        arTitle: 'تحدي إدارة الشهادات الدورية',
        enBody: 'Short-lived certificates require automated control planes to prevent unexpected service outages.',
        arBody: 'الشهادات قصيرة الأجل تتطلب أتمتة كاملة لإدارتها تفادياً لانقطاع الخدمات المفاجئ.',
      },
      {
        type: 'metric',
        metricValue: '100% mTLS',
        metricLabel: 'ENCRYPTED ZERO-TRUST TRAFFIC',
        metricDiff: '▼ 0 unauthenticated packets allowed',
        metricIcon: 'shieldAlert',
        enTitle: 'Never trust, always verify.',
        arTitle: 'القاعدة الذهبية: لا تثق أبداً',
        enBody: 'Treat every network packet as if it originated from an untrusted public internet node.',
        arBody: 'تعامل مع كل اتصال داخلي وكأنه قادم من شبكة عامة غير موثوقة تماماً.',
      },
      {
        type: 'cta',
        enTitle: 'Hardening cloud networks?',
        arTitle: 'تؤمن شبكتك السحابية اليوم؟',
        enBody: 'Discuss service mesh, mTLS, and Zero-Trust architecture with security engineers.',
        arBody: 'تواصل معنا لمناقشة تطبيق معمارية Zero-Trust وتأمين بيئات الإنتاج.',
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · Zero-Trust Security Report`,
        arCredit: `${brand} · تقرير أمني في معمارية Zero-Trust`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  } else if (isRedis) {
    // Dedicated Redis 8 & In-Memory Cache Arc
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/redis.svg',
        satIcons: ['database', 'zap', 'hardDrive', 'server', 'cpu', 'activity'],
        satLabels: ['Shared Memory', 'Sub-ms Cache', 'Memory P99', 'Cluster Shards', 'Persistence', 'Replica Sync'],
        enTitle: 'Redis 8 gets faster.',
        arTitle: 'تسريع محرك Redis 8',
        enBody: 'How asynchronous I/O and query pipelining deliver sub-millisecond in-memory throughput.',
        arBody: 'كيف ترفع المعمارية الجديدة سرعة المعالجة في الذاكرة مع خفض استهلاك الموارد.',
      },
      {
        type: 'metric',
        metricValue: '1.2M ops/s',
        metricLabel: 'IN-MEMORY THROUGHPUT',
        metricDiff: '▲ 40% higher ops/sec',
        metricIcon: 'zap',
        enTitle: 'Redis 8 throughput record.',
        arTitle: 'رقم قياسي في سرعة المعالجة',
        enBody: 'Multi-threaded I/O multiplexing handles millions of operations per second with microsecond latency.',
        arBody: 'معالجة متزامنة وموزعة للطلبات تضمن استجابة فورية حتى تحت أقصى ضغط تشغيلي.',
      },
      {
        type: 'compare',
        compareLeftTitle: 'Legacy Redis',
        compareLeftBody: '• Single-thread bottlenecks\n• Blocking save latency\n• High memory fragmentation',
        compareRightTitle: 'Redis 8 Engine',
        compareRightBody: '• Multi-thread I/O workers\n• Zero-copy memory pooling\n• Steady microsecond p99',
        enTitle: 'Redis 8 architecture contrast.',
        arTitle: 'المقارنة بين الإصدارين',
        enBody: 'Offloading network read/write from the main execution thread keeps cache pipelines fluid.',
        arBody: 'فصل عمليات قراءة الشبكة عن معالج الأوامر الرئيسي يمنع أي بطء في استرجاع البيانات.',
      },
      {
        type: 'code',
        codeFileName: 'redis_bench.sh',
        codeLanguage: 'BASH',
        codeSnippet: `$ redis-benchmark -q -n 1000000 -c 50 -P 16\n> Pipelining active across 4 IO threads...\n- Legacy single-thread queue: 180,000 ops/s\n+ Multi-thread I/O multiplexer: 1,240,000 ops/s\n✔ Microsecond p99 latency: 0.18ms`,
        enTitle: 'Microsecond p99 benchmark proof.',
        arTitle: 'إثبات السرعة تحت الضغط',
        enBody: 'Pipelined requests execute in lock-free shared buffers without thread contention.',
        arBody: 'تنفيذ الاستعلامات المجمعة في الذاكرة المشتركة دون أي تضارب أو إبطاء للمعالج.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'hardDrive', label: 'Zero-Copy' },
          { icon: 'cpu', label: 'Threading' },
        ],
        enTitle: 'Optimized memory allocation buffers.',
        arTitle: 'إدارة ذاكرة فائقة الدقة',
        enBody: 'Custom memory allocators eliminate fragmentation spikes during high key churn.',
        arBody: 'محسنات الذاكرة الخاصة تمنع تبعثر البيانات وتضمن استقرار استهلاك الرام.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'alertCircle', label: 'The Catch' },
          { icon: 'database', label: 'Sharding' },
        ],
        enTitle: 'The Catch: Cluster sharding.',
        arTitle: 'تحدي توزيع المفاتيح والشظايا',
        enBody: 'Multi-key queries across disparate cluster shards require cross-slot routing overhead.',
        arBody: 'الاستعلامات المتعددة عبر عقد مختلفة تتطلب توجيهاً إضافياً قد يقلل من الفائدة.',
      },
      {
        type: 'metric',
        metricValue: '< 64 KB',
        metricLabel: 'OPTIMAL PAYLOAD THRESHOLD',
        metricDiff: '▲ Sub-millisecond p99 guarantee',
        metricIcon: 'gauge',
        enTitle: 'Keep payloads minimal and lean.',
        arTitle: 'احرص على تقليص أحجام البيانات',
        enBody: 'In-memory stores remain sub-millisecond only when value payloads stay under 64KB.',
        arBody: 'قواعد البيانات في الذاكرة تحافظ على سرعتها الفائقة طالما بقيت أحجام السجلات صغيرة.',
      },
      {
        type: 'cta',
        enTitle: 'Scaling in-memory cache?',
        arTitle: 'تطور محركات التخزين المؤقت؟',
        enBody: 'Discuss Redis 8 clustering, memory sizing, and high-throughput cache topologies.',
        arBody: 'تواصل معنا لمناقشة أداء Redis وتصميم حلول التخزين المؤقت عالية السرعة.',
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · Redis 8 Architecture Report`,
        arCredit: `${brand} · دراسة أداء محرك Redis 8`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  } else if (isScion) {
    // Dedicated Anthropic Scion & Agent-Scale Monorepo VCS Arc
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'gitMerge',
        satIcons: ['server', 'cpu', 'database', 'changesets', 'terminal', 'gauge'],
        satLabels: ['Virtual FS', 'Server Merge', 'API VCS', 'Changesets', 'CI Runners', 'Telemetry'],
        enTitle: 'Beyond traditional Git.',
        arTitle: 'منظومة Scion لإدارة الشيفرات',
        enBody: 'Why AI agent concurrency broke standard Git and how Anthropic engineered Scion for monorepos.',
        arBody: 'لماذا عجزت أنظمة Git التقليدية أمام وتيرة الوكلاء البرمجيين وكيف صممت Anthropic منظومة Scion.',
      },
      {
        type: 'compare',
        compareLeftTitle: 'Standard Git Model',
        compareLeftBody: '• Full tree local cloning\n• Merge conflicts with bots\n• 100GB disk bloat per seat',
        compareRightTitle: 'Scion Agent-Scale VCS',
        compareRightBody: '• Virtual sparse checkout\n• Server-authoritative state\n• Instant atomic changesets',
        enTitle: 'Git vs Scion monorepo.',
        arTitle: 'مقارنة معمارية Git و Scion',
        enBody: 'Agents generate thousands of commits per hour, rendering client-side git locks unusable.',
        arBody: 'الوكلاء الآليون ينشئون آلاف التعديلات كل ساعة مما يجعل قفل المستودع محلياً مستحيلاً.',
      },
      {
        type: 'metric',
        metricValue: '25M checkouts/day',
        metricLabel: 'AGENT CONCURRENCY',
        metricDiff: '▲ Zero local disk clone wait',
        metricIcon: 'activity',
        enTitle: 'Scion agent concurrency scale.',
        arTitle: 'استيعاب آلاف الوكلاء بالتزامن',
        enBody: 'Decoupled virtual filesystem mounts mount only the exact source files an agent inspects.',
        arBody: 'نظام الملفات الافتراضي يقوم بتحميل وتثبيت الملفات التي يحتاجها الوكيل فقط دون غيرها.',
      },
      {
        type: 'code',
        codeFileName: 'scion-mount.sh',
        codeLanguage: 'BASH',
        codeSnippet: `$ scion checkout --virtual --sparse=agent-workspace\n> Mounting virtual repository tree at /work...\n- Local Git clone disk bloat: 120GB\n+ Scion virtual sparse pointer: 420ms\n✔ Atomic changeset verified by server`,
        enTitle: 'Virtual filesystem lazy checkout.',
        arTitle: 'تحميل فوري عبر النظام الافتراضي',
        enBody: 'Local working copies become lightweight pointers to authoritative server storage.',
        arBody: 'تصبح النسخ المحلية مجرد مؤشرات خفيفة جداً تشير مباشرة إلى الخوادم المركزية.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'server', label: 'Server API' },
          { icon: 'changesets', label: 'Changesets' },
        ],
        enTitle: 'Server authoritative changesets.',
        arTitle: 'تأكيد التغييرات عبر الخادم',
        enBody: 'Server-side conflict resolution eliminates the need for agents to rebase whole histories.',
        arBody: 'معالجة التضارب على مستوى الخادم تلغي حاجة الوكلاء إلى إعادة بناء تاريخ المستودع.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'alertCircle', label: 'The Catch' },
          { icon: 'server', label: 'Monorepo Scale' },
        ],
        enTitle: 'The Catch: Monorepo scale.',
        arTitle: 'متى تحتاج إلى هذه المنظومة',
        enBody: 'Custom VCS engines like Scion require dedicated infrastructure teams. Stick to Git under 50GB.',
        arBody: 'الأنظمة المخصصة مثل Scion تحتاج لفرق دعم متفرغة؛ المستودعات الأصغر من 50GB تبقى أفضل مع Git.',
      },
      {
        type: 'metric',
        metricValue: '200x',
        metricLabel: 'COMPUTE FOOTPRINT REDUCTION',
        metricDiff: '▲ 25% of all CI computing freed',
        metricIcon: 'cpu',
        enTitle: 'Decouple storage from compute.',
        arTitle: 'افصل التخزين عن المعالجة',
        enBody: 'Never force developer or agent machines to hold the full historical weight of the repository.',
        arBody: 'لا تجبر أجهزة المطورين أو الوكلاء على تحميل وتخزين كامل تاريخ المستودع الضخم.',
      },
      {
        type: 'cta',
        enTitle: 'Scaling agent developer toolchains?',
        arTitle: 'تطور أدوات التطوير للوكلاء؟',
        enBody: 'Discuss monorepo architectures, virtual checkouts, and developer infrastructure at scale.',
        arBody: 'تواصل معنا لمناقشة هندسة المستودعات الضخمة وبناء أدوات الوكلاء البرمجيين.',
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · Scion VCS Architecture Report`,
        arCredit: `${brand} · دراسة معمارية Scion لإدارة المستودعات`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  } else if (isBenchmark) {
    // Structure A: Benchmark & Metrics Deep Dive (Hub -> Metric Hero -> Compare -> Code Diff -> Rows -> CTA)
    const enBenchmarkTitle = `${headline} speedup.`;
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'gauge',
        satIcons,
        enTitle: enBenchmarkTitle,
        arTitle: `قفزة في أداء ${cleanTitle}`,
        enBody: `How an architectural redesign delivered ${metric1} faster execution and lowered infrastructure cost.`,
        arBody: `كيف حققت إعادة بناء المنظومة تسريعاً بنسبة ${arMetric1} مع خفض ملحوظ في تكلفة الموارد.`,
      },
      {
        type: 'metric',
        metricValue: metric1,
        metricLabel: 'PRODUCTION SPEEDUP',
        metricDiff: `▲ ${metric1} vs legacy baseline`,
        metricIcon: 'zap',
        enTitle: `${headline} benchmark win.`,
        arTitle: `قفزة في الأداء بنسبة ${arMetric1}`,
        enBody: `Measured throughput and latency reductions across live production workloads.`,
        arBody: `نتائج حقيقية موثقة في بيئة الإنتاج الفعلي أظهرت كفاءة استثنائية واستقراراً تاماً.`,
      },
      {
        type: 'compare',
        compareLeftTitle: 'Legacy Bottleneck',
        compareLeftBody: `• Memory allocation spikes\n• Single-thread lockups\n• High p99 tail latency`,
        compareRightTitle: 'Optimized Stack',
        compareRightBody: `• Zero-allocation parsing\n• Lock-free parallel pipelines\n• Steady microsecond p99`,
        enTitle: 'Architectural comparison.',
        arTitle: 'مقارنة معمارية الأنظمة',
        enBody: userPoint1,
        arBody: 'التحول من المعالجة الثقيلة المقيدة إلى بنية موزعة وخفيفة على الذاكرة.',
      },
      {
        type: 'code',
        codeFileName: 'bench_run.sh',
        codeLanguage: 'BASH',
        codeSnippet: `$ ./benchmark --workload=high-concurrency\n> Warming up virtual worktree...\n- Legacy tail latency: 240ms\n+ Optimized runtime latency: 12ms\n✔ Target throughput: ${metric1} [PASSED]`,
        enTitle: 'The core optimization in action.',
        arTitle: 'آلية التحسين أثناء التنفيذ',
        enBody: userPoint2,
        arBody: 'إلغاء العمليات الزائدة وحصر المعالجة فقط في البيانات المتغيرة بشكل فوري.',
      },
      {
        type: 'row',
        icons: [
          { icon: satIcons[0] || 'cpu', label: 'Compute' },
          { icon: satIcons[1] || 'hardDrive', label: 'Memory' },
        ],
        enTitle: 'Decoupled state eliminates stalls.',
        arTitle: 'فصل الحالة يمنع الاختناق',
        enBody: userPoint3,
        arBody: 'نقل العمليات الثقيلة إلى وحدات متخصصة يضمن استجابة فورية للمستخدمين.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'alertCircle', label: 'Trade-off' },
          { icon: 'gauge', label: 'Complexity' },
        ],
        enTitle: 'The Catch: When not to optimize.',
        arTitle: 'ما يجب معرفته قبل الانتقال',
        enBody: `Low-level optimization introduces cognitive overhead. Only adopt when profiling proves memory or p99 tail latency harms user workflows.`,
        arBody: `التحسين العميق يزيد من تعقيد الشيفرة؛ لا تطبقه إلا إذا أثبتت القياسات أن بطء الاستجابة يؤثر فعلياً على النظام.`,
      },
      {
        type: 'metric',
        metricValue: 'p99 < 1ms',
        metricLabel: 'TAIL LATENCY BENCHMARK',
        metricDiff: '▲ 99.9% requests stay sub-millisecond',
        metricIcon: 'gauge',
        enTitle: 'Profile p99 continuously.',
        arTitle: 'قاعدة مهندسي الاعتمادية SRE',
        enBody: `Never optimize based on averages. Track 99th percentile response times and memory allocations.`,
        arBody: 'لا تقيس الأداء بالمتوسطات؛ تتبع أبطأ 1% من الطلبات واستنزاف الذاكرة بشكل مستمر.',
      },
      {
        type: 'cta',
        enTitle: 'Benchmarking production systems?',
        arTitle: 'تقيس أداء أنظمتك التقنية؟',
        enBody: `Discuss benchmark profiling and systems optimization with engineers.`,
        arBody: `تواصل معنا لمناقشة تحليل الأداء وهندسة الأنظمة عالية الكفاءة.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Benchmark Report`,
        arCredit: `${brand} · تقرير قياس أداء ${domainCategory}`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  } else if (isSecurity) {
    // Structure B: Security & Exploits (Hub -> Metric Triage -> Exploit Code -> Compare -> Rows -> CTA)
    const enSecurityTitle = `${headline} vulnerability.`;
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon: 'shieldAlert',
        satIcons,
        enTitle: enSecurityTitle,
        arTitle: `تشريح أمني لمنظومة ${cleanTitle}`,
        enBody: `A security deep dive into the vulnerability mechanism, exploit reachability, and defensive hardening.`,
        arBody: `تحليل أمني عميق لجذور الخلل، إمكانية الاستغلال، والحلول الدفاعية الموصى بها.`,
      },
      {
        type: 'metric',
        metricValue: metric1.includes('%') || metric1.includes('min') ? metric1 : '95%',
        metricLabel: 'ATTACK SURFACE TRIAGE',
        metricDiff: '▼ 95% false alarms filtered out',
        metricIcon: 'shieldAlert',
        enTitle: `${headline} blast radius.`,
        arTitle: 'تقييم خطورة الاستغلال الفعلي',
        enBody: `Distinguishing raw automated alerts from critical vulnerabilities attackers can genuinely reach.`,
        arBody: 'فرز التنبيهات الآلية لتحديد الثغرات الحرجة القابلة للاستغلال الحقيقي.',
      },
      {
        type: 'code',
        codeFileName: 'exploit_poc.py',
        codeLanguage: 'PYTHON',
        codeSnippet: `# CVE Validation & Defensive Proof\n$ python3 exploit_poc.py --target=staging\n- Payload triggered: unauthenticated memory read\n+ Applied patch: boundary validation active\n✔ Reachability: MITIGATED`,
        enTitle: 'Exploit mechanism and patch proof.',
        arTitle: 'آلية الاستغلال وإثبات الترقيع',
        enBody: userPoint1,
        arBody: 'فحص مسار الاستغلال البرمجي والتأكد من إغلاق الثغرة تماماً.',
      },
      {
        type: 'compare',
        compareLeftTitle: 'Unfiltered Scanners',
        compareLeftBody: `• 1,000+ noisy alerts\n• Dev fatigue & backlog\n• No reachability context`,
        compareRightTitle: 'Reachability Triage',
        compareRightBody: `• 5% critical flaws prioritized\n• Focus on exposed APIs\n• Immediate defensive win`,
        enTitle: 'Attack surface vs boundary.',
        arTitle: 'مسار الهجوم مقابل خط الدفاع',
        enBody: userPoint2,
        arBody: 'تحديد المسار الذي يمكن للمهاجم استغلاله مقارنة بنطاق العزل الأمني المعمول به.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'binary', label: 'Decompilation' },
          { icon: 'search', label: 'Static Analysis' },
        ],
        enTitle: 'Binary inspection and decompilation.',
        arTitle: 'فحص الشيفرة المترجمة',
        enBody: userPoint3,
        arBody: 'فحص ملفات النظام الثنائية للتأكد من عدم وجود مسارات تسريب غير مقصودة.',
      },
      {
        type: 'row',
        icons: [
          { icon: 'shieldAlert', label: 'Reality Check' },
          { icon: 'lock', label: 'Defense' },
        ],
        enTitle: 'The Catch: Beyond vulnerability scans.',
        arTitle: 'حدود الحماية وأهمية الدفاع المتعدد',
        enBody: `Patching reachable CVEs is only half the battle. Without strict network isolation and least-privilege tokens, blast radius remains high.`,
        arBody: `ترقيع الثغرات ليس كافياً بمفرده؛ بدون عزل بيئات التشغيل وتقييد الصلاحيات، يبقى خطر الاختراق الداخلي قائماً.`,
      },
      {
        type: 'metric',
        metricValue: '95%',
        metricLabel: 'ATTACK SURFACE ELIMINATED',
        metricDiff: '▲ Prioritizing top 5% reachable CVEs',
        metricIcon: 'shieldAlert',
        enTitle: 'Fix reachable bugs first.',
        arTitle: 'قاعدة الأمان السيبراني الأساسية',
        enBody: `Fixing the 5% of reachable flaws provides 95% of real-world defensive protection for production stacks.`,
        arBody: 'معالجة الثغرات القابلة للوصول الفعلي تمنحك 95% من الحماية الحقيقية ضد الهجمات.',
      },
      {
        type: 'cta',
        enTitle: 'Building secure software stacks?',
        arTitle: 'تبني برمجيات آمنة ومحمية؟',
        enBody: `Connect with security researchers to harden your software supply chain.`,
        arBody: `تواصل معنا لمناقشة أمن البرمجيات وحماية بيئات التطوير والإنتاج.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Advisory`,
        arCredit: `${brand} · تقرير أمني في ${domainCategory}`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  } else {
    // Structure D: General Systems & Architecture (Non-repetitive, context-aware)
    const enGeneralTitle = `${headline} overview.`;
    const candidateSlides: SlideData[] = [
      {
        type: 'hub',
        centerIcon,
        satIcons,
        enTitle: enGeneralTitle,
        arTitle: `هندسة منظومة ${cleanTitle}`,
        enBody: `How modern architecture patterns eliminate bottlenecks in ${domainCategory.toLowerCase()}.`,
        arBody: `كيف تساهم المعمارية الحديثة في معالجة نقاط الاختناق ورفع كفاءة وموثوقية النظام.`,
      },
      {
        type: 'metric',
        metricValue: metric1,
        metricLabel: 'PERFORMANCE MULTIPLIER',
        metricDiff: '▲ Measurable architectural speedup',
        metricIcon: 'zap',
        enTitle: `${headline} breakthrough.`,
        arTitle: `نقلة نوعية في الأداء`,
        enBody: `How decoupled architecture eliminated memory bottlenecks and lowered infrastructure spend.`,
        arBody: `كيف ساهمت البنية المفصولة في خفض استهلاك الموارد ورفع الكفاءة التشغيلية.`,
      },
      {
        type: 'compare',
        compareLeftTitle: 'Legacy Bottleneck',
        compareLeftBody: `• Tight coupling of state\n• High RAM footprint\n• Latency spikes under load`,
        compareRightTitle: 'Modern Engine',
        compareRightBody: `• Independent state layer\n• Sub-millisecond execution\n• Linear horizontal scaling`,
        enTitle: 'Where legacy approaches hit limits.',
        arTitle: 'أين تتوقف الأنظمة التقليدية؟',
        enBody: userPoint1,
        arBody: `عندما يتضاعف حجم البيانات، تصبح الأدوات السابقة عائقاً في الذاكرة والمعالج.`,
      },
      {
        type: 'code',
        codeFileName: 'sys_exec.sh',
        codeLanguage: 'BASH',
        codeSnippet: `$ ./system-engine --mode=distributed\n> Initializing decentralized nodes...\n- Monolithic blocking state: 3400ms\n+ State synchronized across 3 zones: 24ms\n✔ 0 context switches detected`,
        enTitle: 'Decoupled state execution.',
        arTitle: 'فصل طبقة البيانات عن التنفيذ',
        enBody: userPoint2,
        arBody: `من خلال إدارة الحالة بشكل مستقل، تصبح العمليات مرتبطة فقط بالملفات المعدلة دون إهدار الموارد.`,
      },
      {
        type: 'row',
        icons: [
          { icon: satIcons[0] || 'cpu', label: 'Processing' },
          { icon: satIcons[1] || 'server', label: 'Cluster' },
        ],
        enTitle: 'Server-side authoritative design.',
        arTitle: 'بنية تحتية مركزية ومحكمة',
        enBody: userPoint3,
        arBody: `نقل العمليات المعقدة إلى خوادم متخصصة يمنع التجمد وبطء الأجهزة الطرفية.`,
      },
      {
        type: 'row',
        icons: [
          { icon: 'alertCircle', label: 'The Catch' },
          { icon: 'layers', label: 'Complexity' },
        ],
        enTitle: 'The Catch: The operational cost.',
        arTitle: 'التكلفة التشغيلية الخفية',
        enBody: `Decoupled architectures trade local simplicity for network complexity. Ensure distributed tracing is configured before migration.`,
        arBody: `الأنظمة الموزعة تستبدل بساطة الكود بتعقيد الشبكة والمراقبة؛ تأكد من جاهزية أدوات الرصد قبل فصل البيانات.`,
      },
      {
        type: 'metric',
        metricValue: '10x',
        metricLabel: 'RELIABILITY MULTIPLIER',
        metricDiff: '▼ 90% reduced blast radius',
        metricIcon: 'activity',
        enTitle: 'Ship smaller, verify faster.',
        arTitle: 'انشر تغييرات أصغر، وتحقق أسرع',
        enBody: `Smaller incremental changesets reduce blast radius and make troubleshooting instantaneous.`,
        arBody: `التغييرات الصغيرة والمستمرة تقلل نطاق الأعطال وتجعل تتبع المشاكل وحلها فورياً.`,
      },
      {
        type: 'cta',
        enTitle: 'Engineering modern software architectures?',
        arTitle: 'تبني أنظمة برمجية حديثة؟',
        enBody: `Join the conversation and discuss technical architecture.`,
        arBody: `تواصل معنا لمناقشة التفاصيل الهندسية وأفضل الممارسات في بناء الأنظمة.`,
        ctaText: 'DM us  •  رسالة خاصة',
        url: brandUrl,
        enCredit: `${brand} · ${domainCategory} Deep Dive`,
        arCredit: `${brand} · دراسة تفصيلية في ${domainCategory}`,
      },
    ];
    slides = trimSlides(candidateSlides, targetSlideCount);
  }

  // Strict Safety Invariant: Guarantee Slide 1 is hub, final slide is cta, and NO mid-deck slide has type 'cta'
  slides = slides.map((s, idx) => {
    if (idx === 0) return { ...s, type: 'hub' };
    if (idx === slides.length - 1) return { ...s, type: 'cta' };
    if (s.type === 'cta' || s.type === 'hub') return { ...s, type: 'row' };
    return s;
  });

  // Dynamic Diagram & Satellite Enrichment: Guarantee 100% topic relevance on every slide
  slides = enrichCarouselDiagrams(slides, rawText, domainCategory, brand);
  slides = balanceCarouselVisualPacing(slides);

  // 7. Generate Dual Captions with Extracted Specifics & Grounding Citations
  const domainTag = domainCategory.replace(/[^a-zA-Z0-9]/g, '');
  const brandTag = brand.replace(/[^a-zA-Z0-9]/g, '');
  const hashtags = `#TechInArabic #هندسة_البرمجيات #${domainTag} #SoftwareEngineering #DevSecOps #TechTrends #SystemDesign #${brandTag} #برمجة`;

  // Build authentic domain grounding sources
  const domainGroundingSources: { title: string; url: string }[] = [];
  const domainGroundingQueries: string[] = [
    `${brand} ${domainCategory} architecture benchmark`,
    `${headline} implementation production trade-offs`,
    `${domainCategory} performance telemetry`,
  ];

  if (domainCategory.includes('KERNEL') || domainCategory.includes('OBSERVABILITY')) {
    domainGroundingSources.push(
      { title: 'The Linux Kernel Archives', url: 'https://kernel.org' },
      { title: 'eBPF Documentation & Specifications', url: 'https://ebpf.io/what-is-ebpf' },
      { title: 'IOVisor Kernel Tracing Tools', url: 'https://github.com/iovisor/bcc' }
    );
  } else if (domainCategory.includes('REVERSE') || domainCategory.includes('EXPLOITS') || domainCategory.includes('SECURITY')) {
    domainGroundingSources.push(
      { title: 'NVD National Vulnerability Database', url: 'https://nvd.nist.gov' },
      { title: 'MITRE CVE Program', url: 'https://cve.mitre.org' },
      { title: 'NSA Ghidra Software Reverse Engineering', url: 'https://github.com/NationalSecurityAgency/ghidra' }
    );
  } else if (domainCategory.includes('AI') || domainCategory.includes('INFERENCE') || domainCategory.includes('VCS')) {
    domainGroundingSources.push(
      { title: `${brand} Engineering & Research`, url: brandUrl ? `https://${brandUrl}` : 'https://anthropic.com/research' },
      { title: 'ACM Digital Library Systems Architecture', url: 'https://dl.acm.org' },
      { title: 'GitHub Open Engineering Specifications', url: 'https://github.com' }
    );
  } else if (domainCategory.includes('DISTRIBUTED') || domainCategory.includes('STORAGE')) {
    domainGroundingSources.push(
      { title: 'ClickHouse Architecture & Vector Engines', url: 'https://clickhouse.com/docs' },
      { title: 'PostgreSQL Global Development Group', url: 'https://www.postgresql.org/docs/' },
      { title: 'Apache Kafka Distributed Event Streaming', url: 'https://kafka.apache.org' }
    );
  } else {
    domainGroundingSources.push(
      { title: `${brand} Technical Documentation`, url: brandUrl ? `https://${brandUrl}` : 'https://marrok.org' },
      { title: 'USENIX Association Systems Research', url: 'https://www.usenix.org' }
    );
  }

  // Build facts with explicit unverified status for offline synthesizer fallback
  const extractedFacts: ExtractedFact[] = [
    {
      text: `Primary architectural domain: ${domainCategory}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Synthesizer domain heuristics (unverified offline draft)`,
      sourceTitle: domainGroundingSources[0]?.title || `${brand} Engineering`,
      sourceUrl: domainGroundingSources[0]?.url || `https://${brandUrl}`,
    },
    {
      text: `Primary engineering source / brand: ${brand}`,
      type: 'name',
      verified: 'unverified',
      evidence: `Identified from technical publication reference (${brandUrl})`,
      sourceTitle: `${brand} Official Portal`,
      sourceUrl: brandUrl ? `https://${brandUrl}` : 'https://marrok.org',
    },
    {
      text: `Production benchmark / headline metric: ${metric1}`,
      type: 'number',
      verified: 'unverified',
      evidence: `Fallback estimate — ungrounded local synthesizer metric`,
      sourceTitle: domainGroundingSources[0]?.title || 'Performance Telemetry',
      sourceUrl: domainGroundingSources[0]?.url || `https://${brandUrl}`,
    },
    {
      text: `Core architectural mechanism: ${userPoint1}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Template fallback — not grounded via live web search`,
      sourceTitle: domainGroundingSources[1]?.title || 'Architecture Whitepaper',
      sourceUrl: domainGroundingSources[1]?.url || `https://${brandUrl}`,
    },
    {
      text: `Operational trade-offs and limits identified for Slide 6: ${userPoint2}`,
      type: 'claim',
      verified: 'unverified',
      evidence: `Spec §7 "Before You Switch / The Catch" hedge (offline draft)`,
      sourceTitle: domainGroundingSources[0]?.title || 'Systems Report',
      sourceUrl: domainGroundingSources[0]?.url || `https://${brandUrl}`,
    },
  ];

  // Format single-line headline summaries for captions to prevent broken breaks & double punctuation
  const slide1ArHeader = (slides[0]?.arTitle || headline).replace(/[:.]\s*\n+/g, ' — ').replace(/\n+/g, ' — ').trim();
  const slide1EnHeader = (slides[0]?.enTitle || headline).replace(/[:.]\s*\n+/g, ' — ').replace(/\n+/g, ' — ').replace(/[:.]\s*$/, '').trim();

  const formattedBilingualCaption = `⚡ ${slide1ArHeader}
تحليل تقني ومعماري متعمق لأحدث نقلة برمجية 🛠️

${slide1EnHeader} — Engineering Deep Dive
Why traditional architectures stall at scale and how modern systems solve the bottleneck.

🔹 أبرز آليات العمل والنتائج / Key Technical Takeaways:
• Domain: ${domainCategory}
• Core Mechanism: ${userPoint1}
• Production Win: ${metric1} vs legacy stack
• Caveats: ${userPoint2}

⚠️ Citations & Draft Facts (Offline Synthesizer Estimate):
• Unverified offline draft — creator review required before publishing
• Source: ${domainGroundingSources[0]?.title || brand} (${domainGroundingSources[0]?.url || brandUrl})

👇 هل واجهتم هذه المشكلة في بيئات الإنتاج عندكم؟ شاركونا تجربتكم في التعليقات!
What's your take on this architecture? Share below!

🎥 مرجع التحليل والتوثيق / Reference: ${brandUrl ? `https://${brandUrl}` : 'https://marrok.org'}

${hashtags}`;

  const captionVariants: CaptionVariant[] = [
    {
      style: 'Executive Bulletins & Hard Metrics (Recommended)',
      caption: formattedBilingualCaption,
    },
    {
      style: 'Narrative Breakdown & Story',
      caption: `ماذا يحدث عندما تصل الأنظمة التقليدية إلى حدودها القصوى؟ 🚨
الحل ليس الترقيع، بل إعادة التفكير في المعمارية البرمجية من الصفر.

في هذا التحليل المفصل حول ${headline}، نستعرض كيف نجحت الفرق الهندسية في تحقيق ${metric1} مع تفادي نقاط الاختناق الشائعة.

اسحب الصور لمتابعة الشرح خطوة بخطوة 👉
Swipe through the slides for the complete breakdown!

🔗 المرجع والمصدر: https://${brandUrl}

${hashtags}`,
    },
  ];

  const firstComment = `🔗 Primary source documentation & reference post: https://${brandUrl}\n\nWhat are your thoughts on this architecture? Share your take below 👇`;
  const shortCaption = `${slide1ArHeader} ⚡\n${slide1EnHeader} — Swipe through the breakdown 👉`;
  const screenHook = `${slide1EnHeader} in 60s`;

  const sourceMeta: PostSourceMeta = {
    type: (input.inputMode === 'upload' || Boolean(input.imageFileName)) ? 'screenshot' : (rawText.length > 400 ? 'article' : 'notes'),
    title: headline,
    creator: brand,
    url: brandUrl ? `https://${brandUrl}` : 'https://marrok.org',
    published: new Date().toISOString().split('T')[0],
    isSearchGrounded: false,
    groundingQueries: domainGroundingQueries,
    groundingSources: domainGroundingSources,
    isFallback: true,
    engine: 'offline-synthesizer',
    status: 'unverified_draft',
    userReviewed: false,
  };

  const notesForHuman: string[] = [
    `Unverified offline draft: Synthesized from offline domain heuristics without active web search grounding. Verify all numbers and claims before publication.`,
    `Review and customize slide copy using the studio editor, or connect a Gemini API key for live search-grounded research.`,
    `Bilingual Arabic typography checked for RTL line-endings and numbers positioned per Spec §9.`,
    `Attribution and link included in pinned first comment for TikTok comment section.`,
  ];

  const scheduleSlot = '18:00–21:00 ME / 16:00–19:00 UTC (Peak developer engagement)';

  return sanitizeFullCarousel({
    theme: recommendedTheme,
    category: domainCategory,
    brand,
    brandUrl,
    caption: captionVariants[0].caption,
    firstComment,
    shortCaption,
    screenHook,
    sourceMeta,
    facts: extractedFacts,
    notesForHuman,
    scheduleSlot,
    captionVariants,
    hookVariants,
    slides,
  });
}

import { DiagramNode, DiagramVariant, SlideData } from '../../types';

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
  _brand: string = 'MARROK'
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
          { label: 'PgBouncer Pool', sublabel: 'Ingress • Tx Mode • 10k Conns', status: 'LAYER 01', icon: 'network' },
          { label: 'Query Planner', sublabel: 'Cost Optimizer • B-Tree Index', status: 'LAYER 02', icon: 'cpu' },
          { label: 'Buffer Cache', sublabel: 'Shared Buffers • ACID WAL Write', status: 'LAYER 03', icon: 'database' },
        ];
        diagramEdges = ['PARSE', 'EXECUTE'];
        diagramFooter = 'ZERO UNINDEXED TABLE SCANS • EXPLAIN ANALYZE < 1.0ms';
      } else if (variant === 'isolation') {
        diagramNodes = [
          { label: 'Unindexed Scan', sublabel: 'Seq Scan Blocked', status: 'DENIED', icon: 'alertCircle' },
          { label: 'Index Buffer', sublabel: 'Index Hit (0.2ms)', status: 'ACTIVE', icon: 'zap' },
          { label: 'WAL Storage', sublabel: 'WAL Sync Commit', status: 'COMMITTED', icon: 'database' },
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
          { label: 'Container Shim', sublabel: 'containerd • OCI Bundle • veth', status: 'LAYER 01', icon: 'box' },
          { label: 'Kernel Engine', sublabel: 'PID/MNT Namespaces • cgroups v2', status: 'LAYER 02', icon: 'cpu' },
          { label: 'Host Hypervisor', sublabel: 'Proxmox VE / KVM • ZFS Pools', status: 'LAYER 03', icon: 'server' },
        ];
        diagramEdges = ['SYSCALL', 'VM RUN'];
        diagramFooter = 'ZERO EMULATION PENALTY • HARDWARE-ASSISTED VIRTUALIZATION';
      } else if (variant === 'isolation') {
        diagramNodes = [
          { label: 'Quarantine Pod', sublabel: 'seccomp Denied', status: 'RESTRICTED', icon: 'shieldAlert' },
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
            { label: 'Proxmox API', sublabel: 'Port 8006 / HTTPS', status: 'CLIENT', icon: 'server' },
            { label: 'KVM Core', sublabel: 'Hardware Virtualization', status: 'HYPERVISOR', icon: 'cpu' },
            { label: 'ZFS Pool', sublabel: 'Thin Provisioned LVM', status: 'STORAGE', icon: 'hardDrive' },
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
          { label: 'Global Edge', sublabel: 'Edge Middleware • Geo POP', status: 'LAYER 01', icon: 'network' },
          { label: 'React RSC', sublabel: 'Server Components • Streaming', status: 'LAYER 02', icon: 'code' },
          { label: 'Data Backend', sublabel: 'REST/GraphQL • Connection Pool', status: 'LAYER 03', icon: 'database' },
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
        { label: 'AI Worker', sublabel: 'Sparse Workspace', status: 'CLIENT', icon: 'robot' },
        { label: 'Scion VFS', sublabel: 'Virtual File Mount', status: 'MOUNTED', icon: 'server' },
        { label: 'Monorepo Store', sublabel: 'Authoritative Store', status: 'COMMITTED', icon: 'database' },
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

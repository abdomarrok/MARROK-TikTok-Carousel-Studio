import { describe, expect, it } from 'vitest';
import {
  cleanRawInput,
  mentionsGoLanguage,
  parseComparativeEntities,
  scanMetrics,
  synthesizeUniversalCarousel,
} from './universalExtractor';
import { extractCleanSubject } from '../text/headlines';

describe('cleanRawInput', () => {
  it('strips list markers without deleting leading years or metrics', () => {
    const { lines } = cleanRawInput(
      '2025 product roadmap for the runtime\n- 1.66x throughput gain in 2025\n2. Go Gin handles 129k req/s'
    );

    expect(lines).toEqual([
      '2025 product roadmap for the runtime',
      '1.66x throughput gain in 2025',
      'Go Gin handles 129k req/s',
    ]);
  });
});

describe('scanMetrics', () => {
  it('preserves multipliers and years from source text', () => {
    const metrics = scanMetrics('In 2025 the new runtime reached 1.66x speedup and 13 MB memory.');

    expect(metrics.map((metric) => metric.value)).toEqual(
      expect.arrayContaining(['13 MB', '1.66x speedup'])
    );
  });
});

describe('parseComparativeEntities', () => {
  it('parses arbitrary comparison labels and assigns metrics to the correct side', () => {
    const entities = parseComparativeEntities(
      'PostgreSQL vs MySQL: Postgres 12ms latency, MySQL 18ms latency',
      scanMetrics('PostgreSQL vs MySQL: Postgres 12ms latency, MySQL 18ms latency')
    );

    expect(entities.isComparative).toBe(true);
    expect(entities.leftTitle).toBe('PostgreSQL');
    expect(entities.rightTitle).toBe('MySQL Stack');
    expect(entities.leftBullets).toEqual(['• 12 ms latency']);
    expect(entities.rightBullets).toEqual(['• 18 ms latency']);
  });

  it('handles Rust/Go comparisons with memory and throughput metrics', () => {
    const raw =
      'Rust Actix 1.66x faster than Go Gin\n- Rust: 1.66x speedup, 13 MB memory\n- Go: 129k req/s, 38 MB memory';
    const entities = parseComparativeEntities(raw, scanMetrics(raw));

    expect(entities.leftTitle).toBe('Rust Actix-web');
    expect(entities.rightTitle).toBe('Go Gin API');
    expect(entities.leftBullets).toEqual(['• 1.66x speedup', '• 13 MB memory footprint']);
    expect(entities.rightBullets).toEqual(['• 129k req/s throughput', '• 38 MB memory footprint']);
  });
});

describe('mentionsGoLanguage', () => {
  it('does not treat ordinary English "go" as the Go language', () => {
    expect(mentionsGoLanguage('I want to go home and go to market')).toBe(false);
    expect(mentionsGoLanguage('Rust vs Go performance')).toBe(true);
    expect(mentionsGoLanguage('The Go runtime scheduler uses goroutines')).toBe(true);
    expect(mentionsGoLanguage('Gin API benchmark')).toBe(true);
  });
});

describe('extractCleanSubject', () => {
  it('extracts technical nouns and clean Arabic subjects without question grammar', () => {
    const gitSubject = extractCleanSubject('Why did Anthropic move beyond Git?');
    expect(gitSubject.cleanSubject).toBe('Anthropic Scion');
    expect(gitSubject.arSubject).toBe('أنظمة Scion');

    const dockerSubject = extractCleanSubject('Docker container security in production');
    expect(dockerSubject.cleanSubject).toBe('Docker Containers');
    expect(dockerSubject.arSubject).toBe('حاويات Docker');

    const redisSubject = extractCleanSubject('Redis 8 vs Valkey: In-memory performance breakdown');
    expect(redisSubject.cleanSubject).toBe('Redis & Caching');
    expect(redisSubject.arSubject).toBe('قواعد Redis');

    const postgresSubject = extractCleanSubject('PostgreSQL connection pooling with PgBouncer');
    expect(postgresSubject.cleanSubject).toBe('PostgreSQL');
    expect(postgresSubject.arSubject).toBe('قواعد PostgreSQL');
  });
});

describe('synthesizeUniversalCarousel (Zero AI Slop)', () => {
  it('generates a topic-accurate VCS & Scion narrative without Rust/Go benchmark leaks', () => {
    const slides = synthesizeUniversalCarousel('Why did Anthropic move beyond Git?');

    expect(slides).toHaveLength(8);
    expect(slides[0].type).toBe('hub');
    expect(slides[0].enTitle).toContain('Anthropic');
    expect(slides[0].satLabels).toEqual(
      expect.arrayContaining(['Virtual FS', 'Server Merge', 'API VCS'])
    );

    // Slide 2 is the 100 GB monorepo scale trigger
    expect(slides[1].type).toBe('metric');
    expect(slides[1].metricValue).toBe('100 GB');

    // Slide 4 is Compare
    expect(slides[3].type).toBe('compare');
    expect(slides[3].compareLeftTitle).toBe('Traditional Git');
    expect(slides[3].compareRightTitle).toBe('Anthropic Scion');

    // Slide 7 is the honest engineering trade-off
    expect(slides[6].type).toBe('row');
    expect(slides[6].diagramVariant).toBe('takeaway');
    expect(slides[6].enTitle).toBe('Not a Git killer.');

    // Slide 8 is the closer CTA
    expect(slides[7].type).toBe('cta');

    // Verify ZERO Rust/Go leaks in VCS story
    const fullText = JSON.stringify(slides);
    expect(fullText).not.toContain('Actix');
    expect(fullText).not.toContain('Gin');
    expect(fullText).not.toContain('129k req/s');
  });

  it('generates a dedicated Docker multi-stage build narrative without VCS or Rust leaks', () => {
    const slides = synthesizeUniversalCarousel('Docker container isolation and minimal images');

    expect(slides).toHaveLength(8);
    expect(slides[0].type).toBe('hub');
    expect(slides[0].satLabels).toEqual(
      expect.arrayContaining(['Multi-Stage', 'Scratch Base', 'Minimal Image'])
    );

    // Slide 3 is the multi-stage Dockerfile
    expect(slides[3].type).toBe('code');
    expect(slides[3].codeLanguage).toBe('dockerfile');
    expect(slides[3].codeSnippet).toContain('FROM scratch');

    // Verify ZERO Git/Scion leaks in Docker story
    const fullText = JSON.stringify(slides);
    expect(fullText).not.toContain('Scion');
    expect(fullText).not.toContain('Anthropic');
    expect(fullText).not.toContain('25M checkouts');
  });

  it('generates a dedicated Redis in-memory narrative without leaks', () => {
    const slides = synthesizeUniversalCarousel('Redis 8 cluster performance and memory tradeoffs');

    expect(slides).toHaveLength(8);
    expect(slides[0].type).toBe('hub');
    expect(slides[0].satLabels).toEqual(
      expect.arrayContaining(['In-Memory', 'Active Sharding', 'LRU Eviction'])
    );

    // Slide 2 is in-memory throughput metric
    expect(slides[1].type).toBe('metric');
    expect(slides[1].metricValue).toBe('1.2M ops');

    // Verify ZERO Docker or Scion leaks in Redis story
    const fullText = JSON.stringify(slides);
    expect(fullText).not.toContain('Dockerfile');
    expect(fullText).not.toContain('Scion');
  });

  it('builds slides directly from user-provided substantive notes', () => {
    const userNotes = `Modernizing Web Gateway
- Replaced reverse proxy with Envoy mesh sidecars
- Reduced P99 response latency by 45ms across services
- Implemented mutual TLS with automatic SPIFFE rotation
- Trade-off: increased proxy memory footprint by 12MB per container`;

    const slides = synthesizeUniversalCarousel(userNotes);

    expect(slides).toHaveLength(8);
    expect(slides[0].type).toBe('hub');
    // Slides reflect the user's specific points
    const fullText = JSON.stringify(slides);
    expect(fullText).toContain('Envoy');
    expect(fullText).toContain('45ms');
    expect(fullText).toContain('SPIFFE');
    expect(slides[7].type).toBe('cta');
  });
});

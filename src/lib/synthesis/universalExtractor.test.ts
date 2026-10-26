import { describe, expect, it } from 'vitest';
import {
  cleanRawInput,
  mentionsGoLanguage,
  parseComparativeEntities,
  scanMetrics,
} from './universalExtractor';

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

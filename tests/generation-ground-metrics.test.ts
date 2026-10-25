import { describe, expect, it } from 'vitest'
import { groundMetricSentences } from '../lib/generation/ground-metrics'

describe('groundMetricSentences', () => {
  it('replaces a supported numeric sentence with the exact source sentence', () => {
    expect(groundMetricSentences(
      'Cut latency by 35 percent.',
      'Reduced request latency by 35%.',
      'Outcome not provided.',
    )).toBe('Reduced request latency by 35%.')
  })

  it('drops unsupported values and does not match a digit inside a larger number', () => {
    expect(groundMetricSentences('Reduced costs by 2%.', 'Delivered in 2024.', 'Outcome not provided.'))
      .toBe('Outcome not provided.')
  })

  it('drops unsupported quantities even when the model spells them out', () => {
    expect(groundMetricSentences('Processed twenty thousand transactions per day.', 'Processed 20,000 transactions per day.', 'Outcome not provided.'))
      .toBe('Outcome not provided.')
  })

  it('restores a source sentence when its written-out quantity is repeated', () => {
    expect(groundMetricSentences('Processed twenty thousand transactions per day.', 'We processed twenty thousand transactions per day.', 'Outcome not provided.'))
      .toBe('We processed twenty thousand transactions per day.')
  })

  it('retains non-numeric wording while dropping unsupported numeric sentences', () => {
    expect(groundMetricSentences(
      'Built a reconciliation service. It processed 10,000 payments.',
      'The service processes payments.',
      'Outcome not provided.',
    )).toBe('Built a reconciliation service.')
  })

  it('uses the fallback if every sentence with a metric is unsupported', () => {
    expect(groundMetricSentences('Improved throughput by 500%.', '', 'Outcome not provided.'))
      .toBe('Outcome not provided.')
  })
})

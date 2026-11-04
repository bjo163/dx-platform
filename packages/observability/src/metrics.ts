// Prometheus-compatible metrics for NeuralForge

export interface MetricLabels {
  [key: string]: string;
}

export interface MetricSample {
  labels: MetricLabels;
  value: number;
  timestamp?: number;
}

export interface Metric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  samples: MetricSample[];
}

export class MetricsRegistry {
  private metrics = new Map<string, Metric>();

  counter(name: string, help: string): Counter {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, help, type: 'counter', samples: [{ labels: {}, value: 0 }] });
    }
    return new Counter(this, name);
  }

  gauge(name: string, help: string): Gauge {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, help, type: 'gauge', samples: [{ labels: {}, value: 0 }] });
    }
    return new Gauge(this, name);
  }

  inc(name: string, labels: MetricLabels = {}, value = 1): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') return;
    const sample = this.findOrCreateSample(metric, labels);
    sample.value += value;
  }

  set(name: string, labels: MetricLabels = {}, value: number): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'gauge') return;
    const sample = this.findOrCreateSample(metric, labels);
    sample.value = value;
  }

  private findOrCreateSample(metric: Metric, labels: MetricLabels): MetricSample {
    const key = JSON.stringify(labels);
    let sample = metric.samples.find((s) => JSON.stringify(s.labels) === key);
    if (!sample) {
      sample = { labels: { ...labels }, value: 0 };
      metric.samples.push(sample);
    }
    return sample;
  }

  metrics(): Metric[] {
    return [...this.metrics.values()];
  }

  prometheus(): string {
    const lines: string[] = [];
    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      for (const sample of metric.samples) {
        const labelStr = Object.entries(sample.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        const labelsPart = labelStr ? `{${labelStr}}` : '';
        lines.push(`${metric.name}${labelsPart} ${sample.value}`);
      }
    }
    return lines.join('\n') + '\n';
  }

  clear(): void {
    this.metrics.clear();
  }
}

export class Counter {
  constructor(private registry: MetricsRegistry, private name: string) {}

  inc(labels: MetricLabels = {}, value = 1): void {
    this.registry.inc(this.name, labels, value);
  }
}

export class Gauge {
  constructor(private registry: MetricsRegistry, private name: string) {}

  set(labels: MetricLabels = {}, value: number): void {
    this.registry.set(this.name, labels, value);
  }

  inc(labels: MetricLabels = {}, value = 1): void {
    this.registry.inc(this.name, labels, value);
  }

  dec(labels: MetricLabels = {}, value = 1): void {
    this.registry.inc(this.name, labels, -value);
  }
}

export const defaultRegistry = new MetricsRegistry();

// Pre-defined NeuralForge metrics
export const httpRequestDuration = defaultRegistry.gauge(
  'neuralforge_http_request_duration_seconds',
  'HTTP request duration in seconds'
);

export const httpRequestsTotal = defaultRegistry.counter(
  'neuralforge_http_requests_total',
  'Total number of HTTP requests'
);

export const jobQueueSize = defaultRegistry.gauge(
  'neuralforge_job_queue_size',
  'Current number of jobs in queue'
);

export const jobExecutionsTotal = defaultRegistry.counter(
  'neuralforge_job_executions_total',
  'Total number of job executions'
);

export const jobExecutionDuration = defaultRegistry.gauge(
  'neuralforge_job_execution_duration_seconds',
  'Job execution duration in seconds'
);

export const activeProviders = defaultRegistry.gauge(
  'neuralforge_active_providers',
  'Number of active provider connections'
);

export const artifactStorageBytes = defaultRegistry.gauge(
  'neuralforge_artifact_storage_bytes',
  'Total artifact storage used in bytes'
);

export function createMetricsEndpoint(registry: MetricsRegistry = defaultRegistry): string {
  return registry.prometheus();
}

export { MetricsRegistry as default };

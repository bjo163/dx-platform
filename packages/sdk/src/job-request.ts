export interface JobRequest {
  task: string;
  provider?: string;
  projectRoot?: string;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}
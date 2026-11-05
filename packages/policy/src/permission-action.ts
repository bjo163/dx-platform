/**
 * PermissionAction enum - Defines the six core permission actions
 * that govern what a runtime agent can do within its scoped environment.
 *
 * These permissions are enforced by the Policy Engine before any tool
 * execution, ensuring least-privilege access and data boundary respect.
 *
 * @module permission-action
 */

/**
 * PermissionAction – an action an agent is allowed to perform.
 * Each value represents a distinct privilege level; the Policy Engine
 * evaluates these against tool calls and agent scopes before granting
 * or confirming execution.
 *
 * @see PolicyEngine.evaluate – the enforcement point for these actions.
 */
export enum PermissionAction {
  /** Read-only access – can view data, list resources, retrieve state. */
  READ = "read",

  /** Write/modify access – can create, update, or delete resources. */
  WRITE = "write",

  /** Execute access – can spawn processes, run commands, invoke tools. */
  EXECUTE = "execute",

  /** Network access – can make outbound HTTP/HTTPS connections, open ports. */
  NETWORK = "network",

  /** Browser access – can launch browser sessions, interact with DOM, page automation. */
  BROWSER = "browser",

  /** Secret/sensitive data access – can read/write env vars, keys, tokens, certificates. */
  SECRET = "secret",
}
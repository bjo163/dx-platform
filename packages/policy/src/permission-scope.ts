/**
 * PermissionScope contract – defines the four hierarchical scope levels
 * that govern where a permission applies within the Rocksoul DX system.
 *
 * The scope is evaluated by the Policy Engine before any tool execution
 * to ensure agents operate within their authorized boundaries.
 *
 * @module permission-scope
 */

/**
 * PermissionScope – a four-level hierarchy of authorization boundaries.
 *
 * - `project`: valid across the entire workspace/project. The broadest scope.
 * - `task`: valid within a single mission/task. Narrower than project.
 * - `tool`: valid for a specific tool/tool call only. Narrower than task.
 * - `path`: valid for a specific filesystem path only. Most granular scope.
 *
 * When a permission is checked, the Policy Engine verifies that the
 * requesting operation's scope is at least as permissive as the
 * required scope for the target tool.
 *
 * @example
 * ```typescript
 * // A tool requiring `task` scope can only be called within its owning task,
 * // not from another task or the global project scope.
 * if (permissionScope < RequiredScope.TASK) {
 *   return deny("insufficient scope");
 * }
 * ```
 */
export enum PermissionScope {
  /** Scope valid across the entire workspace/project. */
  PROJECT = "project",

  /** Scope valid within a single mission/task. */
  TASK = "task",

  /** Scope valid for a specific tool/tool call only. */
  TOOL = "tool",

  /** Scope valid for a specific filesystem path only. */
  PATH = "path",
}
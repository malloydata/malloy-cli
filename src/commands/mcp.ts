/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {runMcpServer, McpServerOptions} from '../mcp/server';

/**
 * Run the CLI as a stdio-based MCP server. stdout is reserved for JSON-RPC
 * frames; the preAction hook in cli.ts has already routed logging to stderr
 * and silenced `out()` for this subcommand.
 *
 * With `restricted`, the server publishes only the curated models under the
 * `-p DIR` project dir and accepts restricted query text against them — no
 * arbitrary file access or SQL escape hatches.
 */
export async function mcpCommand(opts: McpServerOptions = {}): Promise<void> {
  await runMcpServer(opts);
}

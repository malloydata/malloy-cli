/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {runMcpServer} from '../mcp/server';

/**
 * Run the CLI as a stdio-based MCP server. stdout is reserved for JSON-RPC
 * frames; the preAction hook in cli.ts has already routed logging to stderr
 * and silenced `out()` for this subcommand.
 */
export async function mcpCommand(options: {
  keepAlive?: boolean;
}): Promise<void> {
  await runMcpServer({keepAlive: options.keepAlive ?? false});
}

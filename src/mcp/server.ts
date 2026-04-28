/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod';
import {compile, listRuns} from './compile';
import {run} from './run';
import {listTopics, getTopic} from './help';
import {loadSkills, skillsDir} from './skills';
import {prettifyMalloy} from '../malloy/prettify';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

const expandSchema = z
  .enum(['ref', 'inline'])
  .optional()
  .describe(
    "How to render joins in the model output. 'ref' (default) references " +
      "joined sources by name via `source_ref`. 'inline' recursively " +
      'inlines the joined source schema (larger output, useful when the ' +
      'client cannot cross-reference).'
  );

const emitRunSqlSchema = z
  .boolean()
  .optional()
  .describe(
    'If true, compile each run: statement to SQL and include it as ' +
      '`model.runs[].sql`. Default false because run SQL is typically ' +
      'large and is not needed while inspecting the schema. Use run_file ' +
      'to execute a run: and get both SQL and rows.'
  );

const uriSchema = z
  .string()
  .describe(
    'File URI (file://...) or bare filesystem path. Relative paths resolve ' +
      "against the server's working directory."
  );

const sourceSchema = z.string().describe('Malloy source code.');

const baseUriSchema = z
  .string()
  .optional()
  .describe(
    'Optional URI used to resolve relative imports in the inline source. ' +
      'Typically the file:// URI of the file the snippet will live next to. ' +
      'If omitted, imports must be absolute.'
  );

function toContent(result: unknown) {
  return {
    content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
    structuredContent: result as {[k: string]: unknown},
  };
}

const SERVER_INSTRUCTIONS = `
This server lets an agent inspect, author, and execute Malloy semantic models.

Malloy (.malloy) files are NOT plain text you should read for comprehension.
They compile to a structured semantic model. Reading them as text tells you
the syntax; compiling them tells you what sources, measures, views, and
joins actually exist and how they relate. Always prefer \`compile_file\`
(or \`compile\` for an inline draft) over reading a .malloy file with a
generic text tool.

Typical workflows:

- "What's in this .malloy file?" / "What can I ask of this model?"
    → call \`compile_file\` on the file. Inspect \`model.sources\`, \`.queries\`,
      \`.runs\`. Do not read the file as text.
- "Answer this data question using file X" / "Write a query that does Y"
    → \`compile_file\` on X to see available fields, then draft
      \`import "X" + run: ...\`, iterate with \`compile\` until clean,
      execute with \`run\`.
- "Run the query named Z in file X" / "Run the first run: in file X"
    → \`run_file\` with \`name\` or \`index\`.
- "Just list what I can run in this file"
    → \`list_runs\` (cheaper than \`compile_file\`).

All tools return a uniform \`problems[]\` shape on failure with line/column
positions. The compiler is the ground truth — iterate on its feedback
rather than guessing syntax.

When you need Malloy syntax (pipeline stages, reduction vs projection,
aggregate locality, calculations/window functions, filtered aggregates,
pick expressions, time ranges, tags/annotations), call
\`language_help(topic)\` before guessing. Call it again after any compile
error whose fix is not obvious from the message — problem entries carry
a \`help_topic\` field when there's a natural match.
`.trim();

export async function runMcpServer(): Promise<void> {
  const server = new McpServer(
    {
      name: 'malloy-cli',
      version: pkg.version ?? 'development',
    },
    {instructions: SERVER_INSTRUCTIONS}
  );

  // ------------------------------------------------------------------
  // compile_file — fetch and compile a .malloy file by URI.
  // ------------------------------------------------------------------
  server.registerTool(
    'compile_file',
    {
      title: 'Inspect a Malloy file (compile)',
      description:
        'PREFER THIS OVER READING A .malloy FILE AS TEXT. ' +
        'Compile a .malloy file at the given URI and return the full ' +
        'structured model: sources (with dimensions, measures, views, ' +
        'joins), named queries, top-level run: statements with their SQL, ' +
        'and annotations. This is the primary way to understand what is in ' +
        'a .malloy file — what data sources it defines, what can be queried, ' +
        'what the schema looks like — whether you are about to edit it, ' +
        'answer a question with it, or just explore it. Reading the file as ' +
        'text shows you syntax; compiling it shows you semantics. ' +
        'Joins to named sources render by reference via `source_ref` ' +
        '(look up the referenced source by name in the same response); pass ' +
        "`expand: 'inline'` to get recursive inlined fields instead.",
      inputSchema: {
        uri: uriSchema,
        expand: expandSchema,
        emit_run_sql: emitRunSqlSchema,
      },
    },
    async ({uri, expand, emit_run_sql}) =>
      toContent(await compile({uri}, {expand, emitRunSql: emit_run_sql}))
  );

  // ------------------------------------------------------------------
  // compile — compile an inline source string.
  // ------------------------------------------------------------------
  server.registerTool(
    'compile',
    {
      title: 'Compile an inline Malloy source string',
      description:
        'Compile a Malloy source string (not backed by a file). Same output ' +
        'shape as compile_file. Use this when drafting new Malloy — the ' +
        'common pattern is `import "file.malloy"` + a new `run: ...`, which ' +
        'you iterate on against the `problems[]` feedback until clean. ' +
        'The compiler is ground truth; do not guess syntax. When in doubt ' +
        'about what fields / measures / views exist in the imported file, ' +
        'call compile_file on it first.',
      inputSchema: {
        source: sourceSchema,
        base_uri: baseUriSchema,
        expand: expandSchema,
        emit_run_sql: emitRunSqlSchema,
      },
    },
    async ({source, base_uri, expand, emit_run_sql}) =>
      toContent(
        await compile(
          {source, baseUri: base_uri},
          {expand, emitRunSql: emit_run_sql}
        )
      )
  );

  // ------------------------------------------------------------------
  // run_file — execute one run: from a file.
  // ------------------------------------------------------------------
  server.registerTool(
    'run_file',
    {
      title: 'Execute a run: from a Malloy file',
      description:
        'Execute one run: or named query from a .malloy file against the ' +
        "user's configured connections. Selection: `name` wins if provided, " +
        'else `index` (0-based into run: statements), else the final run:. ' +
        'Returns the generated SQL and the first 200 rows.',
      inputSchema: {
        uri: uriSchema,
        name: z
          .string()
          .optional()
          .describe(
            'Name of a `query:` definition to execute. Wins over `index`.'
          ),
        index: z
          .number()
          .int()
          .optional()
          .describe('0-based index into run: statements.'),
      },
    },
    async ({uri, name, index}) => toContent(await run({uri}, {name, index}))
  );

  // ------------------------------------------------------------------
  // run — execute the final run: in an inline source string.
  // ------------------------------------------------------------------
  server.registerTool(
    'run',
    {
      title: 'Execute inline Malloy source',
      description:
        'Compile an inline Malloy source and execute its final run: ' +
        "statement against the user's configured connections. Returns the " +
        'generated SQL and the first 200 rows. Use this after compile is ' +
        'clean to see the answer.',
      inputSchema: {source: sourceSchema, base_uri: baseUriSchema},
    },
    async ({source, base_uri}) =>
      toContent(await run({source, baseUri: base_uri}))
  );

  // ------------------------------------------------------------------
  // prettify — reformat a Malloy source string.
  // ------------------------------------------------------------------
  server.registerTool(
    'prettify',
    {
      title: 'Pretty-print Malloy source',
      description:
        'Reformat a Malloy source string. Returns the formatted source and ' +
        'any parse errors (lexer + parser only — semantic errors are not ' +
        'checked here; use `compile` for that). When `errors` is non-empty ' +
        'the formatted output is best-effort and may not round-trip; fix the ' +
        'parse errors first. Useful for cleaning up freshly-authored or ' +
        'machine-generated Malloy before saving.',
      inputSchema: {source: sourceSchema},
    },
    async ({source}) => toContent(prettifyMalloy(source))
  );

  // ------------------------------------------------------------------
  // language_help — topic-indexed slice of the Malloy language reference.
  // ------------------------------------------------------------------
  server.registerTool(
    'language_help',
    {
      title: 'Malloy language reference (by topic)',
      description:
        'Look up a section of the Malloy language reference by topic slug ' +
        'or title. Call this before guessing syntax — especially for ' +
        'pipelines, reduction vs projection, aggregate locality, ' +
        'calculations/window functions, filtered aggregates, pick ' +
        'expressions, time ranges, tags/annotations. Also call this after ' +
        'any compile error whose fix is not obvious from the message — ' +
        "problems[] entries carry a `help_topic` field when there's a " +
        'natural match. Call with no topic to list the available topics.',
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe(
            'Topic slug or title to look up (case-insensitive; substrings ' +
              'match). Omit to list all available topics.'
          ),
      },
    },
    async ({topic}) => {
      if (!topic) {
        return toContent({topics: listTopics()});
      }
      const hit = getTopic(topic);
      if (!hit) {
        return toContent({
          error: `No topic matches '${topic}'.`,
          topics: listTopics(),
        });
      }
      return toContent({
        slug: hit.slug,
        title: hit.title,
        body: hit.body,
      });
    }
  );

  // ------------------------------------------------------------------
  // list_runs — cheap discovery.
  // ------------------------------------------------------------------
  server.registerTool(
    'list_runs',
    {
      title: 'List runnable queries in a Malloy file',
      description:
        'Lightweight discovery: return the runnable run: statements (with ' +
        'optional names and indexes) and named `query:` definitions in a ' +
        'file, without serializing the full model. Use this when you only ' +
        'need to know what can be executed; if you need to understand the ' +
        'schema (sources, measures, views, joins), use compile_file instead.',
      inputSchema: {uri: uriSchema},
    },
    async ({uri}) => toContent(await listRuns({uri}))
  );

  // ------------------------------------------------------------------
  // Skills: language-reference prompts + resources, no NL→Malloy tool.
  // ------------------------------------------------------------------
  const skills = loadSkills(skillsDir());
  for (const skill of skills) {
    server.registerPrompt(
      skill.name,
      {title: skill.name, description: skill.description},
      () => ({
        messages: [{role: 'user', content: {type: 'text', text: skill.body}}],
      })
    );
    server.registerResource(
      skill.name,
      `malloy-skill://${skill.name}`,
      {
        title: skill.name,
        description: skill.description,
        mimeType: 'text/markdown',
      },
      async uri => ({
        contents: [
          {uri: uri.href, mimeType: 'text/markdown', text: skill.body},
        ],
      })
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {
  Runtime,
  MalloyError,
  URLReader,
  Model,
  LogMessage,
} from '@malloydata/malloy';
import {malloyConfig} from '../config';
import {helpTopicForCode} from './help';

/**
 * Input to every compile/run operation. Exactly one of `uri` or `source`
 * must be present. For `source`, `baseUri` (if provided) is used to resolve
 * relative imports; otherwise imports must be absolute file:// URIs.
 */
export interface SourceInput {
  uri?: string;
  source?: string;
  baseUri?: string;
}

/** Uniform problem shape used by every tool response. */
export interface Problem {
  severity: 'error' | 'warn' | 'debug';
  message: string;
  code: string;
  uri?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  /**
   * When the error code maps to a known section of the language reference,
   * the topic slug that the client should fetch via `language_help(topic)`.
   */
  help_topic?: string;
}

export interface LoadedModel {
  model: Model;
  /** The URL the model was loaded from (virtual for inline sources). */
  rootUrl: URL;
  /** The runtime used to load the model, for callers that need to execute. */
  runtime: Runtime;
  /**
   * Reads back source text by URL — used by callers that need to slice
   * view/query bodies out of the original file. Returns undefined if the
   * URL can't be read (e.g., a remote URI not cached).
   */
  readSource: (urlHref: string) => string | undefined;
}

export interface LoadResult {
  ok: boolean;
  loaded?: LoadedModel;
  problems: Problem[];
}

const VIRTUAL_BASE = 'memory://mcp/';

function normalizeUri(u: string): URL {
  // Accept bare filesystem paths for convenience; convert to file:// URLs.
  if (u.startsWith('file://') || u.includes('://')) return new URL(u);
  return url.pathToFileURL(path.resolve(u));
}

function inlineVirtualUrl(baseUri?: string): URL {
  // Root URL for inline sources. If the caller gave a baseUri, honor it so
  // relative imports resolve the way they would in a real file. Otherwise
  // use a purely virtual URL; relative imports in that case will fail with
  // a clear error (as they should — there's nothing to be relative to).
  if (baseUri) {
    return new URL('__inline__.malloy', normalizeUri(baseUri));
  }
  return new URL(VIRTUAL_BASE + '__inline__.malloy');
}

interface CachingReader {
  urlReader: URLReader;
  readSource: (urlHref: string) => string | undefined;
}

function makeReader(rootUrl: URL, inlineSource?: string): CachingReader {
  const cache = new Map<string, string>();
  if (inlineSource !== undefined) cache.set(rootUrl.href, inlineSource);

  const urlReader: URLReader = {
    readURL: async (u: URL) => {
      const cached = cache.get(u.href);
      if (cached !== undefined) return cached;
      if (u.protocol === 'file:') {
        const text = fs.readFileSync(url.fileURLToPath(u), 'utf8');
        cache.set(u.href, text);
        return text;
      }
      throw new Error(`Unsupported URI scheme for import: ${u.href}`);
    },
  };
  return {urlReader, readSource: href => cache.get(href)};
}

export function mapProblems(problems: LogMessage[]): Problem[] {
  return problems.map(p => {
    const out: Problem = {
      severity: p.severity,
      message: p.message,
      code: p.code,
      uri: p.at?.url,
      line: p.at?.range.start.line,
      column: p.at?.range.start.character,
      endLine: p.at?.range.end.line,
      endColumn: p.at?.range.end.character,
    };
    const topic = helpTopicForCode(p.code);
    if (topic) out.help_topic = topic;
    return out;
  });
}

export function errorProblem(e: unknown, uri?: string): Problem {
  return {
    severity: 'error',
    message: e instanceof Error ? e.message : String(e),
    code: 'internal-error',
    uri,
  };
}

/**
 * Load and compile a Malloy model from either a file URI or an inline source
 * string. Returns the loaded Model plus the root URL it was loaded from (so
 * callers can distinguish "local to this file" from "imported").
 */
export async function loadModel(input: SourceInput): Promise<LoadResult> {
  if (
    (input.uri && input.source) ||
    (!input.uri && input.source === undefined)
  ) {
    return {
      ok: false,
      problems: [
        {
          severity: 'error',
          code: 'bad-input',
          message: 'Exactly one of {uri, source} must be provided.',
        },
      ],
    };
  }

  const rootUrl = input.uri
    ? normalizeUri(input.uri)
    : inlineVirtualUrl(input.baseUri);
  const {urlReader, readSource} = makeReader(rootUrl, input.source);
  const runtime = new Runtime({config: malloyConfig, urlReader});

  try {
    const model = await runtime.loadModel(rootUrl).getModel();
    return {
      ok: true,
      loaded: {model, rootUrl, runtime, readSource},
      problems: mapProblems(model.problems),
    };
  } catch (e) {
    if (e instanceof MalloyError) {
      return {ok: false, problems: mapProblems(e.problems)};
    }
    return {ok: false, problems: [errorProblem(e, rootUrl.href)]};
  }
}

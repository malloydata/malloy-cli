/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'node:fs';
import path from 'node:path';
import {skillsDir} from './skills';

export interface HelpTopic {
  slug: string;
  title: string;
  body: string;
}

let cachedIndex: HelpTopic[] | null = null;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse the bundled Malloy language reference into top-level sections keyed
 * by slug (derived from the ## heading). The first section (everything
 * before any ## heading) is indexed as "overview".
 */
function loadIndex(): HelpTopic[] {
  if (cachedIndex) return cachedIndex;
  const refPath = path.join(skillsDir(), 'malloy-language-reference.md');
  const text = fs.existsSync(refPath) ? fs.readFileSync(refPath, 'utf8') : '';
  const topics: HelpTopic[] = [];

  const lines = text.split('\n');
  let current: HelpTopic | null = {
    slug: 'overview',
    title: 'Overview',
    body: '',
  };
  const bodyLines: string[] = [];

  const flush = () => {
    if (!current) return;
    current.body = bodyLines.join('\n').trim();
    if (current.body) topics.push(current);
    bodyLines.length = 0;
  };

  for (const line of lines) {
    const m = /^## (?!# )(.+)$/.exec(line); // ## but not ###
    if (m) {
      flush();
      const title = m[1].trim();
      current = {slug: slugify(title), title, body: ''};
      continue;
    }
    // Skip the frontmatter
    if (line.startsWith('---')) continue;
    bodyLines.push(line);
  }
  flush();

  cachedIndex = topics;
  return topics;
}

export function listTopics(): Array<{slug: string; title: string}> {
  return loadIndex().map(t => ({slug: t.slug, title: t.title}));
}

/**
 * Look up a topic by slug or title. Matching is case-insensitive; if an
 * exact slug or title match isn't found we fall back to substring matching
 * against the title. Returns the full section body.
 */
export function getTopic(query: string): HelpTopic | undefined {
  const index = loadIndex();
  const q = query.toLowerCase().trim();
  // Exact slug match
  let hit = index.find(t => t.slug === q);
  if (hit) return hit;
  // Exact title match (case-insensitive)
  hit = index.find(t => t.title.toLowerCase() === q);
  if (hit) return hit;
  // Substring match on title or slug
  hit = index.find(
    t => t.title.toLowerCase().includes(q) || t.slug.includes(q)
  );
  return hit;
}

/**
 * Map common compiler error codes to a help topic slug. Used to decorate
 * problems[] so errors tell the caller which doc section to pull.
 */
const ERROR_TOPIC_MAP: Record<string, string> = {
  'field-not-found': 'fields',
  'aggregate-in-calculate': 'expressions',
  'not-an-aggregate': 'fields',
  'mixed-reduction-projection': 'queries-and-views',
  'calculation-in-source': 'fields',
  'missing-aggregate-locality': 'aggregate-locality-symmetric-aggregates',
  'asymmetric-aggregate-needs-locality':
    'aggregate-locality-symmetric-aggregates',
};

export function helpTopicForCode(code: string): string | undefined {
  return ERROR_TOPIC_MAP[code];
}

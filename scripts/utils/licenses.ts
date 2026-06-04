/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable no-console */
import fs from 'fs';

export interface NpmPackage {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  homepage?: string;
  license?: string;
  repo?: string;
  repository?: {
    baseUrl?: string;
    url?: string;
  };
  version?: string;
}

export function readPackageJson(path: string): NpmPackage {
  try {
    const fileBuffer = fs.readFileSync(path, 'utf8');
    return JSON.parse(fileBuffer);
  } catch (error) {
    console.warn(
      'Could not read package.json',
      error instanceof Error ? error.message : `${error}`
    );
  }
  return {};
}

export function getDependencies(rootPackageJson: string): string[] {
  const rootPackage = readPackageJson(rootPackageJson);
  return Object.keys(rootPackage.dependencies || {}) || [];
}

export function getDevDependencies(rootPackageJson: string): string[] {
  const rootPackage = readPackageJson(rootPackageJson);
  return Object.keys(rootPackage.devDependencies || {}) || [];
}

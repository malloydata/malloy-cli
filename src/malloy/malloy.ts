/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import {
  ModelMaterializer,
  QueryMaterializer,
  Runtime,
} from '@malloydata/malloy';
import url from 'node:url';
import {malloyConfig, urlReader} from '../config';
import {
  DEFAULT_ROW_LIMIT,
  QueryOptionsType,
  RunOrCompileOptions,
  StandardOutputType,
  getFilteredResultsLogger,
} from './util';
import {errorMessage, withDuckdbLockRetry} from '../util';

export async function runMalloy(
  filePath: string,
  options: RunOrCompileOptions
) {
  const resultsLog = getFilteredResultsLogger(
    options.json
      ? 'json'
      : [
          StandardOutputType.Malloy,
          StandardOutputType.CompiledSQL,
          StandardOutputType.Results,
          StandardOutputType.Tasks,
        ]
  );
  const json = JSON.parse('{}');

  const fileURL = url.pathToFileURL(filePath);

  try {
    return await withDuckdbLockRetry(async () => {
      const malloyRuntime = new Runtime({
        config: malloyConfig,
        urlReader,
      });

      const modelMaterializer: ModelMaterializer =
        malloyRuntime.loadModel(fileURL);

      let query: QueryMaterializer;
      if (options.queryOptions) {
        switch (options.queryOptions.type) {
          case QueryOptionsType.Index:
            query = modelMaterializer.loadQueryByIndex(
              options.queryOptions.index
            );
            break;
          case QueryOptionsType.Name:
            query = modelMaterializer.loadQueryByName(
              options.queryOptions.name
            );
            break;
          case QueryOptionsType.String:
            query = modelMaterializer.loadQuery(
              `run: ${options.queryOptions.query}`
            );
            break;
        }
      } else {
        // No query specified: default to the model's final query. A model
        // with no queries at all isn't an error — compiling it still
        // validates the model, and running it simply has nothing to do.
        const model = await modelMaterializer.getModel();
        const {named, unnamed} = model.queries();
        if (named.length + unnamed === 0) {
          if (options.compileOnly) {
            // Compiling validates the model; with nothing to run that's a
            // clean success.
            resultsLog.malloy(
              'Model compiled successfully (no queries to compile).'
            );
            return JSON.stringify(json);
          }
          // Asking to run a model with nothing to run is an error: report it
          // to stderr and exit non-zero.
          resultsLog.error('Nothing to run: this model has no queries.');
        }
        query = modelMaterializer.loadFinalQuery();
      }

      const givensOpt = options.givens ? {givens: options.givens} : {};
      const sql = await query.getSQL(givensOpt);
      json['sql'] = sql.trim();

      if (options.compileOnly) {
        resultsLog.sql('Compiled SQL:');
        resultsLog.sql(sql);

        return JSON.stringify(json);
      }

      const rowLimit = options.rowLimit ?? DEFAULT_ROW_LIMIT;
      const results = await query.run({rowLimit, ...givensOpt});
      const rows = results.toJSON().queryResult.result;
      if (rows.length === rowLimit) {
        resultsLog.result(`WARNING: Results truncated to ${rowLimit} results.`);
      }
      resultsLog.result(JSON.stringify(rows, null, 2));
      json['results'] = JSON.stringify(rows);

      return JSON.stringify(json);
    });
  } catch (e) {
    resultsLog.error(errorMessage(e));
  }
}

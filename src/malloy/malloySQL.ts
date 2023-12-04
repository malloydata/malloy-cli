/*
 * Copyright 2023 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import url, {fileURLToPath as fileURLToPath} from 'node:url';
import fs from 'fs';
import {ModelMaterializer, Runtime, URLReader} from '@malloydata/malloy';
import {loadFile} from '../util';
import {MalloySQLParser, MalloySQLStatementType} from '@malloydata/malloy-sql';
import {connectionManager} from '../connections/connection_manager';
import {
  QueryOptionsType,
  RunOrCompileOptions,
  StandardOutputType,
  getFilteredResultsLogger,
} from './util';

class VirtualURIFileHandler implements URLReader {
  private uriReader: URLReader;
  private url: URL;
  private contents: string;

  constructor(uriReader: URLReader) {
    this.uriReader = uriReader;
  }

  public setVirtualFile(url: URL, contents: string): void {
    this.url = url;
    this.contents = contents;
  }

  async readURL(uri: URL): Promise<string> {
    if (uri.toString() === this.url.toString()) {
      return this.contents;
    } else {
      const contents = await this.uriReader.readURL(uri);
      return contents;
    }
  }
}

export async function runMalloySQL(
  filePath: string,
  options: RunOrCompileOptions
): Promise<string> {
  const contents = loadFile(filePath);

  const compileOnly = options.compileOnly;
  const statementIndex =
    options.queryOptions && options.queryOptions.type === QueryOptionsType.Index
      ? options.queryOptions.index
      : null;
  const json = {};
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

  if (
    options.queryOptions &&
    options.queryOptions.type === QueryOptionsType.Name
  ) {
    resultsLog.error('--name and .malloysql are not compatible');
  }

  try {
    const parse = MalloySQLParser.parse(contents);
    if (parse.errors.length > 0) {
      resultsLog.error(
        `Parse errors encountered: ${parse.errors
          .map(parseError => parseError.message)
          .join('\n')}`
      );
    }
    const statements = parse.statements;

    if (statementIndex !== null) {
      resultsLog.task(
        `Running malloysql query from ${filePath} at statement index: ${statementIndex}`
      );

      if (statementIndex === 0)
        resultsLog.error(
          'Statement indexes are 1-based - did you mean to use 1 instead of 0?'
        );

      if (statementIndex > statements.length) {
        resultsLog.error(
          `Statement index ${statementIndex} is greater than number of possible statements ${statements.length}`
        );
      }
    } else resultsLog.task(`Running malloysql file: ${filePath}`);

    const fileURL = url.pathToFileURL(filePath);

    const virturlURIFileHandler = new VirtualURIFileHandler({
      readURL: async (url: URL) => {
        return fs.readFileSync(fileURLToPath(url), 'utf8');
      },
    });

    const malloyRuntime = new Runtime(
      virturlURIFileHandler,
      connectionManager.getConnectionLookup(fileURL)
    );
    let modelMaterializer: ModelMaterializer;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      json[`statement_${i}`] = {};

      // don't evaluate SQL statements if statmentIndex passed unless we're on
      // the exact index
      if (
        statement.type === MalloySQLStatementType.SQL &&
        statementIndex !== null &&
        statementIndex !== i
      ) {
        resultsLog.task(`Skipping statment: ${i}`);
        continue;
      }

      let compiledStatement = statement.text;
      const connectionLookup = connectionManager.getConnectionLookup(fileURL);

      resultsLog.task(`Running statment: ${i + 1}`);

      if (statement.type === MalloySQLStatementType.MALLOY) {
        virturlURIFileHandler.setVirtualFile(fileURL, statement.text);

        try {
          if (!modelMaterializer) {
            modelMaterializer = malloyRuntime.loadModel(fileURL);
          } else {
            modelMaterializer.extendModel(fileURL);
          }

          const _model = modelMaterializer.getModel();

          resultsLog.malloy('Compiling Malloy:');
          resultsLog.malloy(statement.text);

          // the only way to know if there's a query in this statement is to try
          // to run query by index and catch if it fails.

          try {
            const finalQuery = modelMaterializer.loadQuery(fileURL);
            const finalQuerySQL = await finalQuery.getSQL();

            if (compileOnly) {
              resultsLog.sql('Compiled SQL:');
              resultsLog.sql(finalQuerySQL.trim());
            } else {
              resultsLog.task('Running Malloy');

              const results = await finalQuery.run();

              if (results) {
                resultsLog.result('Results:');
                // TODO console.table?
              }
            }
          } catch (e) {
            // nothing to do here - there isn't a query to run
          }
        } catch (e) {
          resultsLog.error(e.message);
        }
      } else if (statement.type === MalloySQLStatementType.SQL) {
        for (const malloyQuery of statement.embeddedMalloyQueries) {
          try {
            resultsLog.malloy('Compiling Malloy:');
            resultsLog.malloy(malloyQuery.query);

            // TODO assumes modelMaterializer exists, because >>>malloy always happens before >>>sql with embedded malloy
            const runnable = modelMaterializer.loadQuery(
              `\nrun: ${malloyQuery.query}`
            );
            const generatedSQL = await runnable.getSQL();

            compiledStatement = compiledStatement.replace(
              malloyQuery.text,
              `(${generatedSQL})`
            );
          } catch (e) {
            resultsLog.error(e.message);
          }
        }

        json[`statement_${i}`]['sql'] = compiledStatement.trim();

        if (compileOnly) {
          resultsLog.sql('Compiled SQL:');
          resultsLog.sql(compiledStatement.trim());

          return JSON.stringify(json);
        } else {
          try {
            const connection = await connectionLookup.lookupConnection(
              statement.config.connection
            );

            resultsLog.sql('Executing SQL:');
            resultsLog.sql(compiledStatement);

            const sqlResults = await connection.runSQL(compiledStatement);

            if (sqlResults) {
              resultsLog.task('Results:');

              if (sqlResults.rows.length === 0) {
                resultsLog.result(
                  'Statement successfully completed with no results'
                );
                json[`statement_${i}`]['results'] = undefined;
              } else {
                resultsLog.result(JSON.stringify(sqlResults.rows, null, 2));
                json[`statement_${i}`]['results'] = sqlResults.rows;
              }
            }
          } catch (e) {
            resultsLog.error(e.message);
          }
        }
      }
      if (i === statementIndex) break;
    }
  } catch (e) {
    resultsLog.error(e.message);
  }

  resultsLog.json(JSON.stringify(json, null, 2));
  return JSON.stringify(json);
}

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
import {exitWithError, loadFile} from '../util';
import {MalloySQLParser, MalloySQLStatementType} from '@malloydata/malloy-sql';
import {connectionManager} from '../connections/connection_manager';
import {FormatType, StandardOutputType} from '../commands/run';
import {getResultsLogger as getFilteredResultsLogger} from './util';

// options:
// compileOnly
// abortOnExecutionError
// silent
// truncateResults

// default logging - output statment index
// optionally - results
// optionally - SQL to be executed

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
  statementIndex = null,
  compileOnly = false,
  format: FormatType,
  output: StandardOutputType[] = []
) {
  const contents = loadFile(filePath);
  const json = {};
  const resultsLog = getFilteredResultsLogger(
    format === FormatType.JSON
      ? 'json'
      : output.includes(StandardOutputType.All)
      ? [
          StandardOutputType.Malloy,
          StandardOutputType.CompiledSQL,
          StandardOutputType.Results,
          StandardOutputType.Tasks,
        ]
      : output
  );

  if (statementIndex) {
    resultsLog.logTasks(
      `Running malloysql query from ${filePath} at statement index: ${statementIndex}`
    );
  } else resultsLog.logTasks(`Running malloysql file: ${filePath}`);

  let modelMaterializer: ModelMaterializer;

  try {
    const parse = MalloySQLParser.parse(contents);
    if (parse.errors.length > 0) {
      exitWithError(
        `Parse errors encountered: ${parse.errors
          .map(parseError => parseError.message)
          .join('\n')}`
      );
    }
    const statements = parse.statements;

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

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // don't evaluate SQL statements if statmentIndex passed unless we're on
      // the exact index
      if (
        statement.type === MalloySQLStatementType.SQL &&
        statementIndex !== null &&
        statementIndex !== i
      ) {
        resultsLog.logTasks(`Skipping statment: ${i}`);
        continue;
      }

      let compiledStatement = statement.text;
      const connectionLookup = connectionManager.getConnectionLookup(fileURL);

      resultsLog.logTasks(`Running statment: ${i + 1}`);

      if (statement.type === MalloySQLStatementType.MALLOY) {
        virturlURIFileHandler.setVirtualFile(fileURL, statement.text);

        try {
          if (!modelMaterializer) {
            modelMaterializer = malloyRuntime.loadModel(fileURL);
          } else {
            modelMaterializer.extendModel(fileURL);
          }

          const _model = modelMaterializer.getModel();

          resultsLog.logMalloy('Compiling Malloy:');
          resultsLog.logMalloy(statement.text);

          // the only way to know if there's a query in this statement is to try
          // to run query by index and catch if it fails.

          try {
            const finalQuery = modelMaterializer.loadQuery(fileURL);
            const finalQuerySQL = await finalQuery.getSQL();

            if (compileOnly) {
              if (format === FormatType.JSON && finalQuerySQL) {
                format[`statement_${i}`] = finalQuerySQL;
              }

              resultsLog.logSQL('Compiled SQL:');
              resultsLog.logSQL(finalQuerySQL);
            } else {
              resultsLog.logTasks('Running Malloy');

              const results = await finalQuery.run();

              if (results) {
                resultsLog.logResults('Results:');
                // TODO console.table?
              }
            }
          } catch (e) {
            // nothing to do here - there isn't a query to run
          }
        } catch (e) {
          exitWithError(e.message);
        }
      } else if (statement.type === MalloySQLStatementType.SQL) {
        for (const malloyQuery of statement.embeddedMalloyQueries) {
          try {
            resultsLog.logMalloy('Compiling Malloy:');
            resultsLog.logMalloy(malloyQuery.query);

            // TODO assumes modelMaterializer exists, because >>>malloy always happens before >>>sql with embedded malloy
            const runnable = modelMaterializer.loadQuery(
              `\nquery: ${malloyQuery.query}`
            );
            const generatedSQL = await runnable.getSQL();

            compiledStatement = compiledStatement.replace(
              malloyQuery.text,
              `(${generatedSQL})`
            );
          } catch (e) {
            exitWithError(e.message);
          }
        }

        resultsLog.logSQL('Compiled SQL:');
        resultsLog.logSQL(compiledStatement);

        if (compileOnly) {
          json[`statement_${i}`] = compiledStatement;
        } else {
          try {
            const connection = await connectionLookup.lookupConnection(
              statement.config.connection
            );

            resultsLog.logTasks(`Executing SQL: ${compiledStatement}`);

            const sqlResults = await connection.runSQL(compiledStatement);

            if (sqlResults) {
              resultsLog.logTasks('Results:');

              if (sqlResults.rows.length === 0) {
                resultsLog.logResults(
                  'Statement successfully completed with no results'
                );
              } else {
                // TODO
                // resultsLog.logResults(sqlResults.rows);
              }
            }
          } catch (e) {
            exitWithError(e.message);
          }
        }
      }
      if (i === statementIndex) break;
    }
  } catch (e) {
    exitWithError(e.message);
  }

  resultsLog.logJSON(JSON.stringify(json));
}

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
import {out, logger, outMalloy, outSQL, outTable} from '../log';
import {RunOutputType} from '../commands/run';

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
  output: RunOutputType[] = []
) {
  const contents = loadFile(filePath);

  const all = output.includes(RunOutputType.All);
  const outputMalloy = all ? true : output.includes(RunOutputType.Malloy);
  const outputSQL = all ? true : output.includes(RunOutputType.CompiledSQL);
  const outputResults = all ? true : output.includes(RunOutputType.Results);

  if (statementIndex) {
    logger.info(
      `Running malloysql query from ${filePath} at statement index: ${statementIndex}`
    );
  } else logger.info(`Running malloysql file: ${filePath}`);

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
        logger.info(`Skipping statment: ${i}`);
        continue;
      }

      let compiledStatement = statement.text;
      const connectionLookup = connectionManager.getConnectionLookup(fileURL);

      out(`Running statment: ${i + 1}`);
      out('');

      if (statement.type === MalloySQLStatementType.MALLOY) {
        virturlURIFileHandler.setVirtualFile(fileURL, statement.text);

        try {
          if (!modelMaterializer) {
            modelMaterializer = malloyRuntime.loadModel(fileURL);
          } else {
            modelMaterializer.extendModel(fileURL);
          }

          const _model = modelMaterializer.getModel();

          if (outputMalloy) {
            out('Compiling Malloy:');
            outMalloy(statement.text);
          }

          // the only way to know if there's a query in this statement is to try
          // to run query by index and catch if it fails.

          try {
            const finalQuery = modelMaterializer.loadQuery(fileURL);
            const finalQuerySQL = await finalQuery.getSQL();

            if (compileOnly) {
              if (outputSQL) {
                out('Compiled SQL:');
                outSQL(finalQuerySQL);
              }
            } else {
              out('Running Malloy');

              const results = await finalQuery.run();

              if (results && outputResults) {
                out('Results:');
                // TODO console.table?
                //cliOut(results.data);
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
            if (outputMalloy) {
              out('Compiling Malloy:');
              outMalloy(malloyQuery.query);
            }

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

        if (outputSQL) {
          out('Compiled SQL:');
          outSQL(compiledStatement);
        }

        if (!compileOnly) {
          try {
            const connection = await connectionLookup.lookupConnection(
              statement.config.connection
            );

            logger.debug(`Executing SQL: ${compiledStatement}`);

            const sqlResults = await connection.runSQL(compiledStatement);

            if (sqlResults && outputResults) {
              out('Results:');

              if (sqlResults.rows.length === 0) {
                out('Statement successfully completed with no results');
              } else {
                outTable(sqlResults.rows);
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
}

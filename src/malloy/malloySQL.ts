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

import url from 'node:url';
import {ModelMaterializer, Runtime} from '@malloydata/malloy';
import {exitWithError, loadFile} from '../util';
import {MalloySQLParser, MalloySQLStatementType} from '@malloydata/malloy-sql';
import {connectionManager} from '../connections/connection_manager';
import {logger} from '../log';

// options:
// compileOnly
// abortOnExecutionError
// silent
// truncateResults

export async function runMalloySQL(
  filePath: string,
  statementIndex = null,
  compileOnly = false
) {
  const contents = loadFile(filePath);

  if (statementIndex) {
    logger.debug(
      `Running malloysql query from ${filePath} at statement index: ${statementIndex}`
    );
  } else logger.debug(`Running malloysql file: ${filePath}`);

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
    const malloyRuntime = new Runtime(
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
      )
        continue;

      let compiledStatement = statement.text;

      const connectionLookup = connectionManager.getConnectionLookup(fileURL);

      if (statement.type === MalloySQLStatementType.MALLOY) {
        try {
          if (!modelMaterializer) {
            modelMaterializer = malloyRuntime.loadModel(fileURL);
          } else {
            modelMaterializer.extendModel(fileURL);
          }

          const _model = modelMaterializer.getModel();

          // the only way to know if there's a query in this statement is to try
          // to run query by index and catch if it fails.

          const finalQuery = modelMaterializer.loadQuery(fileURL);
          const finalQuerySQL = await finalQuery.getSQL();

          if (compileOnly) {
            // TODO
          } else {
            try {
              const results = await finalQuery.run();
              // TODO deal with results
            } catch (e) {
              exitWithError(e.message);
            }
          }
        } catch (e) {
          exitWithError(e.message);
        }
      } else if (statement.type === MalloySQLStatementType.SQL) {
        for (const malloyQuery of statement.embeddedMalloyQueries) {
          try {
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

        if (!compileOnly) {
          try {
            const connection = await connectionLookup.lookupConnection(
              statement.config.connection
            );

            // TODO different meta
            logger.debug(`Executing SQL: ${compiledStatement}`);

            const sqlResults = await connection.runSQL(compiledStatement);
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

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

import {ModelMaterializer, Runtime} from '@malloydata/malloy';
import {loadFile} from '../util';
import {MalloySQLParser, MalloySQLStatementType} from '@malloydata/malloy-sql';

// options:
// compileOnly
// abortOnExecutionError
// silent
// truncateResults

export async function runMalloySQL(
  filePath,
  statementIndex = null,
  compileOnly = false
) {
  const abortOnExecutionError = true;
  const contents = loadFile(filePath);
  /*
  let modelMaterializer: ModelMaterializer;

  try {
    const parse = MalloySQLParser.parse(contents);
    if (parse.errors.length > 0) {
      // TODO
      return;
    }
    const statements = parse.statements;
    const malloyRuntime = new Runtime();

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
      const compileErrors = [];

      const connectionLookup = connectionManager.getConnectionLookup(url);

      if (statement.type === MalloySQLStatementType.MALLOY) {
        try {
          if (!modelMaterializer) {
            modelMaterializer = malloyRuntime.loadModel(url);
          } else {
            modelMaterializer.extendModel(url);
          }

          const _model = modelMaterializer.getModel();

          // the only way to know if there's a query in this statement is to try
          // to run query by index and catch if it fails.
          try {
            const finalQuery = modelMaterializer.loadQuery(url);
            const finalQuerySQL = await finalQuery.getSQL();

            if (compileOnly) {
              // TODO
            } else {
              try {
                const results = await finalQuery.run();
              } catch (error) {
                // TODO
                if (abortOnExecutionError) break;
              }
            }
          } catch (error) {
            // TODO this error is thrown from Model and could be improved such that we can ensure we're catching
            // what we expect here
            // if error is ThereIsNoQueryHere:
            // else if (abortOnExecutionError) break;
          }
        } catch (error) {
          // TODO
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
            compileErrors.push(e);
          }
        }

        if (compileErrors.length > 0) {
          // TODO
        } else if (!compileOnly) {
          try {
            const connection = await connectionLookup.lookupConnection(
              statement.config.connection
            );
            const sqlResults = await connection.runSQL(compiledStatement);
          } catch (error) {
            if (abortOnExecutionError) break;
          }
        }
      }
      if (i === statementIndex) break;
    }
  } catch (error) {}
  */
}

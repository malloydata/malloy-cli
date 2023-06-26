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

import fs from 'fs';
import {ModelMaterializer, Runtime} from '@malloydata/malloy';
import url, {fileURLToPath as fileURLToPath} from 'node:url';
import {connectionManager} from '../connections/connection_manager';

export async function runMalloy(filePath: string, compileOnly = false) {
  let modelMaterializer: ModelMaterializer;
  const fileURL = url.pathToFileURL(filePath);

  const malloyRuntime = new Runtime(
    {
      readURL: async (url: URL) => {
        return fs.readFileSync(fileURLToPath(url), 'utf8');
      },
    },
    connectionManager.getConnectionLookup(fileURL)
  );

  try {
    if (!modelMaterializer) {
      modelMaterializer = malloyRuntime.loadModel(fileURL);
    } else {
      modelMaterializer.extendModel(fileURL);
    }

    //const query = modelMaterializer.loadQuery(fileURL);
    //const finalQuerySQL = await finalQuery.getSQL();
  } catch (e) {
    //TODO
  }
}

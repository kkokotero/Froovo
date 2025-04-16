/*
 * Authored by Alex Hultman, 2018-2024.
 * Intellectual property of third-party.

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require("fs");
const path = require("path");

module.exports = (() => {
  const dir = __dirname;
  const filename = `uws_${process.platform}_${process.arch}_${process.versions.modules}.node`;
  const targetPath = path.join(dir, filename);

  try {
    const moduleInstance = require(`./${filename}`);

    // Eliminar los archivos .node que no sean el cargado
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith(".node") && file !== filename) {
        try {
          fs.unlinkSync(path.join(dir, file));
        } catch (err) {
          console.warn(`Could not be eliminated ${file}:`, err.message);
        }
      }
    }

    return moduleInstance;
  } catch (e) {
    throw new Error(
      `This version of uWS.js (v20.51.0) supports only Node.js versions 18, 20, 22 and 23 on (glibc) Linux, macOS and Windows, on Tier 1 platforms (https://github.com/nodejs/node/blob/master/BUILDING.md#platform-list).\n\n${e.toString()}`
    );
  }
})();


module.exports.DeclarativeResponse = class DeclarativeResponse {
  constructor() {
    this.instructions = [];
  }

  // Utility method to encode text and append instruction
  _appendInstruction(opcode, ...text) {
    this.instructions.push(opcode);
    text.forEach((str) => {
      const bytes =
        typeof str === "string" ? new TextEncoder().encode(str) : str;
      this.instructions.push(bytes.length, ...bytes);
    });
  }

  // Utility method to append 2-byte length text in little-endian format
  _appendInstructionWithLength(opcode, text) {
    this.instructions.push(opcode);
    const bytes = new TextEncoder().encode(text);
    const { length } = bytes;
    this.instructions.push(length & 0xff, (length >> 8) & 0xff, ...bytes);
  }

  writeHeader(key, value) {
    return this._appendInstruction(1, key, value), this;
  }

  writeBody() {
    return this.instructions.push(2), this;
  }

  writeQueryValue(key) {
    return this._appendInstruction(3, key), this;
  }

  writeHeaderValue(key) {
    return this._appendInstruction(4, key), this;
  }

  write(value) {
    return this._appendInstructionWithLength(5, value), this;
  }

  writeParameterValue(key) {
    return this._appendInstruction(6, key), this;
  }

  end(value) {
    const bytes = new TextEncoder().encode(value);
    const { length } = bytes;
    this.instructions.push(0, length & 0xff, (length >> 8) & 0xff, ...bytes);
    return new Uint8Array(this.instructions).buffer;
  }
};

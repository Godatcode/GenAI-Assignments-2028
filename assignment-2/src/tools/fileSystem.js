import fs from "node:fs";
import path from "node:path";

function resolve(p) {
  return path.resolve(process.cwd(), p);
}

export async function createFolder({ folderName }) {
  if (!folderName) throw new Error("createFolder: 'folderName' is required");
  const target = resolve(folderName);
  fs.mkdirSync(target, { recursive: true });
  return `Folder created: ${folderName}`;
}

export async function writeFile({ fileName, content }) {
  if (!fileName) throw new Error("writeFile: 'fileName' is required");
  if (typeof content !== "string") {
    throw new Error("writeFile: 'content' must be a string");
  }
  const target = resolve(fileName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf-8");
  return `File written: ${fileName} (${content.length} chars)`;
}

export async function readFile({ fileName }) {
  if (!fileName) throw new Error("readFile: 'fileName' is required");
  const target = resolve(fileName);
  return fs.readFileSync(target, "utf-8");
}

export async function listFiles({ folderName }) {
  if (!folderName) throw new Error("listFiles: 'folderName' is required");
  const target = resolve(folderName);
  const entries = fs.readdirSync(target);
  return JSON.stringify(entries);
}

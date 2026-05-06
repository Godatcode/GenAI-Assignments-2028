import { exec } from "node:child_process";
import path from "node:path";
import os from "node:os";

export async function openInBrowser({ filePath }) {
  if (!filePath) throw new Error("openInBrowser: 'filePath' is required");
  const absolute = path.resolve(process.cwd(), filePath);

  const platform = os.platform();
  let cmd;
  if (platform === "darwin") {
    cmd = `open "${absolute}"`;
  } else if (platform === "win32") {
    cmd = `start "" "${absolute}"`;
  } else {
    cmd = `xdg-open "${absolute}"`;
  }

  return new Promise((resolve, reject) => {
    exec(cmd, (error) => {
      if (error) {
        reject(new Error(`openInBrowser failed: ${error.message}`));
      } else {
        resolve(`Opened ${filePath} in browser`);
      }
    });
  });
}

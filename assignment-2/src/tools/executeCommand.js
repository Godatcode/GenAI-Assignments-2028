import { exec } from "node:child_process";

const MAX_OUTPUT = 5000;

// NOTE: This tool is intentionally NOT registered in the agent's tool_map
// (see src/agent.js). It is kept here for manual use or future extension.
export async function executeCommand({ command }) {
  if (!command) throw new Error("executeCommand: 'command' is required");
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`executeCommand failed: ${error.message}`));
        return;
      }
      const out = (stdout || stderr || "").toString();
      resolve(out.length > MAX_OUTPUT ? out.slice(0, MAX_OUTPUT) + "\n…[truncated]" : out);
    });
  });
}

import "dotenv/config";
import readline from "node:readline";
import { runAgent } from "./agent.js";
import { PROVIDER } from "./llm/index.js";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
};

function banner() {
  console.log(`
${C.cyan}${C.bold}╔════════════════════════════════════════════════════════════╗
║          🌐  Website Cloner Agent  (CLI)                  ║
╚════════════════════════════════════════════════════════════╝${C.reset}

${C.dim}LLM provider:${C.reset} ${C.green}${PROVIDER}${C.reset}

Type a website to clone, e.g.:
  ${C.dim}>${C.reset} Clone the Scaler Academy website
  ${C.dim}>${C.reset} Clone stripe.com
  ${C.dim}>${C.reset} Now make the hero section bigger

Commands: ${C.bold}exit${C.reset} to quit, ${C.bold}clear${C.reset} to reset the conversation.
`);
}

async function main() {
  banner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let conversationHistory = [];

  const ask = () =>
    new Promise((resolve) => rl.question(`${C.bold}you ▸${C.reset} `, resolve));

  while (true) {
    const input = (await ask()).trim();
    if (!input) continue;

    if (input.toLowerCase() === "exit") {
      console.log(`${C.dim}bye 👋${C.reset}`);
      rl.close();
      return;
    }
    if (input.toLowerCase() === "clear") {
      conversationHistory = [];
      console.log(`${C.dim}— conversation cleared —${C.reset}\n`);
      continue;
    }

    try {
      conversationHistory = await runAgent(input, conversationHistory);
    } catch (err) {
      console.error(`\n\x1b[31m✖ Agent error: ${err.message}\x1b[0m\n`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

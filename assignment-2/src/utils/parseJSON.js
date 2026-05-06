function stripFences(s) {
  let out = s.trim();
  if (out.startsWith("```")) {
    out = out.replace(/^```(?:json)?\s*\n?/i, "");
    out = out.replace(/\n?```\s*$/i, "");
    out = out.trim();
  }
  return out;
}

// Walk the string starting at `from` and return [block, endIndex] for
// the first balanced {...} block. Returns null if none found.
// Respects strings and escapes.
function findNextObject(s, from = 0) {
  const start = s.indexOf("{", from);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return [s.slice(start, i + 1), i + 1];
    }
  }
  return null;
}

// Extract every balanced JSON object from the (possibly fenced, possibly
// multi-object) string and parse them in order. Throws if zero parse.
export function extractAllParsed(rawString) {
  const cleaned = stripFences(String(rawString));
  const objects = [];
  let cursor = 0;
  while (cursor < cleaned.length) {
    const next = findNextObject(cleaned, cursor);
    if (!next) break;
    const [block, end] = next;
    try {
      objects.push(JSON.parse(block));
    } catch {
      // skip malformed block, keep looking
    }
    cursor = end;
  }
  if (objects.length === 0) {
    throw new Error("No valid JSON object found in response");
  }
  return objects;
}

export function stripAndParse(rawString) {
  const cleaned = stripFences(String(rawString));
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const next = findNextObject(cleaned, 0);
    if (next) return JSON.parse(next[0]);
    throw e;
  }
}

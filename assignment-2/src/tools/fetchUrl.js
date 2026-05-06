const MAX_CHARS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function clean(html) {
  // Drop tags whose content is noise for cloning
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Drop most attributes — keep only href/src/alt/class so the agent
  // can still see nav structure, images, and section identifiers.
  s = s.replace(/<([a-zA-Z][\w-]*)\s+([^>]*)>/g, (_, tag, attrs) => {
    const keep = [];
    const re = /(href|src|alt|class)\s*=\s*("[^"]*"|'[^']*')/gi;
    let m;
    while ((m = re.exec(attrs)) !== null) keep.push(`${m[1]}=${m[2]}`);
    return keep.length ? `<${tag} ${keep.join(" ")}>` : `<${tag}>`;
  });

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  return s;
}

export async function fetchUrl({ url }) {
  if (!url) throw new Error("fetchUrl: 'url' is required");

  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;

  const res = await fetch(target, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`fetchUrl: ${res.status} ${res.statusText} for ${target}`);
  }

  const html = await res.text();
  const cleaned = clean(html);

  if (cleaned.length <= MAX_CHARS) return cleaned;
  return (
    cleaned.slice(0, MAX_CHARS) +
    `\n\n…[truncated, original was ${cleaned.length} chars]`
  );
}

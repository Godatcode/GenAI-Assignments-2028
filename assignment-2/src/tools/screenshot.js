import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";

const VIEWPORT = { width: 1280, height: 900 };
const NAV_TIMEOUT = 30000;
const MAX_FULLPAGE_HEIGHT = 3000;

function defaultFileName(targetUrl) {
  try {
    const host = new URL(targetUrl).hostname.replace(/^www\./, "");
    const slug = host.split(".")[0] || "site";
    return `${slug}-clone/screenshot.png`;
  } catch {
    return "site-clone/screenshot.png";
  }
}

export async function screenshotWebsite({ url, fileName }) {
  if (!url) throw new Error("screenshotWebsite: 'url' is required");

  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;

  const out = fileName || defaultFileName(target);
  const absolute = path.resolve(process.cwd(), out);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT);
    await page.setViewport(VIEWPORT);

    await page.goto(target, {
      waitUntil: "networkidle2",
      timeout: NAV_TIMEOUT,
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Decide full-page vs viewport based on document height to avoid
    // multi-MB base64 payloads that would blow up the LLM context.
    const docHeight = await page.evaluate(() =>
      Math.max(
        document.body?.scrollHeight ?? 0,
        document.documentElement?.scrollHeight ?? 0
      )
    );
    const useFullPage = docHeight > 0 && docHeight <= MAX_FULLPAGE_HEIGHT;

    const fileOpts = { path: absolute };
    if (useFullPage) fileOpts.fullPage = true;
    await page.screenshot(fileOpts);

    const b64Opts = { encoding: "base64" };
    if (useFullPage) b64Opts.fullPage = true;
    const base64 = await page.screenshot(b64Opts);

    const dims = useFullPage
      ? `${VIEWPORT.width}x${docHeight}`
      : `${VIEWPORT.width}x${VIEWPORT.height} (viewport-only — full page was ${docHeight}px tall)`;

    return {
      message: `Screenshot saved to ${out} (${dims})`,
      base64,
      mimeType: "image/png",
    };
  } catch (err) {
    return {
      message: `Error taking screenshot of ${target}: ${err.message}`,
      base64: null,
      mimeType: null,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

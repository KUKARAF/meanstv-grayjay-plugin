// Parser for the `<track>` elements inside the program_content turbo-stream
// HTML. Tags sit in a <template>, so — like the HLS fallback in content.ts —
// this scans the markup textually instead of relying on DOM traversal. Pure:
// no Grayjay objects, no network.

const TRACK_TAG = /<track\b[^>]*>/gi;
const ATTRIBUTE = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function decodeEntities(value: string): string {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function attributes(tag: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of tag.matchAll(ATTRIBUTE)) {
    const name = (match[1] ?? "").toLowerCase();
    if (!out.has(name)) out.set(name, decodeEntities(match[2] ?? match[3] ?? ""));
  }
  return out;
}

/**
 * Extracts WebVTT tracks from program content HTML. The server marks tracks
 * `kind="metadata"` (the player rewrites it later), so kind is ignored; empty,
 * `data:` placeholder and non-http(s) sources are skipped.
 */
export function parseSubtitleTracks(html: string): ISubtitleSource[] {
  const out: ISubtitleSource[] = [];
  const seen = new Set<string>();
  for (const tag of html.match(TRACK_TAG) ?? []) {
    const attrs = attributes(tag);
    const url = (attrs.get("src") ?? "").trim();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({
      name: (attrs.get("label") ?? "").trim() || (attrs.get("srclang") ?? "").trim() || "Subtitles",
      url,
      format: "text/vtt",
    });
  }
  return out;
}

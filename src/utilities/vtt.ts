// Means.tv's auto-generated caption files are built by concatenating HLS
// WebVTT *segments* instead of a single flat track: every segment carries its
// own `WEBVTT` + `X-TIMESTAMP-MAP=LOCAL:...,MPEGTS:...` header (the Apple HLS
// extension used to align fragmented subtitle segments), but those headers
// are only valid at the very start of a file. Handed raw to a player, every
// header after the first gets rendered as literal on-screen cue text. Strips
// all but the first occurrence. Pure: no network, no Grayjay objects.

const REPEATED_HEADER = /^WEBVTT[^\r\n]*\r?\n(?:X-TIMESTAMP-MAP[^\r\n]*\r?\n)?/gm;

export function sanitizeVtt(body: string): string {
  let sawHeader = false;
  return body.replace(REPEATED_HEADER, (match) => {
    if (sawHeader) return "";
    sawHeader = true;
    return match;
  });
}

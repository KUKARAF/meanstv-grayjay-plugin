import { describe, expect, test } from "bun:test";
import { parseSubtitleTracks } from "../src/parsers/subtitles";
import { readFixture } from "./helpers";

const streamHtml = await readFixture("program-content-stream.html");
const subtitlesHtml = await readFixture("program-content-stream-subtitles.html");
const TOKEN = "A".repeat(16) + "B".repeat(16) + "0".repeat(16) + "z".repeat(16);

function video(inner: string): string {
  return `<turbo-stream><template><video>${inner}<source src="https://stream.mux.com/x.m3u8"></video></template></turbo-stream>`;
}

describe("subtitle parser", () => {
  test("extracts the single server-side track from the stream fixture with a trimmed name", () => {
    expect(parseSubtitleTracks(subtitlesHtml)).toEqual([
      { name: "English (auto-generated)", url: `https://alpha.uscreencdn.com/sub/997290/${TOKEN}.vtt`, format: "text/vtt" },
    ]);
  });

  test("returns no tracks for a stream response without <track> elements", () => {
    expect(parseSubtitleTracks(streamHtml)).toEqual([]);
  });

  test("extracts multiple tracks in document order", () => {
    const tracks = parseSubtitleTracks(
      video(
        `<track label="English" kind="metadata" srcLang="en" src="https://cdn.example.test/en.vtt" default>` +
          `<track label="Spanish" kind="metadata" srcLang="es" src="https://cdn.example.test/es.vtt">`,
      ),
    );
    expect(tracks).toEqual([
      { name: "English", url: "https://cdn.example.test/en.vtt", format: "text/vtt" },
      { name: "Spanish", url: "https://cdn.example.test/es.vtt", format: "text/vtt" },
    ]);
  });

  test("ignores the client-side data: placeholder track", () => {
    const tracks = parseSubtitleTracks(
      video(
        `<track kind="subtitles" label="English (auto-generated)" srclang="en" src="data:,WEBVTT">` +
          `<track label="English" srcLang="en" src="https://cdn.example.test/en.vtt">`,
      ),
    );
    expect(tracks.map((track) => track.url)).toEqual(["https://cdn.example.test/en.vtt"]);
    expect(parseSubtitleTracks(video(`<track kind="subtitles" label="x" srclang="en" src="data:,WEBVTT">`))).toEqual([]);
  });

  test("ignores empty, missing, and non-http(s) src values", () => {
    expect(
      parseSubtitleTracks(
        video(
          `<track label="a" src="">` +
            `<track label="b">` +
            `<track label="c" src="   ">` +
            `<track label="d" src="javascript:alert(1)">` +
            `<track label="e" src="ftp://cdn.example.test/e.vtt">` +
            `<track label="f" src="blob:https://means.tv/abc">`,
        ),
      ),
    ).toEqual([]);
  });

  test("falls back from label to srcLang to 'Subtitles'", () => {
    const tracks = parseSubtitleTracks(
      video(
        `<track label="  Trimmed  " src="https://cdn.example.test/1.vtt">` +
          `<track srcLang="fr" src="https://cdn.example.test/2.vtt">` +
          `<track label="   " srclang="de" src="https://cdn.example.test/3.vtt">` +
          `<track src="https://cdn.example.test/4.vtt">`,
      ),
    );
    expect(tracks.map((track) => track.name)).toEqual(["Trimmed", "fr", "de", "Subtitles"]);
  });

  test("decodes HTML entities in src", () => {
    const tracks = parseSubtitleTracks(video(`<track label="En" src="https://cdn.example.test/en.vtt?a=1&amp;b=2">`));
    expect(tracks).toEqual([{ name: "En", url: "https://cdn.example.test/en.vtt?a=1&b=2", format: "text/vtt" }]);
  });

  test("dedupes tracks with identical URLs, keeping the first", () => {
    const tracks = parseSubtitleTracks(
      video(
        `<track label="First" src="https://cdn.example.test/en.vtt">` +
          `<track label="Second" src="https://cdn.example.test/en.vtt">` +
          `<track label="Other" src="https://cdn.example.test/other.vtt">`,
      ),
    );
    expect(tracks.map((track) => track.name)).toEqual(["First", "Other"]);
  });

  test("handles empty and malformed input without throwing", () => {
    expect(parseSubtitleTracks("")).toEqual([]);
    expect(parseSubtitleTracks("   ")).toEqual([]);
    expect(parseSubtitleTracks("<<<not html")).toEqual([]);
    expect(() => parseSubtitleTracks('<video><track label="x" src="https://cdn.example.test/a.vtt')).not.toThrow();
    expect(parseSubtitleTracks("<video><track")).toEqual([]);
  });
});

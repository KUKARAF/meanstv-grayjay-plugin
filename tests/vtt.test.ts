import { describe, expect, test } from "bun:test";
import { sanitizeVtt } from "../src/utilities/vtt";

describe("sanitizeVtt", () => {
  test("leaves a single well-formed track untouched", () => {
    const body = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello\n";
    expect(sanitizeVtt(body)).toBe(body);
  });

  test("strips repeated HLS segment headers, keeping only the first", () => {
    const body =
      "WEBVTT\n" +
      "X-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000\n" +
      "\n" +
      "00:00:00.000 --> 00:00:02.000\n" +
      "all supposedly tied to the amount of gold in the vaults in the United States.\n" +
      "WEBVTT\n" +
      "X-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000\n" +
      "\n" +
      "00:00:00.000 --> 00:00:02.000\n" +
      "all supposedly tied to the amount of gold in the vaults in the United States.\n";

    const result = sanitizeVtt(body);
    expect(result.match(/WEBVTT/g)?.length).toBe(1);
    expect(result.match(/X-TIMESTAMP-MAP/g)?.length).toBe(1);
    expect(result.match(/all supposedly tied/g)?.length).toBe(2);
  });

  test("strips a bare repeated WEBVTT header with no timestamp map line", () => {
    const body = "WEBVTT\n\ncue one\nWEBVTT\n\ncue two\n";
    expect(sanitizeVtt(body)).toBe("WEBVTT\n\ncue one\n\ncue two\n");
  });
});

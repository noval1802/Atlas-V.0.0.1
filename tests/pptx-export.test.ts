import assert from "node:assert/strict";
import test from "node:test";
import { unzipSync } from "fflate";
import { buildPptx } from "../src/lib/pptx-export";

test("ekspor PPTX menghasilkan paket OpenXML dengan slide dan PNG", () => {
  const onePixelPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const files = unzipSync(buildPptx(onePixelPng));
  assert.ok(files["[Content_Types].xml"]);
  assert.ok(files["ppt/presentation.xml"]);
  assert.ok(files["ppt/slides/slide1.xml"]);
  assert.deepEqual(files["ppt/media/image1.png"].slice(0, 4), Uint8Array.from([137, 80, 78, 71]));
});

test("ekspor PPTX memakai judul dokumen yang diminta", () => {
  const onePixelPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const files = unzipSync(buildPptx(onePixelPng, "ATLAS - BANGSIT"));
  const core = new TextDecoder().decode(files["docProps/core.xml"]);
  assert.ok(core.includes("ATLAS - BANGSIT"));
});

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { LocalDocumentStorage } from "../src/documents/local-storage";

test("penyimpanan lokal menulis file di dalam root dan menolak path di luar root", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "atlas-docs-"));
  const previous = process.env.DOCUMENT_STORAGE_DIR;
  process.env.DOCUMENT_STORAGE_DIR = root;
  try {
    const storage = new LocalDocumentStorage();
    const stored = await storage.uploadFile(
      "PUSDALOPS/KODAM_JAYA/catatan.txt",
      Buffer.from("siaga"),
      "text/plain",
    );
    assert.equal(stored.path, "PUSDALOPS/KODAM_JAYA/catatan.txt");
    assert.equal(stored.mimeType, "text/plain");
    const response = await storage.getFile(stored.path);
    assert.equal(await response.text(), "siaga");
    const listed = await storage.listFiles("PUSDALOPS/KODAM_JAYA");
    assert.deepEqual(
      listed.map((item) => item.filename),
      ["catatan.txt"],
    );
    await assert.rejects(() => storage.getFile("../rahasia.txt"));
  } finally {
    if (previous === undefined) delete process.env.DOCUMENT_STORAGE_DIR;
    else process.env.DOCUMENT_STORAGE_DIR = previous;
    await rm(root, { recursive: true, force: true });
  }
});

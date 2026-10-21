import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DocumentStorageError, type DocumentStorageService, type StoredDocument } from "./document-storage";
import { safeDocumentPath } from "./path";

function storageRoot(): string {
  return path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(process.cwd(), "uploads", "documents"));
}

function resolveInside(relativePath: string): { safe: string; absolute: string } {
  const safe = safeDocumentPath(relativePath);
  const root = storageRoot();
  const absolute = path.resolve(root, safe);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new DocumentStorageError("Path dokumen tidak valid", 400);
  }
  return { safe, absolute };
}

function describe(
  relativePath: string,
  fileStat: { size: number; mtime: Date; isDirectory(): boolean },
  mimeType?: string,
): StoredDocument {
  return {
    fileId: createHash("sha256").update(relativePath).digest("hex"),
    filename: relativePath.split("/").filter(Boolean).at(-1) ?? "",
    path: relativePath,
    mimeType,
    size: fileStat.size,
    lastModified: fileStat.mtime.toISOString(),
    isDirectory: fileStat.isDirectory(),
  };
}

export class LocalDocumentStorage implements DocumentStorageService {
  async listFiles(relativePath: string): Promise<StoredDocument[]> {
    const { absolute } = resolveInside(relativePath);
    let entries;
    try {
      entries = await readdir(absolute, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new DocumentStorageError("Folder dokumen tidak ditemukan", 404);
      throw new DocumentStorageError("Folder dokumen gagal dibaca", 500);
    }
    const documents = await Promise.all(
      entries.map(async (entry) => {
        const child = `${safeDocumentPath(relativePath)}/${entry.name}`.replace(/^\//, "");
        const fileStat = await stat(path.join(absolute, entry.name));
        return describe(child, fileStat);
      }),
    );
    return documents;
  }

  async getMetadata(relativePath: string): Promise<StoredDocument> {
    const { safe, absolute } = resolveInside(relativePath);
    try {
      return describe(safe, await stat(absolute));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new DocumentStorageError("Dokumen tidak ditemukan", 404);
      throw new DocumentStorageError("Metadata dokumen gagal dibaca", 500);
    }
  }

  async getFile(relativePath: string): Promise<Response> {
    const { absolute } = resolveInside(relativePath);
    try {
      const bytes = await readFile(absolute);
      return new Response(bytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new DocumentStorageError("Dokumen tidak ditemukan", 404);
      throw new DocumentStorageError("Dokumen gagal dibaca", 500);
    }
  }

  async uploadFile(relativePath: string, content: Uint8Array, mimeType: string): Promise<StoredDocument> {
    const { safe, absolute } = resolveInside(relativePath);
    await mkdir(path.dirname(absolute), { recursive: true });
    const temporary = path.join(path.dirname(absolute), `.${path.basename(absolute)}.${randomUUID()}.tmp`);
    await writeFile(temporary, content, { flag: "wx" });
    try {
      await rename(temporary, absolute);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
    const stored = describe(safe, await stat(absolute), mimeType);
    return stored;
  }
}

export function getDocumentStorage(): DocumentStorageService {
  return new LocalDocumentStorage();
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  reportFilterSchema,
  reportSchema,
  reportWorkflowSchema,
  resourceSchema,
  userManagementSchema,
} from "../src/operations/schema";

test("resource menolak jumlah dikerahkan di atas jumlah tersedia", () => {
  const result = resourceSchema.safeParse({
    kodamCode: "XII/TPR",
    type: "PERSONEL",
    name: "Personel siaga",
    quantity: 10,
    deployed: 11,
    status: "SIAP",
  });
  assert.equal(result.success, false);
});

test("report menerima draft operasional yang lengkap", () => {
  const result = reportSchema.safeParse({
    kodamCode: "XII/TPR",
    type: "SITREP",
    title: "Laporan situasi harian",
    reportDate: "2026-08-28T08:00:00+07:00",
    summary: "Situasi wilayah terkendali dan kegiatan berjalan sesuai rencana.",
  });
  assert.equal(result.success, true);
});

test("workflow laporan hanya menerima aksi yang dikenal", () => {
  assert.equal(reportWorkflowSchema.safeParse({ action: "PUBLISH" }).success, true);
  assert.equal(reportWorkflowSchema.safeParse({ action: "APPROVE_ANYWAY" }).success, false);
});

test("manajemen user membatasi role dan status", () => {
  assert.equal(
    userManagementSchema.safeParse({ role: "OPERATOR_KODAM", kodamCode: "XII/TPR", status: "ACTIVE" })
      .success,
    true,
  );
  assert.equal(
    userManagementSchema.safeParse({ role: "ROOT", kodamCode: null, status: "ACTIVE" }).success,
    false,
  );
});

test("filter laporan menerima rentang tanggal, Kodam, kategori, status, dan pencarian", () => {
  const result = reportFilterSchema.safeParse({
    from: "2026-08-01",
    to: "2026-08-31",
    kodamCode: "XII/TPR",
    type: "Laporan Harian",
    status: "PUBLISHED",
    q: "banjir",
  });
  assert.equal(result.success, true);
});

test("filter laporan menolak tanggal terbalik dan status yang tidak dikenal", () => {
  assert.equal(reportFilterSchema.safeParse({ from: "2026-08-31", to: "2026-08-01" }).success, false);
  assert.equal(reportFilterSchema.safeParse({ status: "DIHAPUS" }).success, false);
  assert.equal(reportFilterSchema.safeParse({ from: "31-08-2026" }).success, false);
});

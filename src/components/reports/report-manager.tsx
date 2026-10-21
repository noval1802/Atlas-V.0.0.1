"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Archive, FilePlus2, Filter, Send, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DownloadReportButton } from "./download-report-button";

type KodamOption = { code: string; name: string };
type ReportRow = {
  id: string;
  type: string;
  title: string;
  reportDate: Date | string;
  content: unknown;
  status: string;
  kodam: (KodamOption & { id?: string }) | null;
};
type Filters = {
  from: string;
  to: string;
  kodamCode: string;
  type: string;
  status: string;
  q: string;
};
const emptyFilters: Filters = { from: "", to: "", kodamCode: "", type: "", status: "", q: "" };
const summaryOf = (content: unknown) =>
  typeof content === "object" && content !== null && "summary" in content
    ? String((content as { summary?: unknown }).summary ?? "")
    : "";

export function ReportManager({
  initialRows,
  kodams,
  canCreate,
  canUpdate,
  canDelete,
  canApprove,
}: {
  initialRows: ReportRow[];
  kodams: KodamOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtering, setFiltering] = useState(false);
  const firstFilterRun = useRef(true);
  const [form, setForm] = useState({
    kodamCode: "",
    type: "Laporan Harian",
    title: "",
    reportDate: new Date().toISOString().slice(0, 10),
    summary: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const applyFilters = useCallback(async (next: Filters) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    setFiltering(true);
    try {
      const response = await fetch(`/api/reports?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Filter laporan gagal");
      setRows(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Filter laporan gagal");
    } finally {
      setFiltering(false);
    }
  }, []);

  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    const timer = setTimeout(() => void applyFilters(filters), 250);
    return () => clearTimeout(timer);
  }, [applyFilters, filters]);

  const reportTypes = [...new Set(initialRows.map((row) => row.type))].sort();
  const activeFilters = Object.values(filters).some((value) => value !== "");

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, kodamCode: form.kodamCode || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Laporan gagal dibuat");
      await applyFilters(filters);
      setForm({ ...form, title: "", summary: "" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Laporan gagal dibuat");
    } finally {
      setBusy(false);
    }
  }

  async function workflow(id: string, action: "PUBLISH" | "ARCHIVE" | "RETURN_TO_DRAFT") {
    const response = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Workflow laporan gagal");
    await applyFilters(filters);
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus laporan draft ini?")) return;
    const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Laporan gagal dihapus");
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <PageHeader
        eyebrow="REPORTING CENTER"
        title="Laporan"
        description="Draft, approval, publish, arsip, dan export laporan berbasis PostgreSQL"
      />
      {canCreate && (
        <form onSubmit={create} className="panel grid gap-3 rounded-xl p-4 md:grid-cols-2 xl:grid-cols-6">
          <select
            value={form.kodamCode}
            onChange={(event) => setForm({ ...form, kodamCode: event.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          >
            <option value="">Nasional</option>
            {kodams.map((kodam) => (
              <option key={kodam.code} value={kodam.code}>
                {kodam.name}
              </option>
            ))}
          </select>
          <input
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          />
          <input
            required
            placeholder="Judul laporan"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs xl:col-span-2"
          />
          <input
            type="date"
            value={form.reportDate}
            onChange={(event) => setForm({ ...form, reportDate: event.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
          />
          <button
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950"
          >
            <FilePlus2 size={14} />
            Buat Draft
          </button>
          <textarea
            required
            minLength={10}
            placeholder="Ringkasan laporan"
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs md:col-span-2 xl:col-span-6"
          />
        </form>
      )}
      <div className="panel grid gap-3 rounded-xl p-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="text-[10px] text-slate-400">
          Dari tanggal
          <input
            type="date"
            aria-label="Filter tanggal awal"
            value={filters.from}
            onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            className="mt-2 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs"
          />
        </label>
        <label className="text-[10px] text-slate-400">
          Sampai tanggal
          <input
            type="date"
            aria-label="Filter tanggal akhir"
            value={filters.to}
            onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            className="mt-2 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs"
          />
        </label>
        <label className="text-[10px] text-slate-400">
          Kodam
          <select
            aria-label="Filter Kodam"
            value={filters.kodamCode}
            onChange={(event) => setFilters({ ...filters, kodamCode: event.target.value })}
            className="mt-2 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs"
          >
            <option value="">Semua Kodam</option>
            {kodams.map((kodam) => (
              <option key={kodam.code} value={kodam.code}>
                {kodam.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-slate-400">
          Kategori
          <select
            aria-label="Filter kategori"
            value={filters.type}
            onChange={(event) => setFilters({ ...filters, type: event.target.value })}
            className="mt-2 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs"
          >
            <option value="">Semua kategori</option>
            {reportTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] text-slate-400">
          Status
          <select
            aria-label="Filter status"
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            className="mt-2 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs"
          >
            <option value="">Semua status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Arsip</option>
          </select>
        </label>
        <label className="text-[10px] text-slate-400">
          Cari
          <input
            aria-label="Filter pencarian"
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
            placeholder="Judul, kategori, atau ringkasan"
            className="mt-2 h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs"
          />
        </label>
        <div className="flex items-center justify-between gap-3 md:col-span-2 xl:col-span-6">
          <p className="text-[10px] text-slate-500">
            {filtering ? "Memuat laporan..." : `${rows.length} laporan ditampilkan`}
          </p>
          <button
            type="button"
            onClick={() => setFilters(emptyFilters)}
            disabled={!activeFilters}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[10px] text-slate-400 disabled:opacity-40"
          >
            <Filter size={12} />
            Reset filter
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
      <div className="panel overflow-x-auto rounded-xl">
        <table className="w-full min-w-[850px] text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-800 text-[9px] text-slate-500">
              <th className="px-4 py-3">TANGGAL</th>
              <th>JUDUL</th>
              <th>TIPE</th>
              <th>KODAM</th>
              <th>STATUS</th>
              <th className="pr-4 text-right">AKSI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const reportData = {
                id: row.id,
                type: row.type,
                title: row.title,
                date: new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                  new Date(row.reportDate),
                ),
                kodam: row.kodam?.name ?? "Nasional",
                status: row.status,
                description: summaryOf(row.content),
              };
              return (
                <tr key={row.id} className="border-b border-slate-800/70">
                  <td className="px-4 py-4 font-mono text-cyan-400">{reportData.date}</td>
                  <td>
                    <p className="font-medium">{row.title}</p>
                    <small className="text-slate-500">{summaryOf(row.content).slice(0, 100)}</small>
                  </td>
                  <td>{row.type}</td>
                  <td>{row.kodam?.name ?? "Nasional"}</td>
                  <td>{row.status}</td>
                  <td className="pr-4 text-right">
                    <DownloadReportButton report={reportData} />
                    {canApprove && row.status === "DRAFT" && (
                      <button
                        title="Publish"
                        onClick={() => workflow(row.id, "PUBLISH")}
                        className="p-2 text-emerald-400"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    {canApprove && row.status === "PUBLISHED" && (
                      <button
                        title="Arsipkan"
                        onClick={() => workflow(row.id, "ARCHIVE")}
                        className="p-2 text-amber-400"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                    {canUpdate && row.status === "ARCHIVED" && (
                      <button
                        title="Kembali ke draft"
                        onClick={() => workflow(row.id, "RETURN_TO_DRAFT")}
                        className="p-2 text-cyan-400"
                      >
                        <FilePlus2 size={14} />
                      </button>
                    )}
                    {canDelete && row.status === "DRAFT" && (
                      <button title="Hapus" onClick={() => remove(row.id)} className="p-2 text-rose-400">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-xs text-slate-500">
            {activeFilters ? "Tidak ada laporan yang cocok dengan filter." : "Belum ada laporan."}
          </p>
        )}
      </div>
    </div>
  );
}

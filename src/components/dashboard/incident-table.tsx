"use client";
import { ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { incidents } from "@/data/dashboard";
import type { Incident } from "@/types";
import { StatusBadge } from "@/components/ui/status-badge";
export function IncidentTable({
  data = incidents,
  total = data.length,
}: {
  data?: Incident[];
  total?: number;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("SEMUA");
  const [sortKey, setSortKey] = useState<"time" | "kodam" | "location" | "category" | "status">("time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const rows = useMemo(
    () =>
      data.filter(
        (i) =>
          (filter === "SEMUA" || i.status === filter) &&
          `${i.kodam} ${i.location} ${i.category} ${i.description}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, q, filter],
  );
  const sortedRows = useMemo(() => {
    const value = (incident: Incident) => {
      if (sortKey === "time") return `${incident.eventDate ?? ""} ${incident.time}`;
      return incident[sortKey];
    };
    return [...rows].sort((a, b) => {
      const comparison = String(value(a)).localeCompare(String(value(b)), "id", {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [rows, sortDirection, sortKey]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  function search(value: string) {
    setQ(value);
    setPage(1);
  }
  function changeFilter(value: string) {
    setFilter(value);
    setPage(1);
  }
  function sortBy(key: typeof sortKey) {
    setPage(1);
    if (sortKey === key) setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }
  function sortIndicator(key: typeof sortKey) {
    if (sortKey !== key) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }
  return (
    <>
      <div className="flex flex-wrap gap-2 border-b border-slate-800 p-3">
        <label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3">
          <Search size={13} className="text-slate-500" />
          <input
            value={q}
            onChange={(e) => search(e.target.value)}
            placeholder="Cari kejadian..."
            className="h-8 w-full bg-transparent text-[11px] outline-none placeholder:text-slate-600"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2 text-slate-500">
          <SlidersHorizontal size={13} />
          <select
            value={filter}
            onChange={(e) => changeFilter(e.target.value)}
            className="h-8 bg-transparent text-[10px] text-slate-300 outline-none"
          >
            <option>SEMUA</option>
            <option>KONDUSIF</option>
            <option>WASPADA</option>
            <option>SIAGA</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-slate-800 text-[9px] tracking-[.1em] text-slate-500">
              <th className="px-4 py-3">
                <button onClick={() => sortBy("time")} className="inline-flex items-center gap-1">
                  WAKTU {sortIndicator("time")}
                </button>
              </th>
              <th>
                <button onClick={() => sortBy("kodam")} className="inline-flex items-center gap-1">
                  KODAM / LOKASI {sortIndicator("kodam")}
                </button>
              </th>
              <th>
                <button onClick={() => sortBy("category")} className="inline-flex items-center gap-1">
                  JENIS {sortIndicator("category")}
                </button>
              </th>
              <th>KETERANGAN</th>
              <th>
                <button onClick={() => sortBy("status")} className="inline-flex items-center gap-1">
                  STATUS {sortIndicator("status")}
                </button>
              </th>
              <th className="pr-4 text-right">AKSI</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((i) => (
              <tr key={i.id} className="border-b border-slate-800/70 text-[11px] hover:bg-white/[.02]">
                <td className="px-4 py-3 font-mono text-cyan-400">{i.time}</td>
                <td>
                  <p className="font-medium">{i.kodam}</p>
                  <p className="mt-0.5 text-[9px] text-slate-500">{i.location}</p>
                </td>
                <td>
                  <span className="rounded bg-slate-800 px-2 py-1 text-[9px]">{i.category}</span>
                </td>
                <td className="max-w-52 truncate text-slate-400">{i.description}</td>
                <td>
                  <StatusBadge status={i.status} />
                </td>
                <td className="pr-4 text-right">
                  <button
                    className="rounded-md p-2 text-slate-500 hover:bg-cyan-400/10 hover:text-cyan-300"
                    aria-label={`Lihat ${i.id}`}
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-xs text-slate-500">Tidak ada kejadian yang sesuai.</p>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-[10px] text-slate-500">
        <span>
          Menampilkan {sortedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, sortedRows.length)} dari {sortedRows.length} kejadian
          {total !== sortedRows.length && ` (${total} total)`}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded border border-slate-800 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="rounded bg-cyan-400/10 px-2.5 py-1.5 text-cyan-300">
            {currentPage} / {pageCount}
          </span>
          <button
            disabled={currentPage >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            className="rounded border border-slate-800 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </>
  );
}

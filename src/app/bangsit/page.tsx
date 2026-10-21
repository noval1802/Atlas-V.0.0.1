"use client";

import { useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { Download, Eye, FileImage, FileText, Loader2, Presentation, Save } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { BangsitDocument } from "@/components/bangsit/bangsit-document";
import { kodams } from "@/data/kodam";
import { upsertBangsitAnnotation } from "@/lib/map-annotation-storage";
import type { AnnotationCategory, AnnotationStatus } from "@/types/map-annotation";
import { parseCoordinatePair } from "@/kodams/coordinates";

const initial = {
  date: "2026-08-23",
  time: "08:00",
  kodam: kodams[0].name,
  eventType: "Bencana Alam",
  location: "",
  latitude: "",
  longitude: "",
  crowd: "0",
  personnel: "0",
  alut: "",
  chronology: "",
  status: "WASPADA" as AnnotationStatus,
};
type Archive = { id: string; reportId: string; filename: string };

export default function Bangsit() {
  const [form, setForm] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [archive, setArchive] = useState<Archive | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"PNG" | "PPTX" | null>(null);
  const documentRef = useRef<HTMLDivElement | null>(null);
  function field(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setArchive(null);
  }
  function pasteCoordinates(event: ClipboardEvent<HTMLInputElement>) {
    const coordinates = parseCoordinatePair(event.clipboardData.getData("text"));
    if (!coordinates) return;
    event.preventDefault();
    setError("");
    setArchive(null);
    setForm((current) => ({
      ...current,
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
    }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const coordinates = parseCoordinatePair(`${form.latitude},${form.longitude}`);
    if (!coordinates) {
      setError("Koordinat tidak valid.");
      setBusy(false);
      return;
    }
    const category: AnnotationCategory =
      form.eventType === "Karhutla" ? "KARHUTLA" : form.eventType === "Unras" ? "UNRAS" : "BENCANA";
    const id = `BANGSIT-${form.date}-${form.time}-${form.kodam}`.replace(/[^a-zA-Z0-9]+/g, "-");
    upsertBangsitAnnotation({
      id: `ANN-${id}`,
      incidentId: id,
      sourceId: id,
      kodam: form.kodam,
      category,
      ...coordinates,
      title: `${form.eventType} ${form.location}`,
      location: form.location,
      time: `${form.time} WIB`,
      eventDate: form.date,
      status: form.status,
      annotationPosition: "auto",
      personnel: Number(form.personnel) || 0,
      crowdEstimate: category === "UNRAS" ? Number(form.crowd) || 0 : undefined,
      hotspot: category === "KARHUTLA" ? Number(form.crowd) || 0 : undefined,
      disasterType: category === "BENCANA" ? form.eventType.toUpperCase() : undefined,
      alut: form.alut,
      organization: category === "UNRAS" ? form.alut : undefined,
      updatedAt: `${form.time} WIB`,
    });
    try {
      const response = await fetch("/api/bangsit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "BANGSIT gagal diarsipkan");
      setArchive(result);
      setPreview(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "BANGSIT gagal diarsipkan");
    } finally {
      setBusy(false);
    }
  }
  async function exportDocument(format: "PNG" | "PPTX") {
    const target = documentRef.current;
    if (!target) return;
    setExporting(format);
    setError("");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#060b16",
        skipFonts: true,
        width: 794,
        height: 1123,
      });
      const stamp = `${form.date}-${form.time}`.replace(/[:.]/g, "-");
      const name = `atlas-bangsit-${form.kodam.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-${stamp}`;
      if (format === "PNG") {
        const link = document.createElement("a");
        link.download = `${name}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        const { downloadPptx } = await import("@/lib/pptx-export");
        downloadPptx(dataUrl, `${name}.pptx`, `ATLAS - BANGSIT ${form.eventType} ${form.location}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Ekspor ${format} gagal`);
    } finally {
      setExporting(null);
    }
  }
  const reportId =
    archive?.reportId ??
    `BANGSIT-${form.date.replaceAll("-", "")}-${form.time.replace(":", "")}-${form.kodam}`
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toUpperCase();
  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] space-y-5">
        <PageHeader
          eyebrow="LAPORAN SITUASI DIGITAL"
          title="BANGSIT"
          description="Generate PDF, arsipkan di server ATLAS, dan sinkronkan titik ke Peta Situasi"
        />
        <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={submit} className="panel rounded-xl p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-[.12em]">INPUT LAPORAN</h2>
              {archive && (
                <span className="text-[10px] text-emerald-400">DIARSIPKAN • {archive.reportId}</span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Tanggal" type="date" value={form.date} onChange={(v) => field("date", v)} />
              <Input label="Waktu" type="time" value={form.time} onChange={(v) => field("time", v)} />
              <Select
                label="Kodam"
                value={form.kodam}
                onChange={(v) => field("kodam", v)}
                options={kodams.map((k) => k.name)}
              />
              <Select
                label="Jenis Kejadian"
                value={form.eventType}
                onChange={(v) => field("eventType", v)}
                options={["Bencana Alam", "Karhutla", "Unras"]}
              />
              <Input label="Lokasi" value={form.location} onChange={(v) => field("location", v)} />
              <Select
                label="Status"
                value={form.status}
                onChange={(v) => field("status", v)}
                options={["NORMAL", "TERPANTAU", "WASPADA", "SIAGA", "DARURAT", "SELESAI"]}
              />
              <Input
                label="Latitude"
                type="number"
                value={form.latitude}
                onChange={(v) => field("latitude", v)}
                onPaste={pasteCoordinates}
                placeholder="-6.1754"
              />
              <Input
                label="Longitude"
                type="number"
                value={form.longitude}
                onChange={(v) => field("longitude", v)}
                onPaste={pasteCoordinates}
                placeholder="106.8272"
              />
              <p className="text-[9px] leading-4 text-slate-500 sm:col-span-2">
                Paste format latitude, longitude ke salah satu kolom untuk mengisi keduanya otomatis.
              </p>
              <Input
                label={
                  form.eventType === "Karhutla"
                    ? "Jumlah Hotspot"
                    : form.eventType === "Unras"
                      ? "Jumlah Massa"
                      : "Jumlah Terdampak"
                }
                type="number"
                value={form.crowd}
                onChange={(v) => field("crowd", v)}
              />
              <Input
                label="Jumlah Personel"
                type="number"
                value={form.personnel}
                onChange={(v) => field("personnel", v)}
              />
              <Input
                label={form.eventType === "Unras" ? "Organisasi" : "Alut"}
                value={form.alut}
                onChange={(v) => field("alut", v)}
              />
              <label className="text-[10px] text-slate-400 sm:col-span-2">
                Kronologi
                <textarea
                  required
                  value={form.chronology}
                  onChange={(e) => field("chronology", e.target.value)}
                  className="mt-2 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs outline-none"
                />
              </label>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300"
              >
                {error}
              </p>
            )}
            <button
              disabled={busy}
              className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 text-xs font-bold text-slate-950 disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{" "}
              {busy ? "MEMBUAT & MENGARSIPKAN..." : "GENERATE PDF & ARSIPKAN"}
            </button>
          </form>
          <section className="panel min-h-[650px] rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <p className="text-[9px] tracking-widest text-cyan-400">PREVIEW DOKUMEN</p>
                <h2 className="mt-1 text-base font-semibold">BANGSIT</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreview((current) => !current)}
                  className="action-button"
                >
                  <Eye size={12} />
                  {preview ? "Tutup" : "Preview"}
                </button>
                {archive ? (
                  <a href={`/api/bangsit/${archive.id}/download`} className="action-button">
                    <Download size={12} />
                    PDF
                  </a>
                ) : (
                  <button disabled className="action-button opacity-40">
                    <Download size={12} />
                    PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => exportDocument("PNG")}
                  disabled={exporting !== null}
                  title="Unduh dokumen BANGSIT sebagai PNG"
                  className="action-button disabled:opacity-40"
                >
                  {exporting === "PNG" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <FileImage size={12} />
                  )}
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => exportDocument("PPTX")}
                  disabled={exporting !== null}
                  title="Unduh dokumen BANGSIT sebagai PowerPoint"
                  className="action-button disabled:opacity-40"
                >
                  {exporting === "PPTX" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Presentation size={12} />
                  )}
                  PPTX
                </button>
              </div>
            </div>
            <div
              className={
                preview
                  ? "mt-5 flex justify-center overflow-x-auto pb-2"
                  : "pointer-events-none fixed -left-[9999px] top-0"
              }
              aria-hidden={preview ? undefined : true}
            >
              <div ref={documentRef} className="w-[794px] shrink-0">
                <BangsitDocument
                  data={{
                    reportId,
                    eventType: form.eventType,
                    location: form.location,
                    kodam: form.kodam,
                    date: form.date,
                    time: form.time,
                    status: form.status,
                    latitude: form.latitude,
                    longitude: form.longitude,
                    crowd: form.crowd,
                    personnel: form.personnel,
                    alut: form.alut,
                    chronology: form.chronology,
                  }}
                />
              </div>
            </div>
            {preview ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-5 text-center">
                  <FileText className="mx-auto text-cyan-400" />
                  <p className="mt-3 text-lg font-semibold">
                    {form.eventType.toUpperCase()} — {form.location.toUpperCase()}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {form.kodam} • {form.date} • {form.time} WIB
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Personel", form.personnel],
                    ["Koordinat", `${form.latitude}, ${form.longitude}`],
                    ["Status", form.status],
                  ].map(([label, value]) => (
                    <div className="rounded-lg border border-slate-800 p-3 text-center" key={label}>
                      <p className="truncate text-sm font-semibold text-cyan-300">{value}</p>
                      <p className="text-[9px] text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-slate-800 p-4">
                  <h3 className="text-xs font-semibold">KRONOLOGI</h3>
                  <p className="mt-3 text-[11px] leading-6 text-slate-400">{form.chronology}</p>
                </div>
                <p
                  className={`rounded-lg border p-3 text-[10px] ${archive ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-400" : "border-amber-400/15 bg-amber-400/5 text-amber-300"}`}
                >
                  {archive
                    ? "PDF tersimpan di server ATLAS dan marker dikirim ke Peta Situasi."
                    : "Preview belum diarsipkan. Tekan Generate PDF & Arsipkan."}
                </p>
              </div>
            ) : (
              <div className="flex h-[520px] flex-col items-center justify-center text-center">
                <FileText size={36} className="text-slate-700" />
                <p className="mt-4 text-sm text-slate-400">Preview belum dibuat</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  onPaste,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="text-[10px] text-slate-400">
      {label}
      <input
        required
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        placeholder={placeholder}
        className="input-map"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="text-[10px] text-slate-400">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-map">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

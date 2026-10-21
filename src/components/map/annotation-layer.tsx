"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMap, useMapEvents } from "react-leaflet";
import type { MapAnnotation, AnnotationPosition } from "@/types/map-annotation";
import { AnnotationLine } from "./annotation-line";
import { SituationAnnotation, CARD_HEIGHT, CARD_WIDTH, annotationColor } from "./situation-annotation";
import { SituationMarker } from "./situation-marker";
import { resetAnnotationLayout, updateAnnotationOffset } from "@/lib/map-annotation-storage";
import { arrangeAnnotationCards } from "@/lib/annotation-layout";
import { matchesMapDate, type MapDateFilter } from "@/lib/map-date-filter";
const offsets: Record<Exclude<AnnotationPosition, "auto">, { x: number; y: number }> = {
  "top-right": { x: 34, y: -CARD_HEIGHT - 24 },
  "top-left": { x: -CARD_WIDTH - 34, y: -CARD_HEIGHT - 24 },
  "bottom-right": { x: 34, y: 24 },
  "bottom-left": { x: -CARD_WIDTH - 34, y: 24 },
  right: { x: 38, y: -CARD_HEIGHT / 2 },
  left: { x: -CARD_WIDTH - 38, y: -CARD_HEIGHT / 2 },
  top: { x: -CARD_WIDTH / 2, y: -CARD_HEIGHT - 34 },
  bottom: { x: -CARD_WIDTH / 2, y: 34 },
};
export function AnnotationLayer({ items }: { items: MapAnnotation[] }) {
  const map = useMap();
  const [version, setVersion] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editable, setEditable] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [presentation, setPresentation] = useState(false);
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [kodam, setKodam] = useState("ALL");
  const [dateFilter, setDateFilter] = useState<MapDateFilter>("ALL");
  const [customDate, setCustomDate] = useState("");
  const [exporting, setExporting] = useState<"PNG" | "PPTX" | null>(null);
  const [exportError, setExportError] = useState("");
  const [selected, setSelected] = useState<MapAnnotation | null>(null);
  const [layout, setLayout] = useState<Record<string, { x: number; y: number }>>({});
  const layoutRef = useRef(layout);
  const dragStart = useRef<{ id: string; x: number; y: number } | null>(null);
  const raf = useRef<number | null>(null);
  const exportMap = useCallback(
    async (format: "PNG" | "PPTX") => {
      setExporting(format);
      setExportError("");
      setShowMarkers(true);
      setShowAnnotations(true);
      setShowLines(true);
      setPresentation(true);
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(map.getContainer(), {
          cacheBust: true,
          backgroundColor: "#07111f",
          imagePlaceholder:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          skipFonts: true,
          filter: (node) => !(node instanceof HTMLElement && node.classList.contains("atlas-map-controls")),
        });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        if (format === "PNG") {
          const link = document.createElement("a");
          link.download = `atlas-peta-situasi-${stamp}.png`;
          link.href = dataUrl;
          link.click();
        } else {
          const { downloadPptx } = await import("@/lib/pptx-export");
          downloadPptx(dataUrl, `atlas-peta-situasi-${stamp}.pptx`);
        }
      } catch (cause) {
        setExportError(cause instanceof Error ? cause.message : `Ekspor ${format} gagal`);
      } finally {
        setExporting(null);
      }
    },
    [map],
  );
  const schedule = useCallback(() => {
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      setVersion((v) => v + 1);
    });
  }, []);
  useMapEvents({ move: schedule, zoom: schedule, resize: schedule, viewreset: schedule });
  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );
  function startDrag(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    const current = layoutRef.current[id] ?? {
      x: item?.annotationOffsetX ?? 0,
      y: item?.annotationOffsetY ?? 0,
    };
    dragStart.current = { id, ...current };
    setExpanded(null);
    map.dragging.disable();
  }
  function drag(id: string, deltaX: number, deltaY: number) {
    const start = dragStart.current;
    if (!start || start.id !== id) return;
    const next = { ...layoutRef.current, [id]: { x: start.x + deltaX, y: start.y + deltaY } };
    layoutRef.current = next;
    setLayout(next);
  }
  function endDrag(id: string) {
    const offset = layoutRef.current[id];
    dragStart.current = null;
    map.dragging.enable();
    if (offset) updateAnnotationOffset(id, offset.x, offset.y);
  }
  const container = map.getContainer();
  const size = map.getSize();
  const kodams = [...new Set(items.map((item) => item.kodam))].sort();
  const visibleItems = items.filter(
    (item) =>
      (category === "ALL" || item.category === category) &&
      (status === "ALL" || item.status === status) &&
      (kodam === "ALL" || item.kodam === kodam) &&
      matchesMapDate(item.eventDate, dateFilter, customDate),
  );
  const markers = visibleItems.map((item) => ({
    item,
    marker: map.latLngToContainerPoint([item.latitude, item.longitude]),
  }));
  const arranged = new Map(
    arrangeAnnotationCards(
      markers.map(({ item, marker }) => {
        const manual =
          layout[item.id] ??
          (item.annotationOffsetX !== undefined || item.annotationOffsetY !== undefined
            ? { x: item.annotationOffsetX ?? 0, y: item.annotationOffsetY ?? 0 }
            : undefined);
        return { id: item.id, marker, manualOffset: manual };
      }),
      { width: size.x, height: size.y },
      { width: CARD_WIDTH, height: CARD_HEIGHT },
    ).map((position) => [position.id, position]),
  );
  const projected = markers.map(({ item, marker }) => {
    const automatic = arranged.get(item.id)!;
    let x = automatic.x,
      y = automatic.y;
    if (item.annotationPosition !== "auto" && !layout[item.id] && item.annotationOffsetX === undefined) {
      const offset = offsets[item.annotationPosition];
      x = Math.max(8, Math.min(size.x - CARD_WIDTH - 8, marker.x + offset.x));
      y = Math.max(8, Math.min(size.y - CARD_HEIGHT - 8, marker.y + offset.y));
    }
    const lineX = Math.max(x, Math.min(marker.x, x + CARD_WIDTH));
    const lineY = Math.max(y, Math.min(marker.y, y + CARD_HEIGHT));
    return { item, marker, x, y, lineX, lineY };
  });
  void version;
  return (
    <>
      {showMarkers &&
        markers.map(({ item }) => (
          <SituationMarker
            key={item.id}
            item={item}
            active={active === item.id || expanded === item.id}
            onHover={setActive}
          />
        ))}
      {createPortal(
        <div className="situation-overlay pointer-events-none absolute inset-0 overflow-hidden">
          <div className="atlas-map-controls pointer-events-auto absolute left-3 right-3 top-3 z-[40] flex flex-wrap justify-end gap-2 pl-36">
            <select
              aria-label="Filter kategori"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-2 py-2 text-[9px] text-slate-200"
            >
              <option value="ALL">SEMUA KATEGORI</option>
              <option value="BENCANA">BENCANA</option>
              <option value="KARHUTLA">KARHUTLA</option>
              <option value="UNRAS">UNRAS</option>
            </select>
            <select
              aria-label="Filter status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-2 py-2 text-[9px] text-slate-200"
            >
              <option value="ALL">SEMUA STATUS</option>
              {["NORMAL", "TERPANTAU", "WASPADA", "SIAGA", "DARURAT", "SELESAI"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter Kodam"
              value={kodam}
              onChange={(event) => setKodam(event.target.value)}
              className="max-w-40 rounded-lg border border-slate-600 bg-[#0b1424]/95 px-2 py-2 text-[9px] text-slate-200"
            >
              <option value="ALL">SEMUA KODAM</option>
              {kodams.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter tanggal"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as MapDateFilter)}
              className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-2 py-2 text-[9px] text-slate-200"
            >
              <option value="ALL">SEMUA TANGGAL</option>
              <option value="TODAY">HARI INI</option>
              <option value="LAST_7_DAYS">7 HARI TERAKHIR</option>
              <option value="CUSTOM">PILIH TANGGAL</option>
            </select>
            {dateFilter === "CUSTOM" && (
              <input
                type="date"
                aria-label="Tanggal annotation"
                value={customDate}
                onChange={(event) => setCustomDate(event.target.value)}
                className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-2 py-2 text-[9px] text-slate-200"
              />
            )}
            {[
              ["MARKER", showMarkers, setShowMarkers],
              ["ANNOTATION", showAnnotations, setShowAnnotations],
              ["LINE", showLines, setShowLines],
            ].map(([label, checked, setter]) => (
              <label
                key={label as string}
                className="flex items-center gap-1 rounded-lg border border-slate-600 bg-[#0b1424]/95 px-2 py-2 text-[9px] text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={checked as boolean}
                  onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)}
                />
                {label as string}
              </label>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowMarkers(true);
                setShowAnnotations(false);
                setShowLines(false);
                setPresentation(false);
              }}
              className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-3 py-2 text-[9px] font-bold text-slate-200"
            >
              MODE MAP
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMarkers(true);
                setShowAnnotations(true);
                setShowLines(true);
                setPresentation(false);
              }}
              className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-3 py-2 text-[9px] font-bold text-slate-200"
            >
              SITUATION
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMarkers(true);
                setShowAnnotations(true);
                setShowLines(true);
                setPresentation(true);
              }}
              className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-3 py-2 text-[9px] font-bold text-slate-200"
            >
              PRESENTATION
            </button>
            <button
              type="button"
              aria-pressed={editable}
              onClick={() => setEditable((value) => !value)}
              className={`rounded-lg border px-3 py-2 text-[9px] font-bold tracking-wider shadow-xl ${editable ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-cyan-400/30 bg-[#0b1424]/95 text-cyan-300"}`}
            >
              {editable ? "SELESAI EDIT" : "EDIT MAP LAYOUT"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetAnnotationLayout();
                setLayout({});
              }}
              className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-3 py-2 text-[9px] font-bold tracking-wider text-slate-200 shadow-xl"
            >
              AUTO ARRANGE
            </button>
            <button
              type="button"
              onClick={() => {
                resetAnnotationLayout();
                setLayout({});
                setActive(null);
                setExpanded(null);
              }}
              className="rounded-lg border border-slate-600 bg-[#0b1424]/95 px-3 py-2 text-[9px] font-bold tracking-wider text-slate-200 shadow-xl"
            >
              RESET LAYOUT
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMarkers(true);
                setShowAnnotations(true);
                setShowLines(true);
                setPresentation(true);
                window.setTimeout(() => window.print(), 100);
              }}
              className="rounded-lg border border-emerald-400/40 bg-[#0b1424]/95 px-3 py-2 text-[9px] font-bold tracking-wider text-emerald-300 shadow-xl"
            >
              EXPORT PDF
            </button>
            {(["PNG", "PPTX"] as const).map((format) => (
              <button
                key={format}
                type="button"
                disabled={exporting !== null}
                onClick={() => void exportMap(format)}
                className="rounded-lg border border-violet-400/40 bg-[#0b1424]/95 px-3 py-2 text-[9px] font-bold tracking-wider text-violet-300 shadow-xl disabled:opacity-50"
              >
                {exporting === format ? `MENYIAPKAN ${format}...` : `EXPORT ${format}`}
              </button>
            ))}
          </div>
          {exportError && (
            <p className="atlas-map-controls pointer-events-auto absolute left-3 top-24 z-[50] rounded-lg border border-rose-400/40 bg-rose-950/95 px-3 py-2 text-[10px] text-rose-200">
              {exportError}
            </p>
          )}
          {showLines && (
            <svg className="absolute inset-0 h-full w-full" aria-hidden>
              {projected.map((p) => (
                <AnnotationLine
                  key={p.item.id}
                  x1={p.marker.x}
                  y1={p.marker.y}
                  x2={p.lineX}
                  y2={p.lineY}
                  color={annotationColor(p.item.category)}
                  active={active === p.item.id || expanded === p.item.id}
                />
              ))}
            </svg>
          )}
          {showAnnotations &&
            projected.map((p) => (
              <SituationAnnotation
                key={p.item.id}
                item={p.item}
                x={p.x}
                y={p.y}
                active={active === p.item.id || expanded === p.item.id}
                expanded={expanded === p.item.id}
                editable={editable}
                presentation={presentation}
                onHover={setActive}
                onToggle={(id: string) => {
                  setExpanded((current) => (current === id ? null : id));
                  setSelected(p.item);
                }}
                onDragStart={startDrag}
                onDrag={drag}
                onDragEnd={endDrag}
              />
            ))}
          <aside className="pointer-events-auto absolute bottom-3 left-3 z-[35] rounded-lg border border-slate-700 bg-[#07111f]/94 p-3 text-[8px] text-slate-300 shadow-xl">
            <p className="font-bold tracking-[.15em] text-cyan-300">REKAPITULASI</p>
            <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
              <dt>WIL TERDAMPAK</dt>
              <dd className="text-right font-bold">
                {new Set(visibleItems.map((item) => item.kodam)).size} KODAM
              </dd>
              <dt>TOTAL KEJADIAN</dt>
              <dd className="text-right font-bold">{visibleItems.length}</dd>
              <dt>PERS SIAGA</dt>
              <dd className="text-right font-bold">
                {visibleItems.reduce((total, item) => total + item.personnel, 0).toLocaleString("id-ID")} ORG
              </dd>
            </dl>
            <div className="mt-2 flex gap-2 border-t border-slate-700 pt-2">
              <span className="text-sky-400">● BENCANA</span>
              <span className="text-orange-400">● KARHUTLA</span>
              <span className="text-yellow-400">● UNRAS</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-700 pt-2">
              <span className="text-emerald-400">● NORMAL</span>
              <span className="text-yellow-300">● WASPADA</span>
              <span className="text-orange-400">● SIAGA</span>
              <span className="text-rose-400">● DARURAT</span>
            </div>
          </aside>
          {selected && (
            <aside className="atlas-map-controls pointer-events-auto absolute bottom-3 right-3 z-[45] w-64 rounded-xl border border-cyan-400/30 bg-[#07111f]/97 p-4 text-[10px] text-slate-300 shadow-2xl">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="float-right text-slate-400"
                aria-label="Tutup detail"
              >
                ×
              </button>
              <p className="font-bold tracking-[.15em] text-cyan-300">DETAIL KEJADIAN</p>
              <p className="mt-3 text-sm font-semibold text-white">{selected.title}</p>
              <dl className="mt-3 grid grid-cols-[70px_1fr] gap-y-2">
                <dt className="text-slate-500">Kodam</dt>
                <dd>{selected.kodam}</dd>
                <dt className="text-slate-500">Kategori</dt>
                <dd>{selected.category}</dd>
                <dt className="text-slate-500">Lokasi</dt>
                <dd>{selected.location}</dd>
                <dt className="text-slate-500">Personel</dt>
                <dd>{selected.personnel.toLocaleString("id-ID")}</dd>
                <dt className="text-slate-500">Status</dt>
                <dd>{selected.status}</dd>
                <dt className="text-slate-500">Update</dt>
                <dd>{selected.updatedAt}</dd>
              </dl>
            </aside>
          )}
        </div>,
        container,
      )}
    </>
  );
}

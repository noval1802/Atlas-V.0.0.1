/**
 * Dokumen BANGSIT dalam bentuk A4.
 *
 * Elemen ini adalah sumber tunggal untuk pratinjau dan ekspor PNG/PPTX.
 * Gaya ditulis inline supaya hasil tangkapan layar sama persis dengan
 * dokumen yang diarsipkan, tanpa bergantung pada kelas utilitas.
 */

export type BangsitDocumentData = {
  reportId: string;
  eventType: string;
  location: string;
  kodam: string;
  date: string;
  time: string;
  status: string;
  latitude: string;
  longitude: string;
  crowd: string;
  personnel: string;
  alut: string;
  chronology: string;
};

const page = {
  width: 794,
  minHeight: 1123,
  padding: "56px 60px 44px",
  background: "#060b16",
  color: "#eef4ff",
  fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
} as const;

const rule = { borderTop: "1px solid #1e293b", margin: "18px 0 0" } as const;

export function BangsitDocument({ data }: { data: BangsitDocumentData }) {
  const crowdLabel =
    data.eventType === "Karhutla" ? "Hotspot" : data.eventType === "Unras" ? "Estimasi massa" : "Terdampak";
  const alutLabel = data.eventType === "Unras" ? "Organisasi" : "Alut";
  const summary = [
    ["Koordinat", `${data.latitude || "-"}, ${data.longitude || "-"}`],
    ["Personel", data.personnel || "0"],
    [crowdLabel, data.crowd || "0"],
    [alutLabel, data.alut || "-"],
  ];

  return (
    <div style={page} data-atlas-document="bangsit">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ color: "#22d3ee", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em" }}>
          ATLAS
        </span>
        <span style={{ color: "#64748b", fontSize: 10, letterSpacing: "0.18em" }}>
          ADVANCED TACTICAL LOCATION &amp; ANALYTICS SYSTEM
        </span>
      </div>
      <p style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.2em", margin: "6px 0 0" }}>
        LAPORAN SITUASI DIGITAL / BANGSIT
      </p>
      <div style={rule} />

      <h1
        style={{
          color: "#eef4ff",
          fontSize: 23,
          fontWeight: 700,
          margin: "26px 0 0",
          lineHeight: 1.25,
        }}
      >
        {`${data.eventType.toUpperCase()} - ${data.location.toUpperCase() || "LOKASI BELUM DIISI"}`}
      </h1>

      <dl style={{ margin: "20px 0 0", fontSize: 11, lineHeight: 1.9, color: "#94a3b8" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <dt style={{ width: 92, color: "#64748b" }}>ID</dt>
          <dd style={{ margin: 0, color: "#cbd5e1", fontFamily: "monospace" }}>{data.reportId}</dd>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <dt style={{ width: 92, color: "#64748b" }}>Kodam</dt>
          <dd style={{ margin: 0, color: "#cbd5e1" }}>{data.kodam}</dd>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <dt style={{ width: 92, color: "#64748b" }}>Waktu</dt>
          <dd style={{ margin: 0, color: "#cbd5e1" }}>
            {data.date} {data.time} WIB
          </dd>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <dt style={{ width: 92, color: "#64748b" }}>Status</dt>
          <dd style={{ margin: 0, color: "#34d399", fontWeight: 700, letterSpacing: "0.08em" }}>
            {data.status}
          </dd>
        </div>
      </dl>

      <h2
        style={{
          color: "#cbd5e1",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          margin: "30px 0 0",
        }}
      >
        RINGKASAN OPERASIONAL
      </h2>
      <table
        style={{
          marginTop: 12,
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 11,
          color: "#cbd5e1",
        }}
      >
        <tbody>
          {summary.map(([label, value]) => (
            <tr key={label}>
              <td
                style={{
                  width: 200,
                  padding: "7px 0",
                  borderBottom: "1px solid #1e293b",
                  color: "#64748b",
                }}
              >
                {label}
              </td>
              <td style={{ padding: "7px 0", borderBottom: "1px solid #1e293b", fontWeight: 600 }}>
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2
        style={{
          color: "#cbd5e1",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          margin: "30px 0 0",
        }}
      >
        KRONOLOGI
      </h2>
      <p
        style={{
          color: "#cbd5e1",
          fontSize: 11,
          lineHeight: 1.9,
          margin: "12px 0 0",
          whiteSpace: "pre-wrap",
        }}
      >
        {data.chronology || "-"}
      </p>

      <div style={{ marginTop: "auto", paddingTop: 40 }}>
        <div style={rule} />
        <p style={{ color: "#64748b", fontSize: 9, margin: "14px 0 0" }}>
          Dokumen dihasilkan dan diarsipkan oleh ATLAS Command Center
        </p>
      </div>
    </div>
  );
}

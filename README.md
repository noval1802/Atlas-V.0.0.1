# ATLAS

**Advanced Tactical Location & Analytics System**

ATLAS adalah MVP aplikasi internal berbentuk command center untuk monitoring situasi nasional, kejadian, wilayah Kodam, early warning, sumber daya, dan laporan operasional.

Dokumen ini mencatat status implementasi aktual per **17 September 2026**. Tata cara menyalakan salinan baru ada di [Menjalankan di perangkat lain](#menjalankan-di-perangkat-lain). Catatan layanan di mesin ini ada di [`docs/operations.md`](docs/operations.md) dan [`docs/MIGRASI.md`](docs/MIGRASI.md).

## Status aplikasi

- Phase 1–6 MVP telah diimplementasikan.
- Deployment produksi menggunakan image standalone Next.js, Nginx HTTPS, PostgreSQL, dan layanan WebSocket.
- PostgreSQL lokal berjalan melalui Docker.
- Dashboard, laporan, sumber daya, user, kejadian, monitoring, alert, titik peta, dan layout annotation memakai PostgreSQL/Prisma. `localStorage` hanya menjadi cache interaksi annotation di browser.
- Phase 1 dokumentasi, Phase 2 autentikasi/otorisasi, Phase 3A–3B SSO, Phase 4A–4B Document Storage, serta security hardening Phase 5 telah diimplementasikan.
- Build, TypeScript, dan ESLint terakhir dinyatakan lulus.

## Menjalankan di perangkat lain

`git clone` mengambil kode aplikasi. Rahasia, sertifikat, basis data yang sedang berjalan, akun Keycloak, dan Nextcloud tidak ada di repositori ini. Clone saja belum menyalakan ATLAS.

Perangkat baru membutuhkan Docker beserta Docker Compose, OpenSSL, serta Node.js 22 dan npm. Image aplikasi memakai Node.js 22. Perintah Prisma dijalankan di mesin tuan rumah, jadi Node.js juga dipasang di sana.

### 1. Ambil kode

```bash
git clone https://github.com/noval1802/Atlas-V.0.0.1.git atlas
cd atlas
```

### 2. Buat rahasia lokal

Salin `.env.example` menjadi dua berkas: `.env` dan `.env.local`. Compose menolak mulai bila salah satu tidak ada. Jangan memasukkan kedua berkas itu ke Git.

Isi `.env`:

- `ATLAS_POSTGRES_PASSWORD`: kata sandi basis data yang baru.
- `DATABASE_URL`: `postgresql://atlas:<kata-sandi-yang-sama>@localhost:5432/atlas?schema=public`. Prisma di mesin tuan rumah memakai alamat ini. Di dalam container, Compose menggantinya dengan host `postgres`.
- `AUTH_SECRET`: paling sedikit 32 karakter acak.
- `NEXT_PUBLIC_APP_URL`: `https://<IP-LAN>`.

Isi `.env.local`:

- `NEXTAUTH_URL`: nilai yang sama dengan `NEXT_PUBLIC_APP_URL`.
- `AUTH_SECRET`: nilai yang sama dengan berkas `.env`.
- `OIDC_PROVIDER_NAME`: nama yang tampil di tombol masuk.
- `OIDC_ISSUER`: `http://<IP-LAN>:8080/realms/atlas`.
- `OIDC_CLIENT_ID`: `atlas`.
- `OIDC_CLIENT_SECRET`: rahasia klien dari Keycloak. Jangan menulis nilainya di README.
- `ENABLE_DEV_LOGIN`: `false` untuk image Docker. Login pengembangan mati karena image memakai `NODE_ENV=production`.
- `DOCUMENT_MAX_UPLOAD_BYTES`: `26214400`.

### 3. Buat sertifikat

```bash
./scripts/generate-local-tls.sh
```

Skrip menulis `deploy/tls/atlas.crt` dan `deploy/tls/atlas.key` untuk IP LAN yang terdeteksi. Sertifikat itu ditandatangani sendiri. Perangkat yang membuka situs perlu mempercayainya. Kedua berkas tidak masuk Git. Untuk memaksa IP tertentu, jalankan `ATLAS_LAN_IP=<ip-baru> ./scripts/generate-local-tls.sh`.

### 4. Nyalakan layanan

```bash
docker compose up -d --build
```

Compose membuat empat layanan: `atlas-postgres` di `127.0.0.1:5432`, `atlas-app` di `127.0.0.1:3000`, `atlas-realtime`, dan `atlas-proxy` di port 80 serta 443. Port 80 mengalihkan ke HTTPS. Port 5432 di mesin tujuan harus kosong.

### 5. Siapkan basis data kosong

```bash
npm install
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

`npm run db:seed` mengisi data awal yang boleh dijalankan ulang. Data itu bukan salinan kejadian, laporan, atau unggahan dari mesin asal.

### 6. Periksa

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -kfsS https://127.0.0.1/login
```

Buka `https://<IP-LAN>/login`.

### Masuk

Akun pengguna ada di Keycloak, bukan di repositori ini. Di mesin asal, Keycloak berada di `/home/localhost/identity` bersama `.env`, realm, dan basis datanya. Tanpa layanan itu, halaman login tampil tetapi tidak ada akun yang bisa dipakai.

Di perangkat baru, salin folder identity itu atau buat realm `atlas` yang baru. Setelah Keycloak hidup, arahkan redirect klien `atlas` ke `https://<IP-baru>/api/auth/callback/oidc` dan `webOrigins` ke `https://<IP-baru>`.

`scripts/sync-lan-address.sh` mengubah URL ATLAS, Keycloak, dan Nextcloud sekaligus. Jalankan hanya bila ketiga layanan sudah ada di mesin yang sama. Skrip itu mencari Keycloak di folder `identity` di sebelah clone, dan Nextcloud di `/home/localhost/nexops`.

### Membawa data yang sudah ada

Untuk menyalin isi mesin asal, pulihkan dump basis data `atlas` dari container `atlas-postgres` setelah Postgres baru sehat, lalu salin volume unggahan Compose. Di mesin asal volume itu bernama `atlas_atlas_kodam_uploads`. Lewati `npm run db:seed` bila dump sudah berisi data operasional.

Nextcloud tidak diperlukan agar pusat komando berjalan. Dokumen kejadian disimpan di disk aplikasi. Salin `/home/localhost/nexops` hanya bila arsip Nextcloud lama juga pindah.

## Stack

- Next.js 16 App Router
- React 19 dan TypeScript strict mode
- Tailwind CSS 4
- Lucide React
- Recharts
- Leaflet dan React Leaflet
- PostgreSQL 16
- Prisma ORM 6
- Zod
- jsPDF
- Docker Compose

## Route aplikasi

| Route            | Modul                                     | Status                                           |
| ---------------- | ----------------------------------------- | ------------------------------------------------ |
| `/login`         | Login MVP                                 | Berfungsi                                        |
| `/dashboard`     | Dashboard nasional                        | Berfungsi                                        |
| `/map`           | Peta situasi dan editor titik             | Berfungsi                                        |
| `/kodam`         | Daftar dan editor Data Kodam              | Berfungsi                                        |
| `/kodam/[id]`    | Detail Kodam                              | Berfungsi                                        |
| `/kejadian`      | Incident Manager                          | PostgreSQL CRUD, RBAC, audit                     |
| `/kejadian/[id]` | Detail kejadian dan dokumen terkait       | Berfungsi dengan PostgreSQL, RBAC, dan Nextcloud |
| `/bangsit`       | Form, preview, generate dan arsip BANGSIT | PDF + Nextcloud berfungsi                        |
| `/bencana`       | Monitoring bencana                        | PostgreSQL CRUD, RBAC, audit                     |
| `/karhutla`      | Monitoring karhutla                       | PostgreSQL CRUD, RBAC, audit                     |
| `/unras`         | Monitoring unjuk rasa                     | PostgreSQL CRUD, RBAC, audit                     |
| `/security`      | Gangguan keamanan                         | PostgreSQL CRUD, RBAC, audit                     |
| `/resources`     | Personel dan alut                         | PostgreSQL CRUD, RBAC, audit                     |
| `/alerts`        | Early warning                             | PostgreSQL API CRUD, RBAC, audit                 |
| `/reports`       | CRUD dan workflow laporan                 | PostgreSQL + PDF berfungsi                       |
| `/my-access`     | Identitas dan izin user aktif             | Berfungsi                                        |
| `/admin`         | User, role, status, scope, dan audit log  | PostgreSQL + audit berfungsi                     |

## Fitur yang sudah selesai

### Layout dan dashboard

- Dark command-center design sebagai default.
- Sidebar responsif dan dapat di-collapse.
- Header dengan jam realtime WIB dan status sistem.
- Status situasi nasional dan enam KPI.
- Tabel kejadian, pencarian, filter, badge status, dan pagination UI.
- Grafik tren kejadian dan panel early warning.

### Data Kodam

- Tersedia 21 data Kodam.
- Data dapat diedit melalui ikon pensil pada kartu Kodam.
- Field editable: nama, kode, wilayah, lokasi, latitude, longitude, status, dan personel.
- Koordinat hasil edit otomatis digunakan pada Dashboard dan Peta Situasi.
- Tombol **Reset data awal** mengembalikan data default.
- Setiap Kodam memiliki logo masing-masing.
- Logo tampil pada kartu, halaman detail, marker, dan popup peta.
- Administrator/operator berizin dapat mengunggah atau mengganti logo melalui form tambah/edit Kotamaops.
- Upload menerima PNG, JPEG, atau WebP maksimal 2 MB, menampilkan preview, lalu memprosesnya menjadi WebP maksimal 512×512.
- Logo upload disimpan pada Docker volume `atlas_kodam_uploads` dan metadata file tersimpan di PostgreSQL.
- Logo upload tetap tersedia setelah rebuild/restart container dan fallback ke logo generik jika belum diunggah.
- Input koordinat tambah/edit Kotamaops menerima paste pasangan `latitude, longitude` atau `latitude;longitude` pada salah satu kolom dan mengisi keduanya otomatis.
- Marker memakai warna status: biru/kondusif, kuning/waspada, merah/siaga.

### Peta Situasi

- Peta Indonesia interaktif berbasis Leaflet.
- Marker Kodam memakai logo Kodam.
- Popup menampilkan nama, kode, wilayah, status, personel, dan koordinat.
- Operator dapat menekan **Tambah Titik**, memilih lokasi langsung pada peta, mengisi form, lalu menyimpan marker.
- Tersedia kategori khusus **Lokasi Kodam**.
- Titik operator dapat dihapus melalui popup.
- Marker kejadian mock lama telah dihapus dari peta.
- Map Situation Annotation aktif untuk data operasional yang dibuat pengguna; card dummy bawaan telah dihapus.
- Setiap data annotation memiliki marker, SVG leader line, dan information card dinamis.
- Leader line diproyeksikan ulang saat peta di-pan, zoom, resize, atau view di-reset.
- Kartu menampilkan field spesifik kategori seperti hotspot/luas, keluarga terdampak, atau estimasi massa.
- Marker, garis, dan kartu terkait saling highlight ketika di-hover.
- Annotation card dapat diklik untuk diperbesar 1,5× dan diklik kembali untuk diperkecil.
- Marker, card, dan leader line tetap ditampilkan individual saat zoom out; data yang berdekatan tidak lagi digabung menjadi cluster.
- Annotation disembunyikan pada layar sempit; marker tetap tersedia untuk menjaga keterbacaan.

### Dynamic Map Annotation

#### Cara menggunakan

1. Buka `/map` pada layar desktop atau laptop.
2. Arahkan mouse ke marker atau card untuk menyorot marker, leader line, dan card terkait.
3. Klik annotation card untuk memperbesar tampilannya menjadi 1,5×.
4. Tekan **EDIT MAP LAYOUT**, lalu geser header card untuk menyesuaikan posisinya.
5. Leader line mengikuti card selama digeser dan posisi manual tetap tersimpan setelah data sumber diperbarui.
6. Tekan **RESET LAYOUT** untuk menghapus seluruh offset manual dan kembali ke posisi otomatis.
7. Card terpilih tetap besar meskipun pointer keluar dari card.
8. Klik card yang sama kembali untuk mengembalikannya ke ukuran normal.
9. Interaksi expand/collapse juga mendukung tombol `Enter` dan `Space`.

#### Perilaku teknis

- Koordinat sumber tetap berupa latitude dan longitude, bukan pixel statis.
- `AnnotationLayer` memakai `latLngToContainerPoint()` untuk mengubah koordinat geografis menjadi posisi layar.
- Event Leaflet `move`, `zoom`, `resize`, dan `viewreset` menjadwalkan proyeksi ulang.
- Pembaruan selama pergerakan dibatasi dengan `requestAnimationFrame` agar tidak membuat render berlebihan.
- SVG leader line menghubungkan marker dengan sisi terdekat annotation card.
- Posisi card dibatasi agar tetap berada di dalam viewport peta.
- Seluruh marker yang lolos filter selalu mengikuti proses Auto Arrange tanpa clustering berdasarkan jarak atau level zoom.
- State hover dan expand dikelola terpisah; card yang diklik tetap tersorot setelah hover selesai.
- Tidak menggunakan `dangerouslySetInnerHTML` untuk data operator.

#### Data annotation

| Kategori |  Jumlah | Informasi utama pada card                                      |
| -------- | ------: | -------------------------------------------------------------- |
| Bencana  | Dinamis | Jenis, lokasi, keluarga terdampak, personel siaga              |
| Karhutla | Dinamis | Hotspot, luas terdampak, personel siaga, alut                  |
| Unras    | Dinamis | Lokasi, waktu, estimasi massa, personel pengamanan, organisasi |

Bentuk data utamanya didefinisikan oleh interface `MapAnnotation` di `src/types/map-annotation.ts`.

#### Status implementasi

| Tahap      | Lingkup                                                         | Status  |
| ---------- | --------------------------------------------------------------- | ------- |
| 1          | Marker, annotation card, leader line, Bencana, Karhutla, Unras  | Selesai |
| 1 tambahan | Hover highlight dan click-to-expand                             | Selesai |
| 2          | Drag card, update leader line, simpan offset, Reset Layout      | Selesai |
| 3          | Collision detection, Auto Arrange, marker/card tetap individual | Selesai |
| 4          | Presentation, PDF/PNG/PPTX, WebSocket + fallback polling        | Selesai |

Catatan: pada tablet dan mobile, annotation card serta leader line disembunyikan untuk mencegah peta terlalu padat. Marker tetap dirender.

#### Sinkronisasi sumber data

Peta Situasi menggunakan unified Map Annotation Store. Sumber berikut mengirim pembaruan secara langsung:

| Sumber       | Perilaku sinkronisasi                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| BANGSIT      | Simpan laporan melakukan upsert annotation berdasarkan laporan, kategori, dan koordinat |
| Kejadian     | Tambah/edit/hapus mengganti annotation sumber Kejadian yang relevan                     |
| Bencana Alam | Tambah/edit/hapus tabel monitoring mengganti annotation Bencana                         |
| Karhutla     | Tambah/edit/hapus tabel monitoring mengganti annotation Karhutla                        |
| Unras        | Tambah/edit/hapus tabel monitoring mengganti annotation Unras                           |

Form BANGSIT, Bencana, Karhutla, Unras, dan Gangguan Keamanan menyediakan latitude serta longitude. Menempel pasangan `latitude, longitude` atau `latitude;longitude` ke salah satu kolom mengisi kedua field otomatis. Store memancarkan event `atlas:annotations-updated`; Peta Situasi berlangganan event tersebut agar marker, leader line, dan card diperbarui tanpa reload.

Ketika data sumber nyata pertama kali disinkronkan, sembilan annotation dummy awal dilepas dari store untuk mencegah duplikasi data operasional.

#### Alur sinkronisasi peta

```text
BANGSIT ──────────┐
Kejadian ─────────┤
Bencana Alam ─────┼──> Map Annotation Store
Karhutla ─────────┤       │
Unras ────────────┘       ├──> event atlas:annotations-updated
                          │
                          └──> Peta Situasi
                               ├── Marker
                               ├── Leader Line
                               └── Annotation Card
```

Aturan operasional:

1. Data hanya dapat muncul di peta jika latitude dan longitude valid.
2. Menyimpan data baru membuat annotation baru berdasarkan `source` dan `sourceId`.
3. Mengedit data mengganti annotation dari sumber yang sama tanpa menggandakan marker.
4. Menghapus data menghapus annotation sumber terkait.
5. Setiap sumber hanya mengganti kelompok datanya sendiri; sinkronisasi Karhutla tidak menghapus data Unras atau BANGSIT.
6. BANGSIT menggunakan mekanisme upsert agar laporan yang disimpan ulang memperbarui marker lama.
7. Kejadian hanya dipetakan jika kategorinya relevan dengan Bencana, Karhutla, atau Unras.

File implementasi sinkronisasi:

- `src/lib/map-annotation-storage.ts`: load, save, replace-source, upsert BANGSIT, dan mapper data sumber.
- `src/hooks/use-map-annotations.ts`: subscription store dan event live update.
- `src/hooks/use-incidents-api.ts`: mengirim perubahan Incident Manager ke store peta.
- `src/components/modules/operational-page.tsx`: mengirim CRUD monitoring Bencana, Karhutla, dan Unras.
- `src/app/bangsit/page.tsx`: mengirim laporan BANGSIT dengan koordinat ke store peta.
- `src/components/map/editable-situation-map.tsx`: mengonsumsi kumpulan annotation aktif.

Layout annotation disimpan ke PostgreSQL melalui `/api/map-annotations/layout`. Perubahan data dipancarkan oleh WebSocket melalui `/ws`; polling berkala tetap tersedia sebagai fallback. `localStorage` hanya dipakai sebagai cache browser agar interaksi drag terasa langsung.

### Kejadian

- Tambah, lihat, edit, hapus, dan pencarian kejadian.
- Field koordinat dan status tersedia.
- Perbaikan: data yang dihapus tidak muncul kembali setelah refresh.
- Kondisi daftar kosong juga tersimpan dengan benar.
- REST API Prisma tersedia untuk GET, POST, PUT, dan DELETE.
- Validasi payload server menggunakan Zod.
- Detail kejadian PostgreSQL menyediakan panel **Dokumen Terkait** untuk list, upload, dan download.
- Koordinat marker dan line card Kejadian selalu diambil dari koordinat Kodam terpilih; input koordinat manual tidak digunakan.
- Upload dibatasi berdasarkan role serta scope Kodam; operator Kodam XII hanya dapat mengakses kejadian `XII/TPR`.
- Folder Nextcloud memakai kode aman, misalnya `XII/TPR` menjadi `KODAM_XII_TPR`.

### Laporan

- Daftar laporan dengan filter UI.
- Download PDF nyata menggunakan jsPDF.
- Laporan uji dengan dokumentasi gambar tersedia di `/downloads/ATLAS-laporan-uji.pdf`.
- PDF telah diverifikasi sebagai PDF 1 halaman dan dapat diakses melalui HTTP.

### BANGSIT dan Nextcloud

- Form BANGSIT menghasilkan PDF nyata di backend dan tetap menyinkronkan annotation ke Peta Situasi.
- PDF disimpan ke folder Nextcloud per Kodam/tahun/bulan dan referensinya dicatat pada tabel `BangsitArchive`.
- List, generate, dan download ditegakkan dengan permission serta scope Kodam di backend.
- Generate dan download dicatat ke `AuditLog` dengan correlation ID.
- Tombol PNG dan PPTX dinonaktifkan sampai generator format tersebut tersedia.
- Input koordinat mendukung paste pasangan koordinat pada kolom Latitude maupun Longitude dan memvalidasi batas geografis sebelum laporan disimpan.

### Monitoring Unras

- `Estimasi Massa`, `Personel Pengamanan`, dan `Organisasi` disimpan sebagai data terpisah.
- Nama organisasi tidak lagi diparsing sebagai angka massa atau personel.
- API mewajibkan estimasi massa dan personel pengamanan untuk record Unras baru serta menolak nilai negatif.
- Card Peta Situasi menampilkan massa, personel pengamanan, dan organisasi dari field terstruktur.

### Database dan keamanan dasar

- PostgreSQL 16 tersedia melalui `docker-compose.yml`.
- Prisma schema mencakup User, Kodam, Incident, Alert, Resource, Report, dan AuditLog.
- Seed membuat 21 Kodam dan satu akun administrator MVP.
- Login API melakukan validasi kredensial dan membuat cookie HTTP-only.
- Struktur role tersedia untuk Administrator, Operator Pusdalops, Operator Kodam, dan Pimpinan.
- Prisma ditahan pada versi 6.12.0 untuk menghindari advisory dependency yang ditemukan pada versi lebih baru saat implementasi.
- Audit log aktif untuk create/update/delete kejadian dan upload dokumen, termasuk old/new value, correlation ID, IP, dan user-agent.
- Mutasi API memiliki pemeriksaan origin, validasi Content-Type/JSON, dan rate limit per IP/route.
- Security headers global aktif melalui konfigurasi Next.js.

## Arsitektur penyimpanan data

Data operasional utama sudah memakai PostgreSQL. Cache browser annotation dipertahankan untuk respons drag lokal.

| Data                | Penyimpanan saat ini                                      | Dampak                                                        |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| Edit Data Kodam     | PostgreSQL melalui `/api/kodams`                          | Multi-user, scoped, dan diaudit                               |
| Logo Kotamaops      | Docker volume `atlas_kodam_uploads` + metadata PostgreSQL | Persisten antarrebuild, scoped, tervalidasi, dan diaudit      |
| Kejadian dari UI    | PostgreSQL melalui `/api/incidents`                       | Multi-user, scoped, dokumen terkait tetap tersedia            |
| Titik manual peta   | PostgreSQL `MapPoint` melalui `/api/map-points`           | Multi-user, divalidasi, berizin, dan diaudit                  |
| Kodam seed          | PostgreSQL melalui Prisma                                 | Tersedia untuk backend/API                                    |
| Incident API        | PostgreSQL melalui Prisma                                 | API dan Incident Manager aktif                                |
| Dashboard analitik  | PostgreSQL (`Incident`, `Alert`, `OperationalRecord`)     | KPI, tren, kejadian, dan early warning dihitung dari database |
| Monitoring Bencana  | PostgreSQL `OperationalRecord`                            | CRUD multi-user dan audit aktif                               |
| Monitoring Karhutla | PostgreSQL `OperationalRecord`                            | CRUD multi-user dan audit aktif                               |
| Monitoring Unras    | PostgreSQL `OperationalRecord`                            | CRUD multi-user dan audit aktif                               |
| Annotation Peta     | PostgreSQL `MapAnnotationLayout` + cache `localStorage`   | Offset lintas operator dan gabungan seluruh sumber annotation |
| Personel & Alut     | PostgreSQL `Resource`                                     | CRUD scoped dan diaudit                                       |
| Laporan             | PostgreSQL `Report`                                       | Draft/publish/archive scoped dan diaudit                      |

Migrasi Prisma formal tersedia di `prisma/migrations`; gunakan `npx prisma migrate deploy`, bukan `db push`, untuk deployment.

## API

| Method       | Endpoint                        | Fungsi                                        |
| ------------ | ------------------------------- | --------------------------------------------- |
| `GET`        | `/api/incidents`                | Mengambil maksimal 100 kejadian               |
| `POST`       | `/api/incidents`                | Membuat kejadian dengan validasi Zod          |
| `GET`        | `/api/incidents/[id]`           | Mengambil detail kejadian                     |
| `PUT`        | `/api/incidents/[id]`           | Memperbarui kejadian                          |
| `DELETE`     | `/api/incidents/[id]`           | Menghapus kejadian                            |
| `GET/POST`   | `/api/monitoring/[module]`      | Daftar dan tambah data monitoring             |
| `PUT/DELETE` | `/api/monitoring/[module]/[id]` | Edit dan hapus data monitoring                |
| `GET/POST`   | `/api/kodams`                   | Daftar atau tambah Kotamaops sesuai izin      |
| `PUT/DELETE` | `/api/kodams/[id]`              | Edit atau hapus Kotamaops sesuai izin         |
| `GET/POST`   | `/api/kodams/[id]/logo`         | Membaca atau mengunggah logo WebP tervalidasi |

## Struktur penting

```text
atlas/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── branding/
│   ├── downloads/
│   └── kodam/              # 21 logo Kodam
├── uploads/
│   └── kodam/              # Penyimpanan logo saat development
├── scripts/
│   └── generate-test-report.ts
├── src/
│   ├── app/                # route UI dan API
│   ├── components/
│   │   ├── dashboard/
│   │   ├── incidents/
│   │   ├── kodam/
│   │   ├── layout/
│   │   ├── map/
│   │   ├── modules/
│   │   ├── reports/
│   │   └── ui/
│   ├── data/               # mock/seed source
│   ├── hooks/              # persistence hooks
│   ├── lib/                # Prisma, auth, storage, validasi
│   └── types/
├── docker-compose.yml
└── .env.example
```

## File utama untuk pengembangan

- `src/data/kodam.ts`: sumber awal 21 Kodam dan path logo.
- `src/components/kodam/kodam-manager.tsx`: editor Data Kodam.
- `src/kodams/client.ts`: mapper dan client API Data Kodam.
- `src/kodams/logo-client.ts`: validasi, resize, preview, konversi WebP, dan upload logo di browser.
- `src/kodams/logo-storage.ts`: penyimpanan file logo persisten pada server.
- `src/app/api/kodams/[id]/logo/route.ts`: endpoint baca/upload logo dengan RBAC dan audit.
- `src/components/map/kodam-markers.tsx`: marker berlogo untuk Dashboard dan Peta.
- `src/components/map/editable-situation-map.tsx`: editor titik langsung pada peta.
- `src/components/map/annotation-layer.tsx`: proyeksi geografis dan koordinasi overlay annotation.
- `src/components/map/situation-marker.tsx`: marker kejadian annotation.
- `src/components/map/situation-annotation.tsx`: information card per kategori.
- `src/components/map/annotation-line.tsx`: SVG leader line.
- `src/types/map-annotation.ts`: tipe kategori, status, posisi, dan data spesifik annotation.
- `src/components/incidents/incident-manager.tsx`: UI CRUD kejadian.
- `src/hooks/use-incidents-api.ts`: CRUD Kejadian melalui API PostgreSQL.
- `src/components/reports/download-report-button.tsx`: generator PDF.
- `prisma/schema.prisma`: model database.
- `src/app/api/incidents/`: REST API kejadian.

## Verifikasi sebelum commit atau deployment

```bash
npm test
npm run format:check
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev --audit-level=high
```

Verifikasi database:

```bash
docker compose ps
npx prisma validate
npm run db:seed
```

## Keterbatasan dan roadmap

- Pindahkan cache annotation terakhir ke state server/realtime push; `localStorage` hanya dipakai untuk respons drag instan.
- Provision Keycloak/IdP organisasi dan isi konfigurasi OIDC production ATLAS.
- Terapkan helper RBAC yang sama pada Route Handler selain modul kejadian saat modul tersebut dipindahkan dari `localStorage` ke API.
- Tambahkan provisioning/share folder Nextcloud per grup Kodam setelah rancangan migrasi grup disetujui; pertahankan login break-glass.
- Tambahkan generator dan arsip BANGSIT format PNG serta PPTX; PDF sudah aktif.
- Perluas dokumen terkait ke modul selain kejadian dan tambahkan penghapusan/versi dokumen dengan audit log.
- Tambahkan PostGIS untuk query geospasial.
- Terapkan HTTPS, CSP berbasis nonce/hash, trusted proxy, serta Redis rate limiter untuk deployment multi-instance.
- Tambahkan test unit, integration, API, dan end-to-end.
- Pindahkan workflow laporan statis ke PostgreSQL dan lengkapi approval/publish.
- Tambahkan backup/restore terjadwal untuk volume `atlas_kodam_uploads` bersama backup PostgreSQL.
- Tambahkan test end-to-end browser untuk upload logo dan interaksi drag annotation.

## Catatan perubahan

### 20 Oktober 2026

- Menulis tata cara menjalankan salinan baru dari `git clone` di bagian Menjalankan di perangkat lain. Rahasia, sertifikat, basis data hidup, dan Keycloak tetap di luar Git. Tidak ada migrasi skema.

### 17 September 2026

- Menonaktifkan clustering annotation; marker, card, dan leader line yang berdekatan tetap tampil individual pada seluruh level zoom.
- Mempertahankan Auto Arrange, drag card, offset manual, dan penyimpanan layout setelah clustering dihapus.
- Memisahkan `Estimasi Massa` dan `Personel Pengamanan` Unras menjadi field PostgreSQL terstruktur; organisasi tidak lagi digunakan sebagai sumber angka.
- Menampilkan personel pengamanan pada card Unras serta menambahkan validasi API untuk field Unras baru.
- Menyamakan metode input koordinat pada tambah/edit Kotamaops, BANGSIT, Bencana, Karhutla, Unras, dan Gangguan Keamanan: paste satu pasangan mengisi latitude/longitude sekaligus.
- Menambahkan upload logo pada form tambah/edit Kotamaops dengan preview, validasi PNG/JPEG/WebP maksimal 2 MB, dan konversi browser ke WebP maksimal 512×512.
- Menambahkan endpoint `/api/kodams/[id]/logo`, metadata logo PostgreSQL, RBAC, rate limit, audit log, pemeriksaan signature WebP, dan fallback logo generik.
- Menambahkan Docker volume `atlas_kodam_uploads` agar logo bertahan setelah rebuild atau restart container.
- Memverifikasi migrasi Prisma, TypeScript, ESLint, 52 automated tests, build produksi, izin tulis volume, dan health check HTTPS.

### 25 Agustus 2026

- Mereset penyimpanan line card ke versi `v2` agar seluruh card lama/ujicoba tidak lagi dirender, tanpa menghapus arsip PDF BANGSIT.
- Menampilkan dan mewajibkan latitude/longitude valid pada form monitoring agar input Karhutla, Bencana, dan Unras dapat menghasilkan marker serta line card.
- Memperbaiki sinkronisasi penghapusan card: Peta Situasi kini merekonsiliasi Kejadian, Bencana Alam, Karhutla, dan Unras langsung dari API setiap kali halaman dibuka.
- Menghapus seluruh annotation/card dummy bawaan dan file sumber dummy; Peta Situasi sekarang bersih sampai pengguna membuat data sendiri.
- Menambahkan pembersihan aman untuk card dummy lama di browser tanpa menghapus card BANGSIT atau record operasional buatan pengguna.
- Mengubah form Kejadian agar marker dan line card otomatis mengikuti pusat koordinat Kodam terpilih.
- Menegakkan aturan koordinat Kodam di backend; payload uji `0,0` untuk Kodam XII tersimpan sebagai `-0.02,109.34`.
- Menyelesaikan item 1 migrasi Bencana, Karhutla, Unras, Kejadian, dan Data Kodam dari penyimpanan browser ke PostgreSQL.
- Menambahkan `OperationalRecord`, API monitoring generik, API Kodam, validasi, permission, scope, rate limit, dan audit.
- Mengalihkan Incident Manager, editor/detail Kodam, serta marker Kodam ke database bersama.
- Menghapus hook/helper `localStorage` lama untuk Kejadian dan Data Kodam.
- Memverifikasi CRUD nyata seluruh modul dan membuat report `docs/reports/item-1-postgresql-migration-2026-08-25.md`.
- Memperbaiki basemap Leaflet yang tidak terlihat setelah security hardening dengan allowlist CSP terbatas untuk `https://*.basemaps.cartocdn.com`.

### 24 Agustus 2026

- Menstandarkan seluruh source TypeScript/TSX/CSS dengan Prettier dan menambahkan script `format` serta `format:check`.
- Memecah authorization kejadian ke service `src/incidents/access.ts` dan memusatkan respons/error API pada `src/http/api-response.ts`.
- Merapikan Route Handler incident dan dokumen agar alur authentication, scope, validasi, persistence, serta audit mudah ditinjau.
- Menambahkan 10 automated tests untuk RBAC, scope Kodam, validasi BANGSIT, struktur folder, dan penolakan path traversal; seluruhnya lulus.
- Menyelesaikan Phase 6 PDF: generate BANGSIT server-side, arsip WebDAV Nextcloud, referensi PostgreSQL, download proxy, dan audit.
- Menambahkan model `BangsitArchive` serta permission `bangsit:read/create/export`.
- Memperbarui UI BANGSIT dengan progress, error, status arsip, dan tombol download PDF nyata; PNG/PPTX ditandai belum tersedia.
- Memverifikasi generate scope XII HTTP 201, scope Kodam III HTTP 403, dan download PDF 1 halaman HTTP 200.
- Menambahkan dokumentasi `docs/integration/bangsit-archive.md`.
- Menyelesaikan Phase 5 awal: audit log database, origin/CSRF check, rate limiting, validasi JSON, dan security headers.
- Memperluas `AuditLog` secara non-destruktif dengan old/new value, user-agent, correlation ID, serta index pencarian.
- Menghubungkan audit ke create/update/delete kejadian dan upload dokumen.
- Memverifikasi cross-origin HTTP 403, mutasi sah HTTP 200, audit tersimpan, dan upload request ke-21 HTTP 429.
- Menambahkan panduan dan batas deployment di `docs/integration/security.md`.
- Menyelesaikan Phase 4B awal dengan halaman detail kejadian dan UI daftar/upload/download dokumen terkait.
- Menambahkan kejadian uji `INC-0822-07` untuk Kodam `XII/TPR` ke seed PostgreSQL dan migrasi satu kali data browser tanpa menghidupkan kembali data yang pernah dihapus.
- Menormalisasi scope lama `KODAM-XII` menjadi kode resmi `XII/TPR`, termasuk saat memeriksa sesi SSO lama.
- Mengubah folder dokumen menjadi segment aman `PUSDALOPS/KODAM_XII_TPR/KEJADIAN/{ID}`.
- Memverifikasi scope nyata: data sendiri HTTP 200, data Kodam III HTTP 403.
- Memverifikasi upload gambar uji HTTP 201 dan download HTTP 200; SHA-256 sumber dan hasil download identik.
- Membungkus client login berbasis `useSearchParams` dengan `Suspense` agar prerender Next.js 16 dan build produksi lulus.
- Menambahkan Phase 4A `DocumentStorageService` dan implementasi WebDAV Nextcloud server-side.
- Menambahkan akun teknis `atlas-service` dan app password revocable tanpa memasukkan akun ke grup operasional.
- Menambahkan model `DocumentReference` serta endpoint list/upload/download dokumen per kejadian.
- Menambahkan permission dokumen, validasi tipe/ukuran/path, dan authorization scope Kodam sebelum akses file.
- Memverifikasi koneksi read-only WebDAV; tidak menambahkan file dummy ke data operasional.
- Menyelesaikan Phase 3B dengan `user_oidc` 8.10.1 sebagai alternative login Nextcloud 31.
- Mempertahankan login lokal/break-glass Nextcloud dan seluruh user, grup, serta file existing.
- Memverifikasi login OIDC `operator_xii` sampai dashboard Nextcloud dan SSO ke ATLAS tanpa password kedua.
- Memverifikasi session nyata `OPERATOR_KODAM`/`KODAM-XII`, API scope sendiri 200, dan scope lain 403.
- Menambahkan backup config pra-OIDC dan prosedur rollback tanpa menghapus data.
- Menambahkan stack identity terpisah di `/home/localhost/identity` menggunakan Keycloak 26.7.1 dan PostgreSQL 16.
- Menambahkan realm deklaratif, client terpisah ATLAS/Nextcloud, role, group, scope Kodam, dan akun uji dengan secret acak yang tidak dicetak.
- Menghubungkan konfigurasi OIDC lokal ATLAS ke realm Keycloak dan memverifikasi health, discovery, realm import, serta authorization redirect.
- Menahan perubahan login Nextcloud sampai callback SSO ATLAS diuji interaktif melalui browser.
- Menambahkan Auth.js dengan generic OIDC, authorization-code flow, PKCE, dan state validation.
- Mengganti login dummy dengan tombol SSO dan development login yang dikontrol ENV serta dipaksa nonaktif di production.
- Menambahkan session profile dinamis, tombol logout, dan proteksi page berbasis `proxy.ts` Next.js 16.
- Menambahkan enam role ATLAS, matriks permission terpusat, group mapping, dan claim `kodamScope`.
- Menegakkan HTTP 401/403, permission, filter scope, dan validasi Kodam pada REST API kejadian.
- Memperluas model User untuk identitas eksternal tanpa menyimpan password IdP.
- Menambahkan lima dokumen integrasi di `docs/integration/`.
- Memperbarui schema PostgreSQL dan seed administrator legacy menjadi role `ADMIN` tanpa password lokal database.
- Memverifikasi TypeScript, ESLint, build production, login/session/logout, serta matriks ADMIN, Operator Kodam XII, dan PIMPINAN.
- Tidak mengubah autentikasi atau data Nextcloud pada Phase 2.

### 23 Agustus 2026

- Memperbaiki persistence Incident Manager agar data terhapus tidak kembali setelah refresh.
- Menambahkan editor Data Kodam lengkap dengan latitude dan longitude.
- Menghubungkan koordinat Kodam ke marker Dashboard dan Peta Situasi.
- Menambahkan 21 logo resmi yang disediakan pengguna.
- Mengubah marker Kodam menjadi pin berlogo dan berwarna berdasarkan status.
- Menambahkan editor titik langsung melalui UI Peta Situasi.
- Menghapus marker kejadian bawaan lama dari peta.
- Mengaktifkan download PDF laporan dan membuat laporan uji dengan dokumentasi gambar.
- Menambahkan Dynamic Map Annotation Tahap 1 pada Peta Situasi.
- Menambahkan 9 annotation dummy untuk Bencana, Karhutla, dan Unras.
- Menambahkan SVG leader line yang tetap tersambung ketika pan, zoom, dan resize.
- Menambahkan kartu informasi spesifik kategori dan hover highlight terkait.
- Menambahkan interaksi klik untuk memperbesar dan memperkecil annotation card.
- Menambahkan CRUD melalui UI pada monitoring Bencana Alam, Karhutla, dan Unras.
- Menambahkan persistence browser agar data monitoring yang diedit atau dihapus tidak kembali setelah refresh.
- Menambahkan pencarian, modal tambah/edit, konfirmasi hapus, empty state, dan Reset Data Awal pada tabel monitoring.
- Menambahkan unified Map Annotation Store untuk sinkronisasi BANGSIT, Kejadian, Bencana, Karhutla, dan Unras.
- Menambahkan latitude/longitude pada form sumber yang membutuhkan koordinat peta.
- Menambahkan live update marker, leader line, dan card melalui event aplikasi tanpa reload.

### 22 Agustus 2026

- Menyelesaikan Phase 1–2: layout, login, dashboard, KPI, peta, tabel, alert, dan chart.
- Menyelesaikan Phase 3–4: Kodam, Kejadian, BANGSIT, Bencana, Karhutla, Unras, dan sumber daya.
- Menyelesaikan fondasi Phase 5–6: PostgreSQL, Prisma, API CRUD, login API, role mock, laporan, dan audit log UI.
- Memperbaiki schema Prisma yang gagal diparsing.
- Memperbaiki batas Server/Client Component pada dashboard operasional.
- Menurunkan Prisma ke 6.12.0 setelah audit dependency menemukan advisory pada versi sebelumnya.

## Aturan pencatatan berikutnya

Saat melakukan perubahan baru:

1. Perbarui status route atau fitur terkait.
2. Catat sumber penyimpanan datanya.
3. Tambahkan entry tanggal pada bagian **Catatan perubahan**.
4. Catat migrasi database atau perubahan environment variable.
5. Jalankan seluruh perintah verifikasi sebelum menandai pekerjaan selesai.

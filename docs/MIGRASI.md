# ATLAS — catatan sistem dan panduan migrasi

Disusun: **30 September 2026**

Dokumen ini menggabungkan empat brief asli dan mencocokkannya dengan kode serta layanan yang benar-benar berjalan pada tanggal di atas. Empat brief itu tetap disimpan sebagai arsip permintaan, bukan sebagai status terkini:

| Brief asli | Isi |
|---|---|
| `ATLAS.txt` | Spesifikasi MVP command center: menu, dashboard, peta, BANGSIT, role, dan skema data. |
| `Atlas & NextCloud.txt` | Rencana satu identitas untuk ATLAS dan Nextcloud, RBAC, scope Kodam, dan arsip dokumen. |
| `Tambahkan fitur Dynamic.txt` | Peta situasi: marker, garis penghubung, kartu keterangan, drag, filter, dan ekspor. |
| `README-AUDIT-ATLAS.md` | Audit 29 Agustus 2026 yang membandingkan brief dengan kode pada saat itu. |

Audit 29 Agustus menyatakan integrasi Nextcloud selesai dan proxy sehat di IP LAN lama. Itu tidak lagi berlaku. Perubahan setelah audit dicatat di bagian [Riwayat yang wajib dibawa saat migrasi](#riwayat-yang-wajib-dibawa-saat-migrasi).

Nama sistem: **ATLAS — Advanced Tactical Location & Analytics System**. Tagline yang diminta di brief: *Integrated Situational Awareness & Operational Analytics Platform*.

## Keputusan yang sedang berlaku

ATLAS adalah aplikasi operasional. Nextcloud (folder dan layanan bernama Nexops) adalah aplikasi dokumen yang **berdiri sendiri**. Keduanya tidak lagi saling memanggil.

- Data kejadian, Kotamaops, laporan, pengguna, dan audit ada di PostgreSQL ATLAS.
- File kejadian dan PDF BANGSIT yang baru disimpan di disk ATLAS (`DOCUMENT_STORAGE_DIR`), bukan lewat WebDAV.
- Login ATLAS memakai Keycloak realm `atlas`. Password tidak dibaca dari database Nextcloud.
- Nextcloud boleh tetap hidup untuk arsipnya sendiri. Mematikan atau memindahkan Nextcloud tidak menghapus database ATLAS.

Kolom database `nextcloudFileId` masih ada. Nama itu warisan. Isinya sekarang hash berkas lokal, bukan ID file Nextcloud.

## Peta folder — ini yang paling mudah salah saat pindah server

Ada dua pohon folder. Jangan menganggap keduanya sama.

| Path | Peran pada 1 Oktober 2026 |
|---|---|
| `/home/localhost/Project/atlas` | **Sumber kode ATLAS yang dipakai container.** Compose, Dockerfile, env, sertifikat, dan skrip ada di sini. |
| `/home/localhost/identity` | **Keycloak yang sedang berjalan.** Bukan di dalam `Project/`. Realm, `.env`, dan data PostgreSQL Keycloak ada di sini. |
| `/home/localhost/nexops` | **Nextcloud yang sedang berjalan.** Compose, skrip, `.env`, `data/`, dan `db/` ada di sini. Dipindah dari `Project/nexops` pada 1 Oktober 2026. |
| `/home/localhost/nexops-instalasi-kosong-20261001` | Instalasi kosong yang sempat dibuat hari ini saat container menyala pada folder data baru. Hanya akun `admin` dan berkas bawaan. Tidak dilayani. |
| `/home/localhost/atlas` | Sisa deploy lama. `deploy/nginx.conf` di sini berupa **folder kosong**, bukan file. Proxy yang dulu diikat ke path ini gagal start. Jangan dipakai lagi. |

Volume Docker yang menyimpan data ATLAS:

| Volume | Isi |
|---|---|
| `atlas_atlas_postgres_data` | Database PostgreSQL aplikasi ATLAS. |
| `atlas_atlas_kodam_uploads` | Logo Kotamaops dan arsip dokumen di `/app/uploads`. |

Data Nextcloud yang hidup ada di bind mount `/home/localhost/nexops/data` dan `/home/localhost/nexops/db`. Compose-nya ada di folder yang sama. Bukan volume bernama.

## Layanan yang hidup

Dicek 30 September 2026. Health aplikasi: `{"status":"ok","database":"connected"}`.

| Layanan | Container | Alamat | Catatan |
|---|---|---|---|
| ATLAS | `atlas-app` | `127.0.0.1:3000`, pintu publik `https://192.168.2.132` | Hanya jaringan `atlas_default`. |
| Proxy | `atlas-proxy` | `80` dan `443` | Nginx memakai `Project/atlas/deploy/nginx.conf` dan sertifikat untuk IP `192.168.2.132`. |
| Realtime | `atlas-realtime` | internal `3001` | WebSocket lewat proxy di path `/ws`. |
| PostgreSQL ATLAS | `atlas-postgres` | `127.0.0.1:5432` | Postgres 16. |
| Keycloak | `atlas-keycloak` | `http://192.168.2.132:8080` | Keycloak 26.7.1, perintah `start-dev`. Realm `atlas`. |
| Database Keycloak | `atlas-keycloak-db` | internal | Postgres 16, data di `/home/localhost/identity/data/postgres`. |
| Nextcloud | `nexops-app-1` | `http://127.0.0.1:8081` | Nextcloud 31.0.14. Tidak dipakai ATLAS. |
| MariaDB dan Redis | `nexops-db-1`, `nexops-redis-1` | internal | Hanya untuk Nextcloud. |

Membuka `http://127.0.0.1:3000/login` dialihkan ke `https://192.168.2.132/login`. Sertifikat ditandatangani sendiri. Browser menampilkan peringatan; itu diharapkan untuk sertifikat LAN ini.

Akun uji ada di `Project/atlas/CREDENTIALS.local.txt`. Jangan menyalin password ke dokumen lain. Username aplikasi: `atlas_admin`, `operator_xii` (scope Kodam XII/TPR), `pimpinan`. Login development dimatikan (`ENABLE_DEV_LOGIN=false`) karena `NODE_ENV=production`.

### Isi database saat catatan ini dibuat

| Data | Jumlah |
|---|---|
| Kotamaops | 22, termasuk Kodaeral V di luar 21 Kodam pada brief awal |
| Kejadian | 12 |
| Catatan operasional bencana / karhutla / unras | 4 / 6 / 6 |
| Early warning | 3 |
| Laporan | 5 |
| Arsip BANGSIT | 1 metadata |
| Titik peta (`MapPoint`) | 0 |
| Referensi dokumen | 0 |
| Offset layout anotasi | 0 |

Contoh data bencana yang masih ada: Gempa M 4,2 di Jayapura, banjir Makassar, longsor Bogor, cuaca ekstrem Semarang. Gempa bukan menu sendiri. Gempa masuk di Bencana Alam dan di daftar Kejadian.

PDF dari satu arsip BANGSIT lama (`PUSDALOPS/KODAM_XII_TPR/BANGSIT/2026/08/BANGSIT-20260824-1030-XII-TPR.pdf`) tidak ditemukan di data Nextcloud yang terpasang. Metadata-nya tetap di PostgreSQL. Unduhan arsip itu kosong sampai PDF dibuat ulang dari halaman BANGSIT.

## Stack yang terpasang

Brief meminta Next.js, React, TypeScript, Tailwind, shadcn/ui, Lucide, Recharts, MapLibre atau Leaflet, API Next.js, PostgreSQL, dan Prisma. Yang terpasang:

| Bagian | Kenyataan |
|---|---|
| Aplikasi | Next.js 16.3.2 App Router, React 19.2.8, TypeScript |
| Gaya | Tailwind. Komponen UI ditulis sendiri, bukan paket shadcn. |
| Ikon dan grafik | Lucide, Recharts |
| Peta | Leaflet 1.9.4 dan react-leaflet, bukan MapLibre |
| Auth | NextAuth 4.24 dengan provider OIDC ke Keycloak |
| Data | Prisma 6, PostgreSQL 16. Koordinat berupa `Float`. PostGIS tidak dipasang. |
| Validasi | Zod |
| PDF dan ekspor peta | jsPDF, html-to-image, PPTX dibuat di `src/lib/pptx-map-export.ts` |
| Realtime | Server `ws` di `realtime/server.mjs` |
| Backend terpisah FastAPI | Belum. Seluruh API masih route Next.js. |

Perintah di `Project/atlas`: `npm test`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run db:generate`.

## Fungsi yang sudah ada

### Menu

Sidebar di `src/components/layout/sidebar.tsx`:

1. Dashboard Nasional `/dashboard`
2. Peta Situasi `/map`
3. BANGSIT `/bangsit`
4. Kejadian `/kejadian`
5. Bencana Alam `/bencana`
6. Karhutla `/karhutla`
7. Unras `/unras`
8. Gangguan Keamanan `/security`
9. Personel & Alut `/resources`
10. Early Warning `/alerts`
11. Laporan `/reports`
12. Data Kotamaops `/kodam` dan detail `/kodam/[id]`
13. Akses Saya `/my-access` (tambahan di luar brief awal)
14. Administration `/admin`

Tampilan dark, sidebar bisa dilipat, header punya jam dan status sistem. Halaman utama `/` mengarah ke dashboard.

### Dashboard

- Status situasi nasional dan kartu KPI yang membaca database.
- Peta dengan marker Kodam dan marker kejadian.
- Tabel kejadian terbaru: cari, filter status, urut kolom, halaman 10 baris.
- Panel early warning.
- Grafik kejadian.

Sebagian angka modul operasional masih lewat model generik `OperationalRecord`, bukan satu tabel khusus per jenis bencana.

### Data dan API

Model Prisma: `User`, `Kodam`, `OperationalRecord`, `Incident`, `DocumentReference`, `Alert`, `Resource`, `Report`, `BangsitArchive`, `AuditLog`, `MapAnnotationLayout`, `MapPoint`.

API mencakup kejadian, titik peta, sumber daya, Kotamaops (termasuk unggah logo), pengguna, laporan, alert, dan BANGSIT. Logo Kotamaops tersimpan di volume upload. Otorisasi dicek di server, bukan hanya dengan menyembunyikan tombol. Scope Kodam menolak permintaan lintas wilayah dengan 403.

Role: `SUPER_ADMIN`, `ADMIN`, `OPERATOR_PUSDALOPS`, `OPERATOR_KODAM`, `ANALYST`, `PIMPINAN`. Pemetaan grup Keycloak terpusat di `src/auth/group-mapping.ts`. Pengguna lokal menyimpan metadata aplikasi dan `externalIdentityId`. Password IdP tidak disimpan.

Audit log menyimpan aksi, entitas, nilai lama dan baru, IP, user agent, dan correlation id.

### Peta situasi dinamis

Ini jawaban brief `Tambahkan fitur Dynamic.txt`. Sebagian besar tahap 1 sampai 4 sudah ada di `src/components/map/` dan `src/lib/annotation-layout.ts`.

Yang sudah jalan:

- Marker, kartu keterangan, dan leader line SVG yang mengikuti geser serta zoom peta. Bukan gambar statis.
- Kategori Bencana, Karhutla, dan Unras, dengan warna status.
- Posisi otomatis dan posisi manual, termasuk diagonal.
- Geser kartu (offset disimpan), reset layout, dan auto-arrange dengan deteksi tabrakan sederhana.
- Toggle marker, anotasi, dan garis.
- Filter kategori, Kodam, status, dan tanggal.
- Mode presentasi.
- Cluster sederhana saat zoom jauh.
- Hover yang menonjolkan marker dan kartunya, serta klik untuk detail.
- Ekspor PNG dan PPTX dari halaman peta.
- Invalidasi realtime lewat WebSocket untuk titik peta dan anotasi.
- Tipe `MapAnnotation` di `src/types/map-annotation.ts`.

### BANGSIT dan dokumen

- Form BANGSIT menghasilkan PDF di server ATLAS.
- PDF baru ditulis ke folder `PUSDALOPS/KODAM_.../BANGSIT/tahun/bulan/` di disk ATLAS.
- Pratinjau menampilkan ringkasan dan dapat mengirim titik ke peta.
- Dokumen terkait pada detail kejadian diunggah lewat API ATLAS (PDF, PNG, JPEG, PPTX, batas 25 MB) dan diunduh hanya setelah cek hak akses.

### Keamanan yang sudah dipasang

- HTTPS di proxy, cookie sesi lewat NextAuth, validasi Zod, batas ukuran unggah, dan rate limit mutasi di `src/security/request-security.ts`.
- Path dokumen ditolak jika berisi `..` atau keluar dari root arsip.
- Health check `/api/health` tidak ikut dialihkan ke host kanonik. Halaman lain dialihkan jika header `Host` bukan host di `NEXTAUTH_URL`.

## Yang belum terpenuhi

Ini selisih antara brief dan kode pada 30 September 2026.

| Permintaan | Keadaan | Alasan ini menghambat lanjutan |
|---|---|---|
| Satu login untuk ATLAS dan Nextcloud | Belum dibuktikan sebagai sesi bersama. Setelah pindah 1 Oktober 2026, instance yang di-mount memakai `user_oidc` 8.10.1 dan punya akun `atlas-service`. | Brief menginginkan satu sesi IdP. ATLAS sudah SSO ke Keycloak. Keberadaan aplikasi itu belum berarti operator masuk Nextcloud lewat sesi ATLAS. |
| File tetap di Nextcloud, ATLAS hanya menyimpan referensi | Sengaja diubah 29 September 2026. Penyimpanan berpindah ke disk ATLAS. | Migrasi tidak boleh mengembalikan WebDAV kecuali keputusan ini dibatalkan. Dokumen di `docs/integration/document-storage.md` dan `nextcloud-integration.md` masih menggambarkan desain lama. |
| PostGIS | Belum. Koordinat adalah angka biasa. | Query spasial (radius, wilayah, irisan peta) tidak bisa diandalkan di SQL. |
| Backend FastAPI terpisah | Belum. | Seluruh domain masih di dalam proses Next.js. |
| shadcn/ui | Belum sebagai pustaka. | Komponen tidak memakai registry shadcn. Menggantinya sekarang hanya biaya visual. |
| MapLibre | Tidak dipilih. Leaflet yang dipakai. | Jangan menambah MapLibre paralel tanpa alasan. Leader line sudah dihitung untuk Leaflet. |
| Field “Remember me” | Belum. | Bukan penghambat operasi. |
| Search, lonceng notifikasi, dan menu profil di header | Belum menjadi alur lengkap. Logout dan jam ada. | Operator tidak punya pusat notifikasi di header. |
| Filter tanggal, Kodam, dan kategori di Laporan | Belum di UI laporan. | Brief `ATLAS.txt` bagian 18 meminta filter ini. Daftar laporan bisa diunduh, tetapi tidak bisa disaring seperti yang diminta. |
| Tombol Export PNG dan Export PowerPoint di halaman BANGSIT | Masih `disabled`. | Ekspor PNG dan PPTX sudah ada di Peta Situasi, belum di halaman BANGSIT. PDF BANGSIT yang jalan. |
| “Open in Nextcloud” pada dokumen kejadian | Tidak ada, dan tidak relevan setelah pemisahan. | Unduhan lewat ATLAS. |
| Kartu anotasi menampilkan seluruh field khusus | Sebagian masih field generik. | Brief meminta hotspot, luas hektare, organisasi, dan keluarga terdampak sebagai field sendiri. Sebagian nilai masih masuk kolom teks. |
| Cluster peta kelas pustaka | Cluster buatan sendiri berbasis jarak piksel. | Pada jumlah marker besar, kelompok dan pecahannya belum setara pustaka cluster. |
| Realtime ujung ke ujung untuk setiap kejadian | Kanal realtime ada. Tidak setiap perubahan incident mendorong isi kartu tanpa tarik data ulang. | Angka di kartu tidak dijamin berubah sendiri saat operator lain menyimpan. |
| Anotasi di layar sentuh | Belum diuji menyeluruh. | Command center desktop aman. Tablet belum bisa dianggap selesai. |
| Mode ekspor yang menyembunyikan seluruh chrome lalu memotret layout bersih untuk PDF laporan | Ekspor peta ada. Jalur BANGSIT belum memakai mode itu. | Produk laporan presentasi masih terbelah antara dua halaman. |
| Struktur folder nasional Nextcloud `PUSDALOPS/NASIONAL/...` | Tidak dipakai ATLAS lagi. Skrip ada di `/home/localhost/nexops/scripts/provision-kodam-folders.sh`. | Jangan menjalankan skrip itu kalau tujuannya hanya meneruskan ATLAS. |
| `atlas-lan-watch.service` pada audit Agustus | Tidak menjadi bagian layanan yang diverifikasi hidup pada 30 September. | IP diganti manual. Jangan berharap IP mengikuti DHCP sendiri. |

## Yang harus dioptimalkan, dan alasannya

Urutan ini untuk server berikutnya. Kerjakan dari atas jika waktu terbatas.

1. **Satukan jalur deploy.** Container ATLAS dibangun dari `Project/atlas`, Keycloak dari `/home/localhost/identity`, Nextcloud dari `/home/localhost/nexops`. `Project/nexops` sudah tidak ada. Sisa yang masih mudah tertukar: `/home/localhost/atlas` dan `/home/localhost/nexops-instalasi-kosong-20261001`. Jangan menjalankan compose dari kedua sisa itu.

2. **Jangan jalankan `scripts/sync-lan-address.sh` apa adanya.** Path Nextcloud di skrip sudah menunjuk `/home/localhost/nexops`. Path Keycloak masih `../identity` dari folder ATLAS, dan folder itu tidak ada di dalam `Project/`. Skrip juga membuat ulang Keycloak, mengubah redirect, memanggil `user_oidc`, lalu membangun ulang ATLAS. IP DHCP yang berubah memang memutus HTTPS, tetapi skrip lengkap lebih berbahaya daripada mengganti `NEXTAUTH_URL`, `OIDC_ISSUER`, `IDENTITY_HOST`, sertifikat, dan redirect client `atlas` secara terarah.

3. **Ganti Keycloak `start-dev` sebelum server operasi.** Mode ini memudahkan import realm, tetapi bukan mode yang disiapkan untuk paparan LAN jangka panjang. Hostname, proxy header, dan cadangan database Keycloak perlu dikunci di server tujuan. Realm dan pengguna ada di volume `/home/localhost/identity/data/postgres`. Kehilangan folder itu berarti kehilangan akun uji dan klien OIDC.

4. **Cadangkan dua data store ATLAS secara terpisah.** `pg_dump` dari `atlas-postgres` tidak berisi logo Kotamaops dan PDF. Volume `atlas_atlas_kodam_uploads` harus disalin juga. Sebaliknya, menyalin folder upload tidak membawa kejadian dan hak akses.

5. **Sertifikat dan IP adalah satu paket.** Sertifikat saat ini memuat `IP:192.168.2.132`, `DNS:atlas.local`, dan `DNS:localhost`. `NEXTAUTH_URL` adalah `https://192.168.2.132`. Keycloak menerbitkan issuer `http://192.168.2.132:8080/realms/atlas`. Redirect klien `atlas` hanya `https://192.168.2.132/api/auth/callback/oidc`. Ganti IP tanpa mengganti keempatnya dan browser kembali timeout atau login SSO ditolak.

6. **Proxy harus mem-mount file, bukan folder.** Kegagalan 25 September terjadi karena Docker membuat direktori saat file `nginx.conf` tidak ada, lalu Nginx gagal dengan kode 127. Di server baru, pastikan sumber mount adalah file `Project/atlas/deploy/nginx.conf`.

7. **Rapikan nama kolom `nextcloudFileId` hanya jika migrasi skema direncanakan.** Mengganti nama sekarang tidak mengubah fungsi. Membiarkannya membuat orang berikutnya menyambungkan WebDAV lagi. Tambahkan komentar skema atau rename saat ada migration yang memang diuji.

8. **Lengkapi field kategori di anotasi.** Kartu Karhutla dan Unras masih mencampur angka ke field umum. Operator yang membaca peta tidak melihat hotspot, luas, dan perkiraan massa sebagai data terstruktur, sehingga rekap di brief tidak bisa dihitung ulang dengan andal.

9. **Satukan ekspor.** PNG dan PPTX hidup di peta. PDF hidup di BANGSIT. Tombol di BANGSIT yang disabled membuat operator mengira ekspor rusak. Aktifkan tombol itu dengan memanggil ekspor yang sudah ada, atau hapus tombolnya supaya jalur yang didukung jelas.

10. **Filter laporan.** Tanpa filter tanggal dan Kodam, modul Laporan tidak memenuhi brief dan sulit dipakai saat data bertambah di server baru.

11. **Uji sentuh dan beban marker.** Collision detection dan cluster masih sederhana. Pada layar komando 1920×1080 ini cukup untuk data sekarang (12 kejadian, 0 titik `MapPoint`). Puluhan kartu yang digeser bersamaan belum diukur.

12. **Dokumentasi integrasi di `Project/atlas/docs/integration/` sudah ketinggalan.** Dokumen itu masih menyuruh menyimpan file di Nextcloud dan memakai `cd /home/localhost/atlas`. Pakai README ini sebagai status migrasi. Perbarui dokumen lama hanya setelah path server baru pasti.

## Cara menjalankan di server ini

Dari mesin yang sama dengan kode:

```bash
cd /home/localhost/Project/atlas
docker compose up -d
cd /home/localhost/identity
docker compose up -d
```

Nextcloud, jika masih diperlukan sebagai layanan terpisah:

```bash
cd /home/localhost/nexops
docker compose up -d
```

Mount-nya `./data` dan `./db` di folder itu. Jangan mengarahkannya ke `/home/localhost/nexops-instalasi-kosong-20261001`.

Pintu masuk: `https://192.168.2.132/login`.

## Cara memindahkan ke server lain

1. Pasang Docker dan Docker Compose di server tujuan. Salin kode `Project/atlas` tanpa `node_modules` dan tanpa `.next`. File yang wajib ikut: `.env`, `.env.local`, `deploy/nginx.conf`, `deploy/tls/`, `prisma/`, `Dockerfile`, `docker-compose.yml`.
2. Salin `/home/localhost/identity` termasuk `.env`, `realm/`, dan `data/postgres`, atau dump database Keycloak lalu import. Tanpa ini, akun `atlas_admin` tidak ada.
3. Dump PostgreSQL ATLAS dari container `atlas-postgres` database `atlas`, dan arsipkan volume upload (`/app/uploads` di dalam container, atau volume `atlas_atlas_kodam_uploads`).
4. Di server baru, pulihkan dump dan volume, lalu ubah IP di empat tempat pada bagian optimasi nomor 5. Buat ulang sertifikat dengan `ATLAS_LAN_IP=<ip-baru> Project/atlas/scripts/generate-local-tls.sh`.
5. Perbarui redirect klien OIDC `atlas` di Keycloak agar mengarah ke `https://<ip-baru>/api/auth/callback/oidc`.
6. `docker compose up -d` untuk identity, lalu untuk ATLAS. Jangan memakai `--build` yang sekaligus mengubah Nextcloud.
7. Cek `curl -fsS http://127.0.0.1:3000/api/health`, `curl -kfsS https://<ip-baru>/login`, dan issuer Keycloak. Login sekali dengan `atlas_admin`.
8. Nextcloud hanya disalin jika server baru memang membutuhkan arsip lama. Salin `/home/localhost/nexops` (`data/`, `db/`, compose, dan `.env`). Jangan menyalin `/home/localhost/nexops-instalasi-kosong-20261001`.

Yang tidak perlu dibawa untuk ATLAS sendiri: jaringan Docker `nexops_default`, variabel `NEXTCLOUD_*`, dan folder `/home/localhost/atlas`.

## Riwayat yang wajib dibawa saat migrasi

- **Sampai 29 Agustus 2026.** Audit mencatat MVP, SSO, RBAC, peta dinamis, dan integrasi Nextcloud sebagai selesai atau sebagian. IP kanonik saat itu mengikuti LAN yang aktif. Proxy dianggap sehat.
- **25 September 2026.** `atlas-proxy` berhenti. Mount `nginx.conf` di `/home/localhost/atlas/deploy/` menjadi direktori. Port 80 dan 443 tidak mendengarkan.
- **29 September 2026, pemisahan Nextcloud.** Kode penyimpanan pindah dari `src/documents/nextcloud-storage.ts` ke `src/documents/local-storage.ts`. `atlas-app` dikeluarkan dari jaringan `nexops_default`. Env Nextcloud dihapus. Nextcloud 31.0.14 dibiarkan hidup di port 8081. Tes `tests/document-storage.test.ts` ditambah. Uji ujung-ke-ujung tidak lagi membuka Nextcloud.
- **29 September 2026, pintu web.** IP mesin `192.168.2.132` menggantikan `192.168.1.65` pada `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `OIDC_ISSUER`, `IDENTITY_HOST`, sertifikat, dan redirect Keycloak. Proxy dibuat ulang dari `Project/atlas`. Halaman login HTTPS membalas 200. Nextcloud tidak diubah pada langkah ini.
- **30 September 2026.** Snapshot jumlah data dan daftar layanan di dokumen ini dicatat ulang. Health ATLAS masih `ok`.

## Verifikasi setelah server baru menyala

```bash
docker ps
curl -fsS http://127.0.0.1:3000/api/health
curl -kfsS -o /dev/null -w '%{http_code}\n' https://<ip-lan>/login
curl -fsS http://<ip-lan>:8080/realms/atlas/.well-known/openid-configuration
cd /home/localhost/Project/atlas && npm test
```

Login dianggap berhasil bila browser, setelah menerima peringatan sertifikat, membuka judul **ATLAS Command Center** dan SSO kembali ke dashboard tanpa timeout.

## Riwayat sesi

Bagian ini adalah catatan yang ditentukan. Setiap sesi yang mengubah sistem, menambah fitur, memperbaiki sesuatu, atau menemukan error layanan menambahkan entri baru di bawah entri terakhir. Entri lama tidak ditimpa. Berkas ini ada di dalam folder ATLAS: `docs/MIGRASI.md`. Baris error diambil lewat `scripts/catat-sesi.sh`. Tugasnya ada di `.grok/skills/catat-atlas/` (`/catat-atlas`).

### 2026-09-30 00:40 — tugas catatan sesi

- Perubahan: aturan catatan sesi dipasang. Skrip `Project/scripts/catat-sesi.sh` mengumpulkan baris error. Skill `catat-atlas` mewajibkan entri baru di bagian ini pada sesi yang sama.
- Fitur: tidak ada fitur aplikasi baru.
- Perbaikan: tidak ada.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
2026-09-24 14:47:39.191 UTC [46] ERROR:  function aurora_version() does not exist at character 8
2026-09-24 14:54:49.735 UTC [253] ERROR:  function aurora_version() does not exist at character 8
2026-09-25 04:50:32.760 UTC [45] ERROR:  function aurora_version() does not exist at character 8
2026-09-29 11:39:52.342 UTC [52] ERROR:  function aurora_version() does not exist at character 8
2026-09-29 16:44:45.463 UTC [6880] ERROR:  function aurora_version() does not exist at character 8

RINGKAS ada baris error sejak 168h
```

### 2026-09-30 00:30 — repositori ATLAS disiapkan untuk GitHub

- Perubahan: `Project/atlas` menjadi repositori Git lokal, komit `34c6d6c`, 215 berkas. `.gitignore` mengizinkan `.env.example` dan mengabaikan log. Catatan migrasi disalin ke `Project/atlas/docs/MIGRASI.md`.
- Fitur: tidak ada fitur aplikasi baru.
- Perbaikan: tidak ada.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-09-29T17:22:24Z
```

### 2026-09-30 08:30 — catatan dan tugas dipindah ke dalam folder ATLAS

- Perubahan: catatan yang diunggah adalah `docs/MIGRASI.md`. Tugas pencatat ada di `.grok/skills/catat-atlas/`. Skrip pengumpul error ada di `scripts/catat-sesi.sh`. Ketiganya sekarang berada di dalam folder ATLAS sehingga ikut saat folder itu diunggah.
- Fitur: tidak ada fitur aplikasi baru.
- Perbaikan: tidak ada.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-09-30T00:04:59Z
```

### 2026-09-30 08:40 — folder ATLAS diunggah ke GitHub

- Perubahan: repositori private `https://github.com/noval1802/atlas`, cabang `master`. Isinya kode ATLAS, `docs/MIGRASI.md`, `.grok/skills/catat-atlas/`, dan `scripts/catat-sesi.sh`. Berkas `.env`, kredensial, kunci sertifikat, dan database tidak ikut.
- Fitur: tidak ada fitur aplikasi baru.
- Perbaikan: tidak ada.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-09-30T01:26:14Z
```

### 2026-10-01 16:14 — Nextcloud dipindah ke luar Project

- Perubahan: `/home/localhost/Project/nexops` dipindah ke `/home/localhost/nexops`. Container `nexops-app-1`, `nexops-db-1`, dan `nexops-redis-1` dibuat ulang dari compose di folder baru. Mount hidup adalah `/home/localhost/nexops/data` dan `/home/localhost/nexops/db`. Instance `ocpls9zg25vy` menjawab login HTTP 200. Pengguna yang ada: `admin`, `atlas-service`, `kabidalops`, `kabidpulahta`, `kabidum`, `kapusdalops`, dan operator Kodam XII. PDF BANGSIT Kodam XII tetap ada. Instalasi kosong yang sempat jalan hari ini (hanya akun `admin` dan berkas bawaan) disimpan di `/home/localhost/nexops-instalasi-kosong-20261001` dan tidak dilayani. Skrip `provision-kodam-folders.sh` dan `provision-atlas-service.sh` membaca ATLAS dari `/home/localhost/Project/atlas`. `sync-lan-address.sh` menunjuk Nextcloud ke `/home/localhost/nexops`.
- Fitur: tidak ada
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
2026-09-30 02:39:09.110 UTC [26945] FATAL:  terminating connection due to administrator command
2026-09-30 02:39:09.239 UTC [14905] FATAL:  terminating connection due to administrator command
2026-09-30 02:39:09.251 UTC [14906] FATAL:  terminating connection due to administrator command
2026-09-30 02:39:09.258 UTC [14793] FATAL:  terminating connection due to administrator command
2026-09-30 02:39:09.363 UTC [14908] FATAL:  terminating connection due to administrator command

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
2026-09-30 02:39:09.124 UTC [6880] FATAL:  terminating connection due to administrator command
2026-09-30 02:39:09.275 UTC [6888] FATAL:  terminating connection due to administrator command
2026-10-01 09:04:15.308 UTC [54] ERROR:  function aurora_version() does not exist at character 8

RINGKAS ada baris error sejak 2026-09-30T01:30:26Z
```

### 2026-10-01 16:33 — gambaran fungsi ATLAS untuk pembanding

- Perubahan: berkas `readme-atlas-adalah.md` ditambah di folder ATLAS. Isinya fungsi, peran, data hidup, dan batas sistem pada 1 Oktober 2026.
- Fitur: tidak ada
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-01T09:14:35Z
```

### 2026-10-02 15:22 — operasional ATLAS masuk ke OSIRIS

- Perubahan: database operasional baru `osiris_ops` di container `osiris-postgres` (PostgreSQL 16, port lokal 5433). Skema berisi `Kotamaops`, `Situation` (satu baris terkini per satuan), `SituationRevision`, dan `User`. Dua puluh dua satuan, termasuk Kodaeral V, disalin dari tabel `Kodam` ATLAS sebagai data awal. Database ATLAS tidak diubah. Peta OSIRIS, BANGSIT, dan modul kejadian ATLAS belum dipindah.
- Fitur: formulir `/masuk`, dasbor `/operator` untuk menyimpan situasi terkini, dan `/pengguna` untuk membuat serta mengubah akun. Peran mengikuti ATLAS. `OPERATOR_KODAM` hanya melihat dan mengubah satu Kotamaops. `ANALYST` dan `PIMPINAN` hanya membaca. Tautan Operasi ditambah di bilah status peta.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
2026-10-01 09:37:11.234 UTC [2224] FATAL:  terminating connection due to administrator command

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
2026-10-01 09:37:11.475 UTC [63] FATAL:  terminating connection due to administrator command
2026-10-01 09:37:11.484 UTC [54] FATAL:  terminating connection due to administrator command
2026-10-02 07:13:27.874 UTC [39] ERROR:  function aurora_version() does not exist at character 8

RINGKAS ada baris error sejak 2026-10-01T09:33:43Z
```

### 2026-10-02 15:37 — dasbor OSIRIS dibuka di IP LAN

- Perubahan: server pengembangan OSIRIS di port 3010 diikat ke `0.0.0.0`. `allowedDevOrigins` memakai `127.0.0.1` dan alamat IPv4 antarmuka LAN saat proses mulai. Header HSTS tidak dikirim saat pengembangan supaya browser tidak memaksa HTTPS di port 3010.
- Fitur: halaman masuk operasional dapat dibuka dari jaringan di `http://192.168.1.204:3010/masuk`.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T08:21:54Z
```

### 2026-10-02 18:00 — CCTV arteri Jasa Marga masuk ke peta OSIRIS

- Perubahan: lapisan `jasamarga` membaca WFS `shp:cctv_arteri` di `jid.jasamarga.com`. Token lapisan disimpan sebagai `JASAMARGA_WFS_TOKEN` di `.env` OSIRIS dan tidak dikirim ke browser. Alamat encoder pribadi dan token sesi per kamera dibuang.
- Fitur: 110 kamera arteri tampil di peta. 87 memakai siaran HLS `jmlive.jasamarga.com`, 21 memakai gambar ZoneMinder, 2 hanya titik karena tidak punya siaran publik.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T08:37:28Z
```

### 2026-10-02 18:19 — CCTV jalan utama Jasa Marga masuk ke peta OSIRIS

- Perubahan: lapisan `jasamarga` sekarang membaca WFS `shp:cctv_arteri` dan `shp:cctv_main` dengan token yang sama. Batas tunggu `stealthFetch` untuk kedua lapisan dinaikkan menjadi 180 detik karena GeoServer menyusun lapisan utama sebelum byte pertama. Token lapisan, token sesi per kamera, dan alamat encoder pribadi tetap di server.
- Fitur: katalog Jasa Marga 2.748 kamera. Arteri 110 (87 HLS, 21 ZoneMinder, 2 titik). Jalan utama 2.638 (2.479 HLS, 85 ZoneMinder, 74 titik). `GET /api/cctv?region=all` memuat 38.509 kamera dan tidak lagi menandai `jasamarga` sebagai tertunda. Contoh HLS `jmlive` menjawab playlist, contoh ZoneMinder menjawab `multipart/x-mixed-replace`.
- Perbaikan: katalog di memori yang hanya berisi arteri diganti. Cuplikan `.cache/cctv-catalog.json` menyimpan 2.748 kamera Jasa Marga. Server pengembangan OSIRIS dimuat ulang di `0.0.0.0:3010`.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T11:01:15Z
```

### 2026-10-02 18:42 — CCTV TPT Jakarta masuk ke peta OSIRIS

- Perubahan: wilayah `tpt` membaca `https://api.e-smarteye.com/api/releases/tpt_cctv/`. Cookie sesi portal disimpan sebagai `TPT_CCTV_TOKEN` di `.env` OSIRIS. Rekaman detail kamera, yang memuat alamat encoder pribadi, tidak diminta.
- Fitur: 3.637 kamera Jakarta. 3.380 siaran Flussonic diputar lewat `/api/cctv/tpt/media` supaya cookie sesi tidak ikut ke browser. 257 pemutar lain (WebRTC, Flussonic Watcher, Transjakarta) dibuka sebagai iframe. Contoh siaran Stasiun Grogol menjawab playlist dan segmen `video/MP2T`. Katalog penuh memuat 42.146 kamera, termasuk Jasa Marga.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T11:19:34Z
```

### 2026-10-02 21:44 — CCTV pemantauan Jasa Marga masuk ke peta OSIRIS

- Perubahan: lapisan `jasamarga` sekarang juga membaca WFS `shp:cctv_pemantauan` dengan token yang sama. Token lapisan, token sesi per kamera, dan alamat encoder pribadi tetap di server.
- Fitur: 34 kamera pemantauan, semuanya siaran HLS. Contoh `CIKAMPEK (EWS) KM 31+000 B` menjawab playlist. Jumlah Jasa Marga menjadi 2.782 kamera: arteri 110, jalan utama 2.638, pemantauan 34. Katalog penuh memuat 42.180 kamera.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T11:42:20Z
```

### 2026-10-02 21:49 — CCTV gerbang Jasa Marga masuk ke peta OSIRIS

- Perubahan: lapisan `jasamarga` sekarang juga membaca WFS `shp:cctv_gerbang` dengan token yang sama. Token lapisan, token sesi per kamera, dan alamat encoder pribadi tetap di server. Tiga kamera dengan status mati tidak ditampilkan.
- Fitur: 526 kamera gerbang tol, 517 siaran HLS dan 9 ZoneMinder. Contoh `JSB GT. KIT Batang Exit` di KM 372 menjawab playlist. Jumlah Jasa Marga menjadi 3.308 kamera: arteri 110, jalan utama 2.638, pemantauan 34, gerbang 526. Katalog penuh memuat 42.706 kamera.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T14:45:03Z
```

### 2026-10-02 22:03 — CCTV simpang susun Jasa Marga masuk ke peta OSIRIS

- Perubahan: lapisan `jasamarga` sekarang juga membaca WFS `shp:cctv_ss` dengan token yang sama. Token lapisan, token sesi per kamera, dan alamat encoder pribadi tetap di server. Satu kamera dengan status mati tidak ditampilkan.
- Fitur: 58 kamera simpang susun, semuanya siaran HLS. Contoh `(JMKT) SD IC PAKAM` di KM 46+300 menjawab playlist. Jumlah Jasa Marga menjadi 3.366 kamera: arteri 110, jalan utama 2.638, pemantauan 34, gerbang 526, simpang susun 58. Katalog penuh memuat 42.764 kamera.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T14:50:11Z
```

### 2026-10-02 22:09 — CCTV ramp Jasa Marga masuk ke peta OSIRIS

- Perubahan: lapisan `jasamarga` sekarang juga membaca WFS `shp:cctv_ramp` dengan token yang sama. Token lapisan, token sesi per kamera, dan alamat encoder pribadi tetap di server. Enam kamera dengan status mati tidak ditampilkan.
- Fitur: 354 kamera ramp. 229 siaran HLS dan 125 ZoneMinder. Isinya campuran rest area, simpang, dan titik ruas. Contoh `(Palimanan-Kanci) REST AREA KM 207A S12` dan `JORR E Interchange Cakung 1` menjawab playlist. Jumlah Jasa Marga menjadi 3.720 kamera: arteri 110, jalan utama 2.638, pemantauan 34, gerbang 526, simpang susun 58, ramp 354. Katalog penuh memuat 43.118 kamera.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T15:03:28Z
```

### 2026-10-03 00:37 — CCTV Jasa Marga punya saklar sendiri

- Perubahan: kamera sumber `Jasa Marga` keluar dari saklar `CCTV Cameras` dan masuk ke saklar `CCTV JM` di grup Surveillance. Katalog API tetap satu. Pratinjau langsung tetap memakai kedua lapisan saat saklar pratinjau menyala.
- Fitur: CCTV JM menyala bersama CCTV pada kunjungan baru. Tautan lama yang menyalakan CCTV tetap menyalakan CCTV JM. Mematikan CCTV JM tercatat di alamat halaman supaya tidak hidup lagi saat dimuat ulang. Jumlah kamera tidak berubah: 3.720 Jasa Marga dan sisanya di CCTV Cameras.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T15:10:05Z
```

### 2026-10-03 00:47 — CCTV Jakarta punya saklar sendiri

- Perubahan: kamera sumber `TPT CCTV` keluar dari saklar `CCTV Cameras` dan masuk ke saklar `CCTV JAKARTA` di grup Surveillance. Katalog API tetap satu. Pratinjau langsung tetap memakai ketiga lapisan saat saklar pratinjau menyala.
- Fitur: CCTV JAKARTA menyala bersama CCTV pada kunjungan baru. Tautan lama yang menyalakan CCTV tetap menyalakan CCTV JAKARTA. Mematikan CCTV JAKARTA tercatat di alamat halaman supaya tidak hidup lagi saat dimuat ulang. Jumlah di cuplikan katalog: CCTV JAKARTA 3.637, CCTV JM 3.720, CCTV Cameras 35.830. Katalog penuh 43.187.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-02T17:37:48Z
```

### 2026-10-04 02:06 — token CCTV Jakarta diganti

- Perubahan: nilai `TPT_CCTV_TOKEN` di `/home/localhost/osiris/.env` diganti. Nilai token tidak dicatat. Server OSIRIS di port 3005 dimuat ulang supaya proses membaca nilai baru.
- Fitur: tidak ada
- Perbaikan: tidak ada. Daftar `https://api.e-smarteye.com/api/releases/tpt_cctv/` tetap menolak token baru. Cookie `access_token` menjawab HTTP 401 dengan pesan Token is required. Header Authorization Bearer menjawab HTTP 401 dengan pesan Invalid token. Token tercatat untuk scope stream, terikat ke alamat 172.16.43.133, dan kedaluwarsa 18 Oktober 2026 pukul 02:01 WIB. Server ini berada di 192.168.1.46. Peta masih memakai 3.637 kamera dari cache.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
2026-10-03 02:06:39.063 UTC [92077] FATAL:  terminating connection due to administrator command
2026-10-03 17:47:04.249 UTC [883] FATAL:  terminating connection due to administrator command

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
2026-10-03 02:06:39.031 UTC [39] FATAL:  terminating connection due to administrator command
2026-10-03 02:06:39.032 UTC [40] FATAL:  terminating connection due to administrator command
2026-10-03 02:09:00.040 UTC [38] ERROR:  function aurora_version() does not exist at character 8
2026-10-03 17:32:52.742 UTC [54] ERROR:  function aurora_version() does not exist at character 8
2026-10-03 17:47:03.815 UTC [55] FATAL:  terminating connection due to administrator command
2026-10-03 17:47:03.842 UTC [54] FATAL:  terminating connection due to administrator command

RINGKAS ada baris error sejak 2026-10-02T17:47:53Z
```

### 2026-10-04 02:28 — peringatan konsol OSIRIS dirapikan

- Perubahan: `src/middleware.ts` dipindah ke `src/proxy.ts` dan fungsi diekspor sebagai `proxy`. Penghitungan statistik tidak lagi meminta cache Next.js untuk `/api/cctv` dan `/api/flights`. Feed Times of Israel dikeluarkan dari daftar berita kawat. Kegagalan sumber CCTV yang kosong tidak lagi ditulis sebagai "still filling", dan kegagalan pertama menahan percobaan ulang selama masa jeda.
- Fitur: tidak ada
- Perbaikan: peringatan middleware usang, cache di atas 2 MB, HTTP 403 Times of Israel, dan jejak tumpukan MiDrive hilang dari konsol sesi baru. Atribut `body` memakai `suppressHydrationWarning` untuk atribut yang disisipkan ekstensi browser. Michigan, Washington, California, Illinois, dan Turki tetap tanpa kamera baru: sumbernya menolak, kosong, atau memang dikosongkan.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-03T19:07:12Z
```

### 2026-10-04 02:43 — token CCTV Jakarta diganti dan daftar diterima

- Perubahan: nilai `TPT_CCTV_TOKEN` di `/home/localhost/osiris/.env` diganti dengan cookie sesi portal. Nilai token tidak dicatat. Server OSIRIS di port 3005 dimuat ulang.
- Fitur: tidak ada
- Perbaikan: `https://api.e-smarteye.com/api/releases/tpt_cctv/` menjawab HTTP 200. Daftar berisi 3.637 kamera, semuanya punya koordinat. `GET /api/cctv?region=tpt` menjawab 200 dengan 3.637 kamera sumber `TPT CCTV`, dan cookie tidak ikut ke jawaban klien.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-03T19:28:34Z
```

### 2026-10-04 03:24 — layer CCTV Jasa Marga diganti

- Perubahan: nilai `JASAMARGA_WFS_TOKEN` di `/home/localhost/osiris/.env` diganti. Nilai token tidak dicatat. Daftar layer di `src/app/api/cctv/jasamarga.ts` menjadi `shp:cctv_main`, `shp:cctv_ramp`, `shp:cctv_arteri`, `shp:cctv_ss`, dan `shp:cctv_pemantauan`. Layer `shp:cctv_gerbang` tidak ada di daftar baru, jadi tidak diminta lagi. Server OSIRIS di port 3005 dimuat ulang.
- Fitur: tidak ada
- Perbaikan: `GET /api/cctv?region=jasamarga` menjawab 200 dengan 3.196 kamera. Rinciannya 2.640 main, 354 ramp, 110 arteri, 58 simpang susun, dan 34 pemantauan. 2.889 HLS, 231 MJPEG, 76 tanpa stream. Token tidak ikut ke jawaban klien. Empat URL lain bukan katalog kamera: `shp:vms` papan pesan, `shp:restarea` rest area, `shp:midas` kosong, `shp:perlambatan` kejadian lalu lintas. Keempatnya tidak digambar sebagai CCTV.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-03T19:43:49Z
```

### 2026-10-04 10:01 — server OSIRIS dimuat ulang pada IP LAN baru

- Perubahan: proses Next.js di port 3005 dihentikan dan dinyalakan lagi dengan `--hostname 0.0.0.0`. `allowedDevOrigins` dihitung ulang saat proses mulai.
- Fitur: tidak ada
- Perbaikan: alamat ens33 sekarang `192.168.39.139/24`. Origin dev yang dibaca: `127.0.0.1` dan `192.168.39.139`. `GET /masuk` dan `GET /` dari alamat itu menjawab 200. Tidak ada baris blokir cross-origin di log boot.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-03T20:24:34Z
```

### 2026-10-04 10:32 — token CCTV Jakarta diganti

- Perubahan: nilai `TPT_CCTV_TOKEN` di `/home/localhost/osiris/.env` diganti dengan cookie sesi portal yang baru. Nilai token tidak dicatat. Server OSIRIS di port 3005 dimuat ulang.
- Fitur: tidak ada
- Perbaikan: `https://api.e-smarteye.com/api/releases/tpt_cctv/` menjawab HTTP 200 dengan 3.637 kamera, semuanya punya koordinat. `GET /api/cctv?region=tpt` menjawab 200 dengan 3.637 kamera sumber `TPT CCTV` dan stream. Cookie tidak ikut ke jawaban klien. Playlist lewat `/api/cctv/tpt/media` menjawab 200 untuk kamera yang sedang diputar.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T03:01:20Z
```

### 2026-10-04 10:48 — ikon token CCTV

- Perubahan: ikon kunci di strip alat kanan peta OSIRIS, dan tombol ringkas di ponsel, membuka formulir terpisah untuk CCTV Jakarta (`TPT_CCTV_TOKEN`) dan CCTV Jasa Marga (`JASAMARGA_WFS_TOKEN`). Nilai yang sudah tersimpan tidak dikirim ke peramban. Hanya peran SUPER_ADMIN dan ADMIN yang boleh menyimpan. Setelah simpan, cache daerah itu dibuang dan katalog kamera dimuat ulang. Server port 3005 tidak dihidupkan ulang.
- Fitur: `GET` dan `POST /api/cctv/tokens`. Formulir menerima token polos, awalan `access_token=`, atau URL WFS yang membawa parameter `token`.
- Perbaikan: pengambilan katalog yang masih berjalan tidak menulis kembali daftar lama setelah cache daerah dibuang.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T03:32:56Z
```

### 2026-10-04 11:08 — audit konsol OSIRIS

- Perubahan: tidak ada
- Fitur: tidak ada
- Perbaikan: tidak ada. Audit saja. Di log dev port 3005 sejak 10:31 WIB: 35 permintaan 404 ke `/api/cctv/tpt/init-….fmp4` karena playlist fMP4 masih membawa URI init beserta query sesi; 4 kali `failed to pipe response` karena timeout 20 detik pada segmen, lalu 500; 4 kali `unhandledRejection` `Cannot set property message of which has only a getter`; 9 jawaban 502 pada media Jakarta; Michigan MiDrive HTTP 403 berulang; satu gelombang gagal unduh Telegram dan RSS Guardian/Al Jazeera; Anadolu tetap memakai cache. Tiga simpan token Jasa Marga diikuti pemulihan katalog 42.663 kamera dari disk. Nilai token tidak dicatat.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T03:49:00Z
```

### 2026-10-04 11:28 — token CCTV Jasa Marga dipakai ulang

- Perubahan: `JASAMARGA_WFS_TOKEN` di `/home/localhost/osiris/.env` sudah berisi token pada URL WFS `shp:cctv_main` yang diminta. Nilai token tidak dicatat dan tidak ditulis ulang. Salinan Jasa Marga di `.cache/cctv-catalog.json` dibuang, lalu server OSIRIS di port 3005 dimuat ulang supaya daftar ditarik lagi.
- Fitur: tidak ada
- Perbaikan: `shp:cctv_main` menjawab HTTP 200. `GET /api/cctv?region=jasamarga` menjawab 200 dengan 3.196 kamera: main 2.640, ramp 354, arteri 110, ss 58, pemantauan 34. Stream: 2.889 HLS, 231 MJPEG, 76 tanpa stream. Token tidak ada di jawaban klien. Katalog disk kembali memuat 42.663 kamera. Saat boot, Michigan MiDrive HTTP 403 dan satu gelombang unduhan Telegram gagal.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T04:09:01Z
```

### 2026-10-04 11:34 — token CCTV lama diganti saat disimpan dari web

- Perubahan: simpan token dari ikon TOKEN menghapus seluruh penugasan lama kunci itu di `.env`, termasuk baris ganda, lalu menulis satu nilai baru. Proses yang sedang berjalan juga mengganti nilai lamanya. Kamera daerah itu dihapus dari `.cache/cctv-catalog.json` sebelum berkas lingkungan ditulis, supaya muat ulang server tidak mengembalikan daftar dari token lama. Di peta, kamera sumber itu langsung diturunkan lalu dimuat ulang.
- Fitur: tidak ada
- Perbaikan: uji token, snapshot, katalog, dan rute token lulus, 21 kasus. `GET /` menjawab 200 dan `GET /api/cctv/tokens` tanpa sesi menjawab 401.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T04:28:55Z
```

### 2026-10-04 12:10 — layer Jasa Marga dilengkapi

- Perubahan: daftar unduhan Jasa Marga sekarang `shp:cctv_main`, `shp:vms`, `shp:cctv_gerbang`, `shp:batas_km`, `shp:cctv_ramp`, `shp:cctv_arteri`, `shp:cctv_ss`, dan `shp:cctv_pemantauan`. `shp:gerbang` tidak diminta. Alamat encoder pada VMS tidak dikirim ke peramban. Katalog Jasa Marga di disk dibuang, lalu server port 3005 dimuat ulang.
- Fitur: tidak ada
- Perbaikan: `GET /api/cctv?region=jasamarga` menjawab 200 dengan 5.326 titik: main 2.640, vms 348, gerbang 526, batas km 1.256, ramp 354, arteri 110, ss 58, pemantauan 34. Uji pemeta 11 kasus lulus. Saat boot, Michigan MiDrive HTTP 403.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T04:35:13Z
```

### 2026-10-04 12:21 — jam header menjadi WIB

- Perubahan: jam di status bar kanan atas OSIRIS diganti dari Zulu (UTC) menjadi Waktu Indonesia Barat, zona `Asia/Jakarta` (UTC+7). Tampilan `WIB HH:MM:SS`.
- Fitur: tidak ada
- Perbaikan: halaman utama menjawab 200 dan berkas halaman terkompilasi.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T05:11:35Z
```

### 2026-10-04 19:32 — titik Kotamaops di peta OSIRIS

- Perubahan: peta OSIRIS menggambar 22 markas Kotamaops pada koordinat yang tersimpan dari tabel Kodam ATLAS, termasuk Kodaeral V. Ikon kiri baru bernama Kotamaops. Sakelarnya bernama TNI AD dan menyala saat peta dibuka.
- Fitur: perisai emas dan kode satuan di peta. Klik penanda menampilkan nama, wilayah, lokasi, lintang, dan bujur. Jumlah di panel adalah 22.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T05:22:07Z
```

### 2026-10-06 23:31 — lambang Kodam di peta OSIRIS

- Perubahan: lapisan TNI AD memakai lambang masing-masing satuan. Berkasnya disalin dari lambang ATLAS yang sudah ada, termasuk unggahan Kodaeral V, lalu disimpan sebagai gambar 128 piksel di osiris/public/kodam.
- Fitur: 22 penanda punya lambang sendiri. Klik penanda menampilkan lambang, nama, kode, wilayah, lokasi, lintang, dan bujur. Dua markas yang berdekatan di Surabaya tetap keduanya tampil.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-04T12:32:48Z
```

### 2026-10-07 00:07 — kartu karhutla Kodam terdampak

- Perubahan: kartu penanda TNI AD di OSIRIS menambahkan Awal, Sudah Padam, Dalam Pemadaman, dan Personel Siaga untuk 14 Kodam yang mengalami karhutla pada lapsit 5 Oktober 2026 pukul 22.00. Kodam yang tidak mengalami karhutla tidak menampilkan bagian itu.
- Fitur: Kodam XXII/Tambun Bungai menampilkan 150 titik awal, 83 titik sudah padam, 67 titik dalam pemadaman, dan 2.384 personel siaga. Satuan yang apinya sudah seluruhnya padam menampilkan luas lahan, tanpa angka titik yang tidak ada di laporan.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-06T16:31:35Z
```

### 2026-10-07 00:28 — animasi api Kodam IX/Udayana

- Perubahan: penanda Kodam IX/UDY di peta OSIRIS menampilkan api sebelum kartu dibuka. Api hanya dipasang pada satuan ini.
- Fitur: delapan bingkai api disiapkan sekali, lalu gambarnya diganti tiap 110 milidetik. Klik pada api atau lambang tetap membuka kartu karhutla: Awal 111,3 Ha, Sudah Padam 111,3 Ha, Dalam Pemadaman 0, Personel Siaga 2.737.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-06T17:07:39Z
```

### 2026-10-07 00:35 — api pada setiap Kodam terdampak

- Perubahan: animasi api yang sudah diterima pada Kodam IX/Udayana sekarang dipakai bersama oleh 14 Kodam di lapsit karhutla 5 Oktober 2026 pukul 22.00. Kodam yang tidak mengalami karhutla tetap tanpa api.
- Fitur: delapan bingkai yang sama diganti tiap 110 milidetik pada satu lapisan peta. Klik api Kodam XXII/Tambun Bungai tetap membuka kartu dengan 150 titik awal, 83 titik sudah padam, 67 titik dalam pemadaman, dan 2.384 personel siaga.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-06T17:29:01Z
```

### 2026-10-07 00:50 — api hanya pada Kodam yang masih ada titik api

- Perubahan: animasi api pada peta OSIRIS sekarang hanya untuk enam Kodam yang masih punya titik dalam pemadaman. Delapan Kodam yang apinya sudah padam, termasuk IX/Udayana, dan Kodam yang tidak terdampak tidak lagi menampilkan api.
- Fitur: api tetap pada XXII/Tambun Bungai, II/Sriwijaya, XXI/Radin Inten, XVIII/Kasuari, XX/Tuanku Imam Bonjol, dan IV/Diponegoro. Kartu karhutla mereka tidak berubah.
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-06T17:36:06Z
```

### 2026-10-10 23:21 — aturan muat layer OSIRIS dipisah

- Perubahan: aturan feed mana yang diambil sekali dan feed mana yang di-poll dipindah dari `src/app/page.tsx` ke `src/lib/layer-feeds.ts`. URL, interval, dan bentuk data yang disimpan tetap sama. Peta, panel, katalog CCTV, dan route tidak dipindah.
- Fitur: tidak ada
- Perbaikan: `cyber_attacks`, `gdelt_events`, `cf_outages`, dan `cf_attacks` di halaman peta tidak lagi dibaca dengan `as any`. Tes `layer-feeds` 11 lulus, `cctv-layers` 5 lulus. `GET /` dan `GET /masuk` mengembalikan 200. Konsol dev sempat mencatat `TypeError: fetch failed` pada `/api/cctv/tpt/media` karena upstream menutup soket (`UND_ERR_SOCKET`). Itu bukan dari perubahan aturan layer, dan route media tidak diubah.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-06T17:50:19Z
```

### 2026-10-11 00:00 — data peta dan saklar layer bertipe

- Perubahan: isi penyimpanan peta dipindah ke tipe `MapData` di `src/lib/map-data.ts`. `OsirisMap`, `LayerPanel`, dan `SharePanel` memakai `MapData` dan `ActiveLayers`. URL, interval, dan gambar peta tidak diubah.
- Fitur: tidak ada
- Perbaikan: cast `as any` pada saklar satelit, GDELT, Cloudflare, dan botnet di peta dihapus. `PopupAnchor` yang sudah tidak ada di MapLibre diganti `PositionAnchor`. `tsc --noEmit` bersih. Tes `map-data`, `aoi`, `cctv-layers`, `layer-feeds`, dan `camera-catalog` lulus (39). `GET /` dan `GET /masuk` mengembalikan 200.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-10T16:21:27Z
```

### 2026-10-11 00:15 — baris feed peta bertipe

- Perubahan: setiap feed yang digambar sebagai titik punya tipe barisnya sendiri di `src/lib/map-data.ts` (penerbangan, kapal, gempa, berita, kamera, dan seterusnya). Peta memakai tipe itu saat membuat GeoJSON. Susunan layer dan popup tidak dipindah.
- Fitur: tidak ada
- Perbaikan: anotasi `any` pada pemetaan titik dihapus. Transform gempa USGS mengembalikan `EarthquakeRow`. Pesawat yang dipantau tanpa angka ketinggian, kecepatan, atau arah disimpan sebagai 0 agar telemetri tetap angka. `tsc --noEmit` bersih. Tes `map-data`, `camera-catalog`, `aoi`, `cctv-layers`, dan `layer-feeds` lulus (39). `GET /` dan `GET /masuk` mengembalikan 200.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-10T17:00:51Z
```

### 2026-10-11 02:09 — popup klik peta bertipe

- Perubahan: pembacaan properti klik peta disatukan di `src/lib/map-popup.ts` (`clickedProperties`, `pointCoordinates`). Setiap popup titik memakai tipe field yang ditulis layernya. HTML popup, gambar layer, URL, dan interval tidak dipindah. Klik garis SDK tetap memakai `lngLat`.
- Fitur: tidak ada
- Perbaikan: `properties as any` pada handler klik dihapus. Indeks `risk_level` yang kosong tidak lagi dipakai sebagai kunci. `tsc --noEmit` bersih. Tes `map-popup`, `map-data`, `aoi`, `cctv-layers`, `layer-feeds`, dan `camera-catalog` lulus (43). `GET /` dan `GET /masuk` mengembalikan 200. Klik peta tidak diuji di browser.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-10T17:16:24Z
```

### 2026-10-11 02:25 — zona konflik, sweep, dan tautan peta bertipe

- Perubahan: jawaban `/api/conflicts` dibaca lewat `conflictFeed` di `src/lib/map-overlays.ts`. Hasil sweep memakai `SweepResult`. Titik OSINT dan World Remote memakai `ScanTarget`. Tautan malware dan kabel SDK, label polygon, sumber siang-malam, serta gestur gambar memakai tipe yang sama dengan data yang sudah ditulis. HTML popup, susunan layer, URL, dan interval tidak dipindah.
- Fitur: tidak ada
- Perbaikan: anotasi `any` pada pemetaan itu dihapus. Jumlah kejadian zona yang kosong dihitung sebagai nol. `tsc --noEmit` bersih. Tes `map-overlays`, `map-popup`, `map-data`, `aoi`, `cctv-layers`, `layer-feeds`, dan `camera-catalog` lulus (45). `GET /` dan `GET /masuk` mengembalikan 200. Klik peta tidak diuji di browser.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-10T19:10:13Z
```

### 2026-10-11 02:34 — state dasbor dan penulis peta bertipe

- Perubahan: state dasbor yang masih longgar dipindah ke tipe di `src/lib/dashboard-state.ts` (statistik, dossier wilayah, cuaca antariksa, kamera yang dibuka, klik entitas, layer ArcGIS). `setGeo` menerima fitur peta bertipe dan menyerahkannya ke MapLibre sekali. Transform feed mengembalikan `Partial<MapData>`. HTML popup, susunan layer, URL, dan interval tidak dipindah.
- Fitur: tidak ada
- Perbaikan: `any` pada `page.tsx` dan penulis peta di `OsirisMap.tsx` habis. Nama siaran yang kosong disimpan sebagai string kosong. Jumlah suar matahari yang tidak ada tidak lagi dibandingkan langsung. `tsc --noEmit` bersih. Tes feed, peta, dan space-weather lulus (48). `GET /` dan `GET /masuk` mengembalikan 200. Klik peta tidak diuji di browser.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-10T19:25:34Z
```

### 2026-10-11 03:13 — sisa tipe longgar OSIRIS

- Perubahan: rute API, katalog CCTV, panel OSINT, intel rantai, dan panel samping memakai tipe di batas JSON. Susunan fungsi, URL, HTML popup, dan interval tidak dipindah. Akhir baris rute maritim yang sempat berubah dikembalikan, lalu tipe kapal AIS dipasang di atasnya. Tiga indeks yang memang terbuka tetap `any`: rekaman peta, properti kabel, dan kantong markets.
- Fitur: tidak ada
- Perbaikan: kegagalan Photon pada dossier tempat tidak disimpan, jadi klik berikutnya bertanya lagi. Daftar kamera yang kosong tetap diingat sebentar supaya sumber yang mati tidak dipanggil setiap tampilan. `tsc --noEmit` bersih. Tes lulus (944). `GET /` dan `GET /masuk` mengembalikan 200. Klik peta tidak diuji di browser.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-10T19:35:24Z
```

### 2026-10-11 05:40 — indeks any habis, helper murni dipisah

- Perubahan: indeks `[key: string]: any` pada rekaman peta, properti kabel, dan kantong markets diganti bidang yang memang dibaca. Terminator malam, transform berita, jam dan tombol dasbor, ukuran rute, serta parser siaran dipindah ke modul sendiri. Urutan layer peta, HTML popup, URL, dan tabel rute CCTV tetap di berkasnya.
- Fitur: tidak ada
- Perbaikan: tidak ada `any` tipe yang tersisa di `src`. `tsc --noEmit` bersih. Tes lulus (950). `GET /` dan `GET /masuk` mengembalikan 200. Klik peta tidak diuji di browser.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-10T20:14:15Z
```

### 2026-10-11 09:25 — masuk, daftar, dan persetujuan akun OSIRIS

- Perubahan: akun operasional mendapat email, satuan, pangkat, status PENDING/ACTIVE/REJECTED/DISABLED, dan versi sesi. Token reset disimpan sebagai hash. Jejak autentikasi masuk tabel AuthAudit. Peran OpsRole yang sudah ada tidak diganti. Peta publik di `/` tidak dikunci.
- Fitur: halaman masuk, daftar, lupa sandi, dan atur sandi. Admin menyetujui akun di `/pengguna`. Remember Me 14 hari. Reset surel menunggu SMTP. Viewer dan Monitoring tetap membaca dasbor operator dan tidak menulis situasi.
- Perbaikan: migrasi `20261011120000_auth_accounts` menambah kolom dan tabel, lalu menandai akun yang sudah nonaktif sebagai DISABLED. Akun aktif yang sudah ada tetap ACTIVE. `tsc --noEmit` bersih. Tes lulus (974, 20 dilewati). Server dev dimuat ulang supaya klien Prisma membaca kolom baru. Akun uji dihapus setelah percobaan. Klik peta tidak diuji di browser.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-10T22:41:30Z
```

### 2026-10-13 18:14 — server dev OSIRIS dihidupkan

- Perubahan: tidak ada perubahan kode. Server dev Next.js 16.3.8 dihidupkan lagi dari `/home/localhost/osiris` pada `0.0.0.0:3005`. Proses npm 6188, next-server 6229. Log `~/.grok/long-running-background-tasks/osiris_dev_6188.log`. Pemantau mengecek `http://127.0.0.1:3005/masuk`.
- Fitur: tidak ada
- Perbaikan: tidak ada. `GET /masuk` 200 dan `GET /` 200. Kontainer `osiris-postgres` tetap sehat di `127.0.0.1:5433`. Port 3000 ATLAS tidak dipakai.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-11T02:25:56Z
```

### 2026-10-13 18:42 — halaman awal OSIRIS menjadi login

- Perubahan: `/` mengalihkan pengunjung tanpa sesi ke `/masuk?next=/peta`. Peta monitoring dipindah ke `/peta` tanpa disalin ulang. `src/proxy.ts` menolak halaman `/peta`, `/operator`, `/pengguna`, dan API monitoring bila sesi tidak hidup. Cookie tetap `osiris_ops`, HttpOnly, SameSite Lax, Secure hanya saat produksi.
- Fitur: tidak ada sistem peran baru. Peran yang sudah ada tetap. Setelah masuk dari alamat utama, pengguna dibuka ke peta. Tautan `?layers=` ikut terbawa.
- Perbaikan: tidak ada. Uji: `/` dan `http://192.168.39.139:3005/` 307 ke login. `/peta` dan `/api/cctv` tanpa sesi ditolak. Kata sandi salah 401. Masuk akun aktif lalu `/peta` 200, `/api/earthquakes` 200, `/api/ops/situations` 200. Cookie kedaluwarsa dan cookie setelah keluar ditolak. Firefox headless desktop dan tablet menampilkan formulir masuk, lalu kanvas peta. `/api/health`, daftar, dan webhook tetap tanpa sesi.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T11:14:44Z
```

### 2026-10-13 19:25 — latar partikel pada halaman masuk

- Perubahan: halaman `/masuk` memakai kanvas partikel cyan di atas `#030712`. Peta Indonesia pada login diganti karena dua lapisan sekaligus terlalu ramai. Halaman daftar, lupa sandi, dan atur sandi tetap memakai peta Indonesia. Autentikasi, cookie, API, dan pengalihan tidak diubah.
- Fitur: komponen `ParticleBackground` menggambar 65 partikel pada layar 1440×900, lebih sedikit pada layar kecil, garis antarpartikel, dan garis ke kursor mouse. Animasi berhenti saat tab disembunyikan atau saat pengguna meminta pengurangan gerak.
- Perbaikan: tidak ada. Uji Vitest jumlah partikel lulus. ESLint pada berkas yang disentuh bersih. Firefox headless 1440×900 dan 1024×768 menampilkan kanvas fixed tanpa scrollbar, formulir tetap di depan, sandi salah tetap ditolak, masuk akun aktif tetap menuju `/peta`. `/daftar` tidak memuat kanvas partikel.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T11:42:46Z
```

### 2026-10-13 19:28 — partikel login menjadi 120

- Perubahan: jumlah acuan partikel di `ParticleBackground.tsx` dari 65 menjadi 120 pada layar 1440×900. Layar lebih kecil tetap memakai lebih sedikit, dan tidak melebihi 120.
- Fitur: tidak ada
- Perbaikan: tidak ada. Tes jumlah partikel lulus. Firefox pada jendela 1440×900 menampilkan kanvas lebih rapat, formulir tetap di depan, tanpa scrollbar dan tanpa error overlay.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T12:25:17Z
```

### 2026-10-13 19:50 — otorisasi peran OSIRIS

- Perubahan: pintu `/` tanpa sesi mengarah ke `/masuk` tanpa `next`. Sesi hidup memakai `homeForRole`: Admin dan bootstrap SUPER_ADMIN ke `/pengguna`, kedua peran operator ke `/operator`, Viewer (ANALYST) dan Monitoring (PIMPINAN) ke `/peta`. Proxy menolak API admin untuk peran lain dengan 403 dan mengembalikan non-admin dari `/pengguna` ke beranda perannya. Baca dan tulis situasi Operator Kodam tetap pada `kotamaopsId` akun. Tidak ada migrasi database dan tidak ada peran baru.
- Fitur: tidak ada halaman atau peran baru. Konfigurasi yang sudah ada, yaitu token CCTV, tetap hanya untuk Admin. Jejak autentikasi yang sudah ada tetap hanya untuk Admin.
- Perbaikan: parameter `next` tidak lagi memaksa semua peran ke peta, dan tidak membuka `/pengguna` bagi Operator, Viewer, atau Monitoring. Tes kebijakan peran, gerbang sesi, login, dan token CCTV lulus (33 tes). Pemeriksaan langsung: tanpa sesi `/` menjadi 307 `/masuk`, API pengguna, jejak, token, dan situasi menjadi 401; sesi Admin membuka `/pengguna` dan API tersebut 200, lalu setelah keluar kembali 401.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T12:28:49Z
```

### 2026-10-13 19:58 — server dev OSIRIS dihentikan

- Perubahan: proses dev Next.js di port 3005 dihentikan bersama pengawanya. npm pid 6188, next-server pid 6229, dan `watch_osiris_dev.sh` sudah berhenti. Port 3005 kosong.
- Fitur: tidak ada
- Perbaikan: tidak ada. Kontainer `osiris-postgres` tetap sehat di `127.0.0.1:5433`.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T12:51:04Z
```

### 2026-10-13 23:33 — server dev OSIRIS dihidupkan

- Perubahan: server dev Next.js 16.3.8 dinyalakan lagi dari `/home/localhost/osiris` dengan `npm run dev -- --hostname 0.0.0.0 --port 3005`. npm pid 5699, next-server pid 5758, mendengarkan `0.0.0.0:3005`. Log `~/.grok/long-running-background-tasks/osiris_dev_5699.log`. Pengawas `watch_osiris_dev.sh` memantau `http://127.0.0.1:3005/masuk`.
- Fitur: tidak ada
- Perbaikan: tidak ada. `GET /masuk` mengembalikan 200. `GET /` tanpa sesi mengembalikan 307 ke `/masuk`. Kontainer `osiris-postgres` tetap sehat di `127.0.0.1:5433`.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T12:58:22Z
```

### 2026-10-14 00:44 — audit RBAC OSIRIS

- Perubahan: penulisan situasi memakai `situationWriteLookup`. ID yang tidak ada dan ID di luar unit Operator Kodam sama-sama menjawab 404 `Situasi tidak ditemukan.` Batas tulis tidak berubah. Halaman `/operator` memakai `situationWhere` yang sama dengan daftar API. Tidak ada migrasi, peran baru, atau perubahan akun.
- Fitur: tidak ada
- Perbaikan: kebocoran keberadaan situasi unit lain ditutup pada keputusan lookup. Penetapan `SUPER_ADMIN` oleh Admin tidak diubah karena itu kebijakan yang sudah terpakai: jejak 13 Oktober 23:47 WIB mencatat `ANALYST -> SUPER_ADMIN` lalu persetujuan akun. Uji hidup peran tertanda belum dilakukan karena tidak ada akun uji terpisah; akun operasional tidak dipakai untuk masuk.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T16:34:26Z
```

### 2026-10-14 00:57 — penetapan SUPER_ADMIN dikunci

- Perubahan: hanya sesi `SUPER_ADMIN` yang boleh memberi atau mencabut peran `SUPER_ADMIN` pada `POST` dan `PATCH /api/ops/users`. Admin tetap mengelola peran lain. Formulir `/pengguna` menyembunyikan pilihan itu dari Admin dan mengunci pilihan pada akun yang sudah `SUPER_ADMIN`. Pemeriksaan utama ada di server. Tidak ada migrasi, peran baru, halaman baru, atau perubahan akun yang sudah ada. Ringkasan akses endpoint ada di `osiris/docs/akses-endpoint.md`.
- Fitur: tidak ada
- Perbaikan: Admin tidak lagi dapat mengangkat dirinya atau pengguna lain menjadi `SUPER_ADMIN`, termasuk lewat permintaan API langsung. Penolakan tidak menulis data dan tidak menambah jejak. Perubahan yang berhasil tetap tercatat. Perlindungan super admin aktif terakhir tetap ada. Uji peran di server hidup belum dijalankan karena tidak ada akun uji yang aman.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T17:45:20Z
```

### 2026-10-14 01:08 — server dev OSIRIS dihentikan

- Perubahan: proses dev Next.js di port 3005 dihentikan bersama pengawanya. npm pid 5699, next-server pid 5758, dan `watch_osiris_dev.sh` sudah berhenti. Port 3005 kosong.
- Fitur: tidak ada
- Perbaikan: tidak ada. Kontainer `osiris-postgres` tetap sehat di `127.0.0.1:5433`.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T17:58:02Z
```

### 2026-10-16 20:21 — server dev OSIRIS dinyalakan

- Perubahan: Next.js dev OSIRIS dinyalakan lagi dari `/home/localhost/osiris` dengan `npm run dev -- --hostname 0.0.0.0 --port 3005`. npm pid 9679, next-server pid 9737, mendengarkan `0.0.0.0:3005`. Log `~/.grok/long-running-background-tasks/osiris_dev_9679.log`. Pengawas memeriksa `http://127.0.0.1:3005/masuk`.
- Fitur: tidak ada
- Perbaikan: tidak ada. `GET /masuk` 200, `GET /` tanpa sesi 307 ke `/masuk`, `GET /api/health` 200. Kontainer `osiris-postgres` tetap sehat di `127.0.0.1:5433`. Alamat `ens33` masih `192.168.39.139/24`.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-13T18:09:06Z
```

### 2026-10-16 20:33 — konteks produk OSIRIS

- Perubahan: `/impeccable init` menulis `/home/localhost/osiris/PRODUCT.md`. Pengguna utama adalah Operator Pusdalops dan Operator Kodam. Pekerjaannya memantau peta dan menyimpan situasi Kotamaops terkini. OSIRIS dicatat sebagai sistem sendiri; ATLAS tidak dipakai sebagai acuan. Salinan Indonesia di `/masuk`, `/operator`, dan `/pengguna` tetap, dan peta tetap di `/peta`. `DESIGN.md` tidak ditulis.
- Fitur: tidak ada
- Perbaikan: tidak ada. Tidak ada perubahan kode aplikasi, CSP, atau database.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T13:21:33Z
```

### 2026-10-16 20:36 — jalur bangun Impeccable

- Perubahan: jawaban code-first disimpan di `/home/localhost/osiris/.impeccable/config.json` sebagai `buildPath: code`. Berlaku untuk halaman pemasaran dan pameran. Layar aplikasi tetap dari kode.
- Fitur: tidak ada
- Perbaikan: tidak ada. CSP dan kode aplikasi tidak diubah.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T13:34:26Z
```

### 2026-10-16 20:39 — izin CSP untuk mode live

- Perubahan: atas persetujuan pengguna, `next.config.ts` menambah `http://localhost:8400` pada `default-src` hanya bila `NODE_ENV` development. Konfigurasi live ditulis di `/home/localhost/osiris/.impeccable/live/config.json` untuk `src/app/layout.tsx`, dengan `cspChecked` true.
- Fitur: tidak ada
- Perbaikan: tidak ada. `GET /masuk` tetap 200 dan header development memuat host tersebut. Respons produksi tidak memuatnya.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T13:34:26Z
```

### 2026-10-16 21:15 — gulir halaman operasi OSIRIS

- Perubahan: kunci `overflow: hidden` pada `html, body` tetap untuk peta. Halaman masuk dan operasi memakai kelas `.ops-scroll` sehingga dokumen dapat digulir, sementara `body` tetap `overflow: visible` agar tidak muncul dua batang gulir. `AuthFrame` tidak lagi memotong isi, dan kartu masuk dipusatkan hanya selama muat di viewport.
- Fitur: tidak ada
- Perbaikan: konten `/masuk`, `/operator`, dan `/pengguna` yang lebih tinggi daripada jendela dapat dijangkau. `/peta` tetap `position: fixed` dan dokumennya tidak bergulir. Tidak ada perubahan autentikasi, API, atau database.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T13:39:31Z
```

### 2026-10-16 22:01 — aksesibilitas gerak dan bahasa OSIRIS

- Perubahan: `prefers-reduced-motion: reduce` mematikan transisi universal 0,6 detik dan animasi dekoratif, tanpa `transition-duration: 0.01ms`. Pesan simpan operator dan pengguna memakai `role="status"` untuk berhasil dan `role="alert"` untuk gagal. Halaman Indonesia memakai `lang="id"` lewat `src/app/(id)`, halaman Inggris memakai `lang="en"` lewat `src/app/(en)`. URL tidak berubah.
- Fitur: tidak ada
- Perbaikan: indikator fokus, status, dan transisi kelas yang lebih spesifik tetap ada. Partikel masuk tetap berhenti lewat kode yang sudah ada. Gulir `.ops-scroll` dan kunci dokumen `/peta` tidak diubah. Tidak ada perubahan autentikasi, API, atau database. Pembuatan pengguna uji memakai stub peramban; log dev tidak mencatat POST `/api/ops/users` pada percobaan yang lulus. Membuka `/peta` memunculkan baris cache Telegram dan `GDACS normalization error: AbortError` yang sudah ada pada umpan peta.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T14:15:56Z
```

### 2026-10-16 22:22 — verifikasi regresi P1 OSIRIS

- Perubahan: tidak ada perubahan kode.
- Fitur: tidak ada
- Perbaikan: verifikasi route group, penyimpanan nyata, dan reduced motion. Akun uji sementara dihapus. Baris situasi I/BB dikembalikan ke `updatedAt` 2026-10-02 08:19:20.895 dan revisi uji dihapus. Dua klik simpan pada giliran yang sama mengirim dua PATCH.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T15:01:59Z
```

### 2026-10-16 22:46 — kunci simpan ganda situasi OSIRIS

- Perubahan: penyimpanan situasi operator memakai pengunci sinkron per baris sebelum permintaan jaringan. State sibuk tetap hanya untuk tampilan tombol. Endpoint PATCH tidak diubah dan tidak dibuat idempoten.
- Fitur: tidak ada
- Perbaikan: dua submit pada giliran yang sama hanya menghasilkan satu PATCH. Uji browser memakai Kotamaops P12UJI, lalu baris itu dihapus. Situasi I/BB tidak berubah. Satu baris audit login admin yang sudah ada bertambah karena masuk untuk uji.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T15:23:06Z
```

### 2026-10-17 01:59 — kontras dan gulir privacy OSIRIS

- Perubahan: token teks redup inti menjadi `#8C8A84`, teks redup ghost menjadi `#8A74B0`, dan border diam kontrol memakai `--control-border` putih 42%. Label `text-white/45` di portal operasi menjadi `text-white/55`. Halaman `/privacy` memakai `.privacy-root` agar dokumen bisa digulir. Opacity tambahan pada label HUD dan judul dokumen yang memakai token redup dihapus.
- Fitur: tidak ada
- Perbaikan: teks redup dan border bidang yang gagal kontras pada batch P2-01 sampai P2-05, serta halaman privacy yang terpotong pada viewport pendek. Batch target sentuh belum dikerjakan. Login, sesi, RBAC, API, basis data, dan data situasi tidak diubah. Satu login admin untuk pengukuran menambah baris audit masuk.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T15:46:49Z
```

### 2026-10-17 06:35 — identitas tampilan ATLAS pada peta

- Perubahan: nama tampilan aplikasi peta di `/home/localhost/osiris` menjadi ATLAS — Advanced Tactical Location & Analytics System. Commit baru `fa9848a22f4dd15150a8bf5b6a8a26c3930848fd` pada branch `master`, satu commit di depan `origin/master`, belum di-push. Identitas git untuk commit itu memakai `localhost <localhost@localhost>` lewat variabel lingkungan; konfigurasi git tidak diubah. Wordmark, splash, judul browser, metadata, PWA, favicon SVG, dokumentasi, privacy, dan subjek email reset memakai nama itu. Canonical absolut `https://osirisai.live`, tautan sosial, toko, dan dukungan pengembang asal dihapus dari permukaan yang disentuh karena domain produksi belum ditentukan. Aplikasi tetap terpisah dari pusat komando `/home/localhost/Project/atlas`. Port 3005, cookie `osiris_ops`, sesi, RBAC, API, basis data `osiris_ops`, Prisma, rahasia, `LICENSE`, dan riwayat git tidak diubah. `deploy.sh` tidak dijalankan. Label `$OSIRIS` di TokenPanel, koordinat citra `ghcr.io/simplifaisoul/osiris`, User-Agent, dan Umami belum diubah. Tiga label tampilan di `OsirisMap.tsx`, `OsintPanel.tsx`, dan `LayerPanel.tsx` ada di pohon kerja yang berjalan tetapi tidak masuk commit karena berkas itu sudah berisi perubahan lokal lain.
- Fitur: tidak ada
- Perbaikan: tidak ada. `npx tsc --noEmit` keluar 0. `npx vitest run` lulus 1007 tes, 20 dilewati. Server dev peta tetap di `0.0.0.0:3005`. Port 3000 menolak koneksi; kontainer pusat komando sudah berhenti sebelumnya dan tidak dinyalakan. Login dan logout uji menambah baris audit masuk; kata sandi tidak dicatat.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T19:00:08Z
```

### 2026-10-17 08:19 — server dev peta dihentikan

- Perubahan: server Next.js aplikasi peta dihentikan. npm pid 214708, next-server pid 214744, dan pemantau `watch_osiris_dev.sh` ikut berhenti. Port 3005 bebas. Berkas log tetap di `~/.grok/long-running-background-tasks/osiris_dev_214708.log`. Berkas pid dihapus karena prosesnya sudah mati.
- Fitur: tidak ada
- Perbaikan: tidak ada. Kontainer `osiris-postgres` tetap sehat di `127.0.0.1:5433`. Pusat komando port 3000 tidak dinyalakan dan tidak diubah.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-16T23:36:03Z
```

### 2026-10-17 11:43 — server dev peta dinyalakan

- Perubahan: server Next.js aplikasi peta dinyalakan lagi dari `/home/localhost/osiris` dengan `npm run dev -- --hostname 0.0.0.0 --port 3005`. npm pid 5943, next-server pid 6003, mendengarkan `0.0.0.0:3005`. Log di `~/.grok/long-running-background-tasks/osiris_dev_5943.log`. Pemantau `watch_osiris_dev.sh` memeriksa `http://127.0.0.1:3005/masuk`.
- Fitur: tidak ada
- Perbaikan: tidak ada. `GET /masuk` menjawab 200. `GET /` tanpa sesi menjawab 307 ke `/masuk`. `GET /api/health` menjawab 200. Kontainer `osiris-postgres` tetap sehat di `127.0.0.1:5433`. Alamat ens33 saat ini `192.168.39.139/24`. Pusat komando port 3000 tidak dinyalakan.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T01:19:36Z
```

### 2026-10-17 12:09 — Fase 1 identitas tampilan peta selesai

- Perubahan: commit baru `d7ae2c5c2c33287925d75ee50b8ef3bad10ba625` di `/home/localhost/osiris`, branch `master`, dua commit di depan `origin/master`, belum di-push. Label tampilan yang tersisa diganti: `OSIRIS SDK` menjadi `ATLAS SDK`, `OSIRIS RECON TOOLKIT` menjadi `ATLAS RECON TOOLKIT`, label sumber popup SDK menjadi `ATLAS`, dan tautan bawaan `https://osirisai.live` pada popup itu dihapus. Gambar Open Graph memakai ATLAS — Advanced Tactical Location & Analytics System. Mata Horus tidak diubah. Commit sebelumnya `fa9848a` sudah memasang nama yang sama pada splash, login, judul browser, metadata, PWA, favicon SVG, dokumentasi, privacy, dan email reset. Aplikasi tetap terpisah dari pusat komando. Port 3005, cookie `osiris_ops`, sesi, RBAC, API, basis data `osiris_ops`, Prisma, rahasia, `LICENSE`, dan riwayat git tidak diubah. `deploy.sh` tidak dijalankan. Port 3000 tidak dinyalakan.
- Fitur: tidak ada
- Perbaikan: tidak ada. `npx tsc --noEmit` keluar 0. `npx vitest run` lulus 1007 tes, 20 dilewati. `GET /masuk`, `/docs`, dan `/privacy` menjawab 200 dengan judul ATLAS. `GET /` dan `GET /peta` tanpa sesi menjawab 307 ke `/masuk`. Login uji sebagai super admin lalu logout; API pengguna setelah logout menjawab 401. Kata sandi tidak dicatat. Login dan logout menambah baris audit.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T04:43:58Z
```

### 2026-10-17 13:00 — Fase 2 batch 1: panel token lama disembunyikan

- Perubahan: commit baru `76fa8475b29297278e15e26b21e2802aa951f6eb` di `/home/localhost/osiris`, branch `master`, tiga commit di depan `origin/master`, belum di-push. Panel token `$OSIRIS` tidak lagi digambar di HUD desktop maupun ponsel. Komponen dan URL grafik Dexscreener tetap ada; saklar `SHOW_LEGACY_TOKEN_PANEL` bernilai false. Kedua pemasangan `<TokenPanel />` di dashboard tidak dihapus. Cookie, sesi, RBAC, API, CCTV, interval polling, port 3005, basis data, Prisma, CasaOS, GHCR, dan `deploy.sh` tidak diubah. Port 3000 tidak disentuh.
- Fitur: tidak ada
- Perbaikan: tidak ada. `npx tsc --noEmit` keluar 0. Vitest panel, layer, dan CCTV lulus 24 tes. Login uji sebagai super admin membuka `/peta`; label `$OSIRIS`, judul chart, dan iframe Dexscreener tidak ada pada desktop 1440 dan lebar ponsel. Tombol Token CCTV tetap ada. `GET /api/cctv?region=tpt` anonim 401, setelah masuk 200, setelah logout 401. `GET /api/health` tetap 200 dengan `platform` masih `OSIRIS`. Kata sandi tidak dicatat. Login dan logout menambah baris audit.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T05:10:04Z
```

### 2026-10-17 13:12 — Peta di-push ke GitHub noval1802

- Perubahan: `master` aplikasi peta di `/home/localhost/osiris` dikirim ke repositori privat baru `https://github.com/noval1802/osiris`. HEAD lokal dan `origin/master` sama-sama `76fa8475b29297278e15e26b21e2802aa951f6eb`. Tiga commit yang baru terkirim adalah `fa9848a`, `d7ae2c5`, dan `76fa847`. Remote `origin` sekarang menunjuk ke akun `noval1802`. Remote pengembang asal dipindah ke `upstream` (`https://github.com/simplifaisoul/osiris.git`) dan tidak menerima push. Push pertama ditolak karena token belum punya scope `workflow`; setelah izin perangkat diberikan, pengiriman berhasil. Pohon kerja yang belum di-commit tidak ikut. `deploy.sh` tidak dijalankan. Port 3000 dan 3005 tidak diubah.
- Fitur: tidak ada
- Perbaikan: tidak ada
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T06:01:15Z
```

### 2026-10-17 13:50 — build Docker GitHub peta diperbaiki

- Perubahan: dua commit build peta dikirim ke `origin` `https://github.com/noval1802/osiris` (`master` `16a110093c340e72fd19fcf628f0a1b38e67513a`). `17e3bf4` menghapus halaman lama `/docs` dan `/privacy` yang bentrok dengan grup `(en)`. `16a1100` menambahkan modul yang sudah diimpor halaman peta yang terbit, dan membuat `cctv_jm`, `cctv_jakarta`, serta `tni_ad` opsional pada `ActiveLayers`. Pohon kerja operasional tidak ikut. Remote `upstream` tidak di-push. `deploy.sh` tidak dijalankan.
- Fitur: tidak ada
- Perbaikan: workflow Publish Docker image run `39010224976` pada commit `16a1100` selesai sukses (job `build-and-push`). Run sebelumnya `39009081399` gagal di `npm run build` karena dua rute sejajar, lalu pemeriksaan tipe modul yang belum ada di git. `npx next build` lokal pada pohon yang sama sudah lulus sebelum push (59 halaman).
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T06:12:49Z
```

### 2026-10-17 14:12 — Batch 2: analytics Umami dimatikan

- Perubahan: commit lokal `2ee03c9c1006dc2ef4981f9c8795735df549f00f` dengan pesan `chore(atlas): disable unconfigured analytics`. File di commit: `.env.example` (komentar saja), `src/lib/umami-analytics.ts`, `src/lib/umami-analytics.test.ts`, dan `src/middleware.ts`. `src/proxy.ts` di pohon kerja memanggil helper yang sama, tetapi tetap tidak terlacak karena masih berisi gerbang operasional. Blok operasional di `.env.example` tidak ikut commit. Tidak ada push. `deploy.sh` tidak dijalankan. Cookie, sesi, RBAC, database, Prisma, CCTV, Docker, dan port tidak diubah.
- Fitur: tidak ada
- Perbaikan: tanpa `UMAMI_WEBSITE_ID`, atau bila nilainya kosong, bukan UUID, atau belum ada host kolektor milik deployment ini, tidak ada request analytics dan IP klien tidak dikirim. UUID fallback lama serta hostname kolektor lama tidak dipakai. Vitest: 1013 lulus, 20 dilewati. `npx tsc --noEmit` gagal di dua baris pohon kerja yang tidak ikut commit: `src/components/OsirisMap.tsx(2539,61)` dan `(2540,76)`, `boolean | undefined` tidak dapat diisi ke `boolean` pada `cctv_jm` dan `cctv_jakarta`.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T06:50:19Z
```

### 2026-10-17 14:26 — Batch 3: identitas platform health

- Perubahan: commit lokal `47c51f9292ae9036f45e03473fc19e6881db4e9d` dengan pesan `chore(atlas): update health platform identity`. File: `src/app/api/health/route.ts`, `src/app/(en)/docs/apiCatalog.ts`, `src/app/api/health/route.test.ts`. `platform` pada `GET /api/health` menjadi `ATLAS`. Field, tipe, struktur JSON, dan HTTP 200 tetap. `status` tetap `serving`. Catatan katalog mengganti kata `operational` menjadi `serving`. Daftar `returns` katalog tidak diubah. Tidak ada push. `deploy.sh` tidak dijalankan.
- Fitur: tidak ada
- Perbaikan: tidak ada konsumen yang membaca `platform: OSIRIS`. Tes health 2 lulus. `npx vitest run` 1015 lulus, 20 dilewati. `npx tsc --noEmit` masih gagal hanya di `src/components/OsirisMap.tsx` baris 2539 dan 2540 (`boolean | undefined` ke `boolean` pada `cctv_jm` dan `cctv_jakarta`). Dua error itu tidak diubah.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T07:13:27Z
```

### 2026-10-17 15:50 — Batch 4: identitas persona AI

- Perubahan: commit lokal `09f9a67375c7761b10dee46bfd092f5b1fb50b57` dengan pesan `chore(atlas): update AI persona identity`. File: `src/lib/ai-engine.ts`, `src/app/api/ai/overview/route.ts` (hanya dua kalimat prompt), `src/lib/ai-persona.test.ts`. System prompt, briefing, dan kedua instruksi overview memakai ATLAS. Model tetap `gemini-2.0-flash`. Perubahan tipe lama pada overview tidak ikut commit. Tidak ada push. `deploy.sh` tidak dijalankan.
- Fitur: tidak ada
- Perbaikan: tidak ada. Tes persona 5 lulus. `npx vitest run` 1020 lulus, 20 dilewati. `npx tsc --noEmit` masih gagal hanya di `src/components/OsirisMap.tsx` baris 2539 dan 2540. Dua error itu tidak diubah.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T07:26:18Z
```

### 2026-10-17 15:56 — Batch 5: identitas layanan intel

- Perubahan: commit lokal `8f52c8e74702c3a9a238c60c38e2fbbe8ba6d901` dengan pesan `chore(atlas): update intel service identity`. File: `intel/server.js` dan `src/lib/intel-identity.test.ts`. Field `source` pada `GET /resolve` menjadi `ATLAS Intelligence Layer`. Nama field, urutan kunci, path, dan kode HTTP tetap. User-Agent Wikidata dan `source` di dalam node tidak diubah. Tidak ada push. `deploy.sh` tidak dijalankan.
- Fitur: tidak ada
- Perbaikan: tidak ada. Tes intel 2 lulus. `npx vitest run` 1022 lulus, 20 dilewati. `npx tsc --noEmit` masih gagal hanya di `src/components/OsirisMap.tsx` baris 2539 dan 2540. Dua error itu tidak diubah.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T08:50:21Z
```

### 2026-10-20 15:04 — server dev peta dinyalakan

- Perubahan: server Next.js aplikasi peta dinyalakan lagi dari `/home/localhost/osiris` dengan `npm run dev -- --hostname 0.0.0.0 --port 3005`. npm pid 6263, next-server pid 6304, mendengarkan `0.0.0.0:3005`. Log di `~/.grok/long-running-background-tasks/osiris_dev_6263.log`. Pemantau `watch_osiris_dev.sh` memeriksa `http://127.0.0.1:3005/masuk`. Proses lama npm pid 5943 sudah mati sebelum start ini. `osiris-postgres` tidak dihentikan.
- Fitur: tidak ada
- Perbaikan: tidak ada. `GET /masuk` menjawab 200. `GET /` tanpa sesi menjawab 307 ke `/masuk`. `GET /api/health` menjawab 200. Kontainer `osiris-postgres` tetap sehat di `127.0.0.1:5433`. Alamat ens33 saat ini `192.168.39.139/24`. Pusat komando port 3000 tidak dinyalakan.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-17T08:58:28Z
```

### 2026-10-20 15:17 — catatan migrasi dikirim ke GitHub

- Perubahan: catatan `docs/MIGRASI.md` sejak 30 September 2026 dikirim ke `origin` `https://github.com/noval1802/atlas.git`. Repositori itu publik dan namanya di GitHub `noval1802/Atlas-V.0.0.1`. Commit `7eda4b3` mengubah `scripts/sync-lan-address.sh`: `nexops_dir` menjadi `/home/localhost/nexops` karena `/home/localhost/Project/nexops` tidak ada. Berkas `readme-atlas-adalah.md` tidak ikut karena berisi angka database yang sedang berjalan, nama akun, dan alamat LAN. Pohon kerja `/home/localhost/osiris` tidak di-commit dan tidak di-push. `HEAD` peta tetap `8f52c8e`, sama dengan `origin/master` privat `noval1802/Atlas-V.0.1`. `.env.example` dan `docker-compose.yml` OSIRIS tidak dikirim karena berisi rahasia.
- Fitur: tidak ada
- Perbaikan: skrip sinkron LAN memakai folder Nextcloud yang ada. Server peta port 3005 tidak dihentikan. Port 3000 tidak dinyalakan.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-20T08:05:05Z
```

### 2026-10-20 15:26 — tata cara clone ditulis di README

- Perubahan: `README.md` pusat komando mendapat bagian `Menjalankan di perangkat lain`. Isinya langkah clone `https://github.com/noval1802/Atlas-V.0.0.1.git`, pembuatan `.env` dan `.env.local` dari `.env.example`, sertifikat lokal, `docker compose up -d --build`, migrasi Prisma, seed data awal, serta syarat Keycloak. Nilai rahasia tidak ditulis. `readme-atlas-adalah.md` tidak diubah dan tidak dikirim. Skema basis data tidak berubah. Server peta port 3005 tidak dihentikan. Port 3000 tidak dinyalakan.
- Fitur: tidak ada
- Perbaikan: pagar kode yang rusak pada bagian menjalankan aplikasi diganti oleh tata cara ini.
- Error layanan:

```text
## atlas-app
tidak ada baris error

## atlas-realtime
tidak ada baris error

## atlas-postgres
tidak ada baris error

## atlas-proxy
tidak ada baris error

## atlas-keycloak
tidak ada baris error

## atlas-keycloak-db
tidak ada baris error

RINGKAS tidak ada baris error baru sejak 2026-10-20T08:18:28Z
```


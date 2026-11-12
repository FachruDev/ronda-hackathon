# Ronda Kit: MVP

**Kategori:** Skeleton Crew
**Target MVP selesai:** Minggu, 22 November 2026, kira-kira 10 hari dari sekarang
**Tujuan MVP:** satu skenario gladi ransomware bisa dimainkan dari awal sampai akhir di browser, dengan engine yang lolos property-based test, dan sudah live di GitHub Pages.

MVP adalah versi terkecil yang sudah bisa ditunjukkan di video demo. Aplikasi kedua (K3) dan Crew App dikerjakan setelah MVP selesai.

---

## 1. Isi MVP

| # | Komponen | Isi | Wajib di MVP? |
|---|---|---|---|
| 1 | **Engine** (`packages/engine`) | Memuat skenario JSON, memvalidasi skema, menjalankan alur node, pilihan, dan node berikutnya, menghitung skor, dan membuat laporan akhir | Ya |
| 2 | **Property-based tests** | Uji invariant grafik skenario (lihat bagian 4) | Ya |
| 3 | **Katalog kontrol** (`scenarios/controls.json`) | Sekitar 10 kontrol keamanan (backup offline, MFA, isolasi jaringan, dll.) dwibahasa | Ya |
| 4 | **Skenario 1: "Malam di Toko Sumber Rejeki"** | 10–14 node, 4 ruangan, 3 ending | Ya |
| 5 | **App A: Rumah Hantu Ransomware** (`apps/ransomware-house`) | UI web: ruangan, teks, pilihan, umpan balik, laporan akhir | Ya |
| 6 | **Toggle bahasa ID/EN** | Semua teks dua bahasa | Ya |
| 7 | **Laporan akhir** | Skor, kontrol yang terlewat, checklist yang bisa dicetak | Ya |
| 8 | **Deploy GitHub Pages** dan **lisensi MIT** | URL live untuk juri | Ya |
| 9 | Hook Kiro: validasi dan tes saat menyimpan skenario | Satu hook | Ya |
| 10 | App B: Ronda Gladi Api (K3) | Aplikasi kedua dari engine yang sama | Tidak (minggu 2) |
| 11 | Custom agents, power kustom, MCP server sendiri | Untuk kriteria Technological Implementation | Tidak (minggu 2) |
| 12 | Crew App "Kentongan" | Jadwal gladi bulanan dan rekap tim | Tidak (minggu 3) |
| 13 | Skenario 2–3 | Phishing, akun admin bocor | Tidak (minggu 2) |

**Keputusan teknis MVP:** pakai web (Vite + TypeScript) dulu, bukan Godot. Engine, PBT, dan UI jadi satu bahasa, deploy statisnya gampang, dan juri langsung bisa main di browser. Godot bisa dipertimbangkan nanti hanya kalau waktunya cukup.

---

## 2. Alur pengguna

1. **Layar judul.** Judul, satu kalimat masalah ("Kalau file tokomu tiba-tiba terkunci malam ini, apa yang kamu lakukan?"), tombol Mulai, dan toggle ID/EN.
2. **Ruangan 1: Deteksi.** Situasi awal dan 3–4 pilihan.
3. Setiap pilihan langsung memberi **umpan balik singkat**. Pilihan buruk memunculkan "hantu" (efek visual) dan menyebut kontrol yang seharusnya ada.
4. **Ruangan 2: Isolasi**, lalu **Ruangan 3: Komunikasi**, lalu **Ruangan 4: Pemulihan**.
5. **Ending.** Salah satu dari: Rumah Selamat, Setengah Selamat, atau Rumah Dikuasai Hantu.
6. **Laporan akhir.** Skor, daftar kontrol yang terlewat beserta penjelasan, dan tombol "Cetak checklist" yang memakai print CSS.

Satu sesi sebaiknya selesai dalam **3–5 menit**, supaya juri mau mencobanya sampai habis.

---

## 3. Kerangka skenario 1 (fiktif)

**Latar:** toko bangunan keluarga "Sumber Rejeki". Ada 3 PC kasir, 1 PC admin, NAS untuk backup yang selalu tersambung, dan Wi-Fi bersama. Kejadiannya Jumat pukul 21.00.

| Ruangan | Situasi | Contoh pilihan (✓ baik, ✗ buruk) |
|---|---|---|
| Deteksi | Admin melihat file Excel berubah jadi `.locked` dan ada catatan tebusan di desktop | ✓ Cabut kabel LAN dan matikan Wi-Fi PC itu · ✗ Bayar tebusan sekarang · ✗ Abaikan sampai Senin · ✗ Restart semua PC |
| Isolasi | NAS backup masih tersambung ke jaringan | ✓ Putuskan NAS dari jaringan · ✗ Buka NAS untuk cek file · ✓ Ganti password Wi-Fi dan akun admin dari perangkat bersih |
| Komunikasi | Pegawai panik, ada data pelanggan di PC admin | ✓ Catat kronologi dan simpan bukti (foto layar catatan tebusan) · ✓ Hubungi pihak IT atau penyedia layanan · ✓ Siapkan pemberitahuan ke pelanggan bila data pribadi terdampak · ✗ Hapus catatan tebusan dan diam saja |
| Pemulihan | Perlu memutuskan cara kembali beroperasi | ✓ Pulihkan dari backup offline yang diuji · ✗ Pakai alat "dekripsi gratis" dari situs tak dikenal · ✓ Aktifkan MFA dan rapikan akun |

**Catatan konten:**
- Semua kejadian fiktif. Jangan pakai data, topologi, atau prosedur dari tempat kerjamu.
- Untuk klaim hukum, misalnya kewajiban pemberitahuan kebocoran data pribadi menurut UU PDP dan tenggatnya, **cek pasal aslinya** sebelum dimasukkan. Kalau ragu, tulis sebagai saran umum tanpa angka.
- Tidak ada instruksi cara menyerang. Fokusnya pada keputusan bertahan.

---

## 4. Property-based tests (bahan utama write-up)

Pakai **fast-check** di TypeScript. Properti yang diuji, baik terhadap skenario asli maupun grafik acak yang dibangkitkan:

1. **Setiap jalur berakhir.** Dari node awal, setiap urutan pilihan mencapai ending dalam N langkah, tanpa siklus tak berujung.
2. **Tidak ada jalan buntu.** Setiap node non-ending punya minimal satu pilihan, dan setiap `next` menunjuk node yang ada.
3. **Semua node terjangkau** dari node awal.
4. **Setiap pilihan buruk menunjuk minimal satu kontrol** yang ada di katalog.
5. **Dwibahasa lengkap.** Setiap teks punya `id` dan `en` yang tidak kosong.
6. **Skor monoton.** Mengganti satu pilihan buruk dengan pilihan baik tidak pernah menurunkan skor akhir.
7. **Laporan konsisten.** Kontrol yang "terlewat" di laporan sama persis dengan gabungan kontrol dari pilihan buruk yang diambil.

Saat PBT menemukan bug, simpan contoh minimal hasil *shrink*-nya (screenshot dan commit). Itu jadi cerita "what PBT caught" di write-up.

---

## 5. Jadwal MVP (12–22 November)

| Tanggal | Kerjaan | Selesai kalau… |
|---|---|---|
| 12–13 Nov | Buat repo `ronda` (publik, lisensi MIT), buka di Kiro, taruh 3 file steering dari paket ini, setup Vite + TS + Vitest + fast-check | Repo jalan dan `.kiro/steering` ter-commit |
| 14–15 Nov | Tempel `kiro-spec-prompt.md` ke Kiro (mode Spec). Biarkan Kiro membuat `requirements.md`, `design.md`, `tasks.md`, lalu kerjakan task engine | Engine dan 7 properti PBT hijau |
| 16–18 Nov | Tulis skenario 1 (JSON) dan katalog kontrol. Buat UI ruangan, pilihan, dan umpan balik | Skenario bisa dimainkan sampai ending |
| 19–20 Nov | Laporan akhir dan cetak checklist, toggle ID/EN, polesan visual "rumah hantu" | Terlihat seperti produk, bukan prototipe |
| 21 Nov | Buat hook Kiro: saat file di `scenarios/` disimpan, jalankan validasi dan PBT. Deploy ke GitHub Pages | URL live bisa dibuka di HP |
| 22 Nov | Uji ke 3–5 orang (rekan, pemilik toko), catat masukan | Ada umpan balik nyata untuk video dan pitch |

---

## 6. Definition of Done MVP

- [ ] Satu skenario bisa dimainkan sampai salah satu dari 3 ending, di desktop dan HP
- [ ] 7 properti PBT lolos, dan minimal satu bug ditemukan PBT lalu didokumentasikan
- [ ] Toggle ID/EN berfungsi di semua layar
- [ ] Laporan akhir menampilkan skor, kontrol terlewat, dan checklist cetak
- [ ] Live di GitHub Pages
- [ ] Repo publik, lisensi MIT terlihat di About, folder `.kiro` ter-commit (tidak di-gitignore)
- [ ] Ada minimal satu spec, steering, dan satu hook di `.kiro`
- [ ] README berisi cara menjalankan lokal dan link demo

---

## 7. Setelah MVP (gambaran singkat)

- **Minggu 2 (23–29 Nov):** App B Gladi Darurat K3 dari engine yang sama, skenario 2, custom agents (`scenario-author`, `translator`, `security-reviewer`), power kustom, dan MCP server kecil untuk katalog kontrol.
- **Minggu 3 (30 Nov–3 Des):** Crew App "Kentongan" (bonus, boleh dipotong), video di bawah 3 menit, write-up, blog, dan posting #KiroweenHackathon26. Submit paling lambat 3 Desember.

---

## Isi paket ini

| File | Dipakai untuk |
|---|---|
| `MVP.md` | Dokumen ini |
| `kiro-spec-prompt.md` | Prompt yang ditempel ke Kiro (mode Spec) untuk membuat spec engine dan App A |
| `steering/product.md`, `tech.md`, `structure.md` | Draf steering. Taruh di `.kiro/steering/` lalu sesuaikan |

Sesuaikan draf steering dan prompt ini dengan gayamu sendiri sebelum dipakai. Di write-up, ceritakan apa adanya cara kamu memakai Kiro.

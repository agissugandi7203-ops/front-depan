# Aplikasi Klien Frontend — KOMUNITAS

Aplikasi antarmuka web warga dan dashboard administrasi pelayanan publik yang dibangun menggunakan teknologi modern berbasis React 18, TypeScript, dan Vite.

Dokumen ini menjelaskan kendala pengembangan, solusi teknis yang diterapkan, serta panduan pemasangan klien web.

---

## Tim Pengembang (SMK MARHAS Margahayu)

Aplikasi klien frontend ini dikembangkan dan dioptimalkan oleh:
* **Fachri Angga Pratama** (Ketua Tim / Full Stack Developer)
* **Alif Ikhwan Aulad Alhafidz** (Full Stack Creator)
* **Fikri Awalludin Rahmat** (Administrasi Projek)

Aplikasi live dapat diakses melalui: **[komunitasai.web.id](https://komunitasai.web.id)**

---

## Rumusan Masalah dan Solusi Teknis

Dalam merancang dan mengoptimalkan antarmuka portal informasi publik nasional ini, tim pengembang berfokus mengatasi kendala teknis berikut:

### 1. Visualisasi Diagram Alir Prosedur Birokrasi
* **Kendala**: Teks birokrasi pemerintah umumnya terlalu panjang dan membingungkan jika hanya ditampilkan dalam bentuk tulisan paragraf biasa.
* **Solusi**: Kami membangun komponen khusus `<MermaidDiagram />` yang secara dinamis menerima sintaks diagram dari keluaran asisten AI dan merendernya ke dalam bentuk grafik alur kerja vektor (SVG) yang responsif langsung pada browser klien.

### 2. Efisiensi Peta Interaktif Laporan Warga
* **Kendala**: Merender peta interaktif dengan banyak data titik lokasi laporan secara real-time dapat membebani kinerja memori browser, terutama pada perangkat telepon seluler berspesifikasi rendah.
* **Solusi**: Integrasi peta menggunakan Leaflet.js yang memanfaatkan rendering berbasis canvas dan penanganan koordinat dinamis. Kami menyematkan fitur geocoding otomatis di sisi klien untuk mengubah koordinat GPS secara instan menjadi nama wilayah administrasi resmi (Provinsi, Kota, Kecamatan) melalui OpenStreetMap Nominatim API.

### 3. Sinkronisasi Status Sesi dan Data
* **Kendala**: Kebutuhan pengelolaan state autentikasi, daftar obrolan aktif, kuota harian pengguna, dan notifikasi real-time yang cepat tanpa membebani ukuran bundel JS aplikasi.
* **Solusi**: Kami menggunakan Zustand sebagai pengelola state global. Zustand sangat ringan dan efisien, sehingga mempercepat proses reaktivitas data antarmuka.

### 4. Pengamanan Rute Halaman Administratif
* **Kendala**: Mencegah akses tidak sah ke dashboard admin dan petugas pelayanan publik dari pengguna biasa.
* **Solusi**: Rute diamankan melalui komponen pelindung `<ProtectedRoute />` dan `<AdminGuard />` yang menyaring klaim sesi autentikasi dan peran akun pengguna dari database Supabase sebelum memproses rendering halaman.

---

## Spesifikasi Teknologi
* **Core Runtime**: Node.js & Vite (Next-generation build tool)
* **Framework**: React 18 (TypeScript)
* **Styling**: TailwindCSS & Framer Motion (untuk animasi transisi antarmuka)
* **GIS Map**: Leaflet.js & React Leaflet
* **State Manager**: Zustand
* **Router**: React Router DOM (v6)

---

## Panduan Instalasi dan Pengembangan Lokal

### Prasyarat
Pastikan komputer Anda telah terpasang **Node.js (v18+)** dan **npm**.

### Langkah 1: Instalasi Dependensi
Jalankan perintah berikut di dalam direktori frontend:
```bash
npm install
```

### Langkah 2: Konfigurasi File Lingkungan (.env)
Buat berkas `.env` di dalam direktori `/frontend` dan sesuaikan parameternya:
```env
# URL base API Backend
VITE_API_BASE_URL=http://localhost:3000

# Kredensial Akses Supabase
VITE_SUPABASE_URL=https://proyek-anda.supabase.co
VITE_SUPABASE_ANON_KEY=kunci-anon-supabase-anda
```

### Langkah 3: Menjalankan Server Pengembangan
Aktifkan server lokal menggunakan perintah:
```bash
npm run dev
```
Aplikasi web dapat diakses di browser melalui tautan `http://localhost:5173`.

### Langkah 4: Kompilasi Rilis Produksi
Untuk melakukan build dan kompresi berkas statis siap pakai untuk server web:
```bash
npm run build
```
Hasil kompilasi akan tersimpan di dalam folder `/dist`.

---

## Lisensi

Proyek ini dirilis di bawah lisensi **MIT License**.

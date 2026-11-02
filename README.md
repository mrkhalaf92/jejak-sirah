# Jejak Sirah

Pengembaraan 3D menelusuri sirah Nabi Muhammad SAW, dalam Bahasa Melayu. Game ini percuma dan tidak memerlukan pemain log masuk. Leaderboard disimpan menggunakan Netlify Functions dan Netlify Blobs.

## Struktur

| Fail | Fungsi |
|---|---|
| `site/index.html` | Game penuh (satu fail). Dijana daripada versi claude.ai, jangan edit terus. |
| `site/_headers` | Header keselamatan (CSP dan lain-lain). |
| `netlify/functions/scores.mjs` | API leaderboard di `/api/scores`. |
| `netlify.toml` | Konfigurasi Netlify. |

## Deploy kali pertama (sekali sahaja)

1. Log masuk ke [app.netlify.com](https://app.netlify.com).
2. Klik **Add new project** (atau **Add new site**), kemudian **Import an existing project**.
3. Pilih **GitHub**, benarkan akses, dan pilih repo `jejak-sirah`.
4. Biarkan semua tetapan seperti yang diisi automatik daripada `netlify.toml`, kemudian klik **Deploy**.
5. Tunggu 1 hingga 2 minit. Netlify akan beri link seperti `nama-rawak.netlify.app`.
6. (Pilihan) Tukar nama link di **Project configuration > Change project name**, contohnya `jejak-sirah.netlify.app` jika nama itu belum diambil.

Netlify Blobs aktif secara automatik. Tiada kunci API atau database luar yang perlu disediakan.

## Kemas kini game

Setiap kali kod baru di-push ke branch `main`, Netlify akan deploy semula secara automatik.

## Keselamatan dan data

- Data yang disimpan untuk setiap pemain: nama pengembara (maksimum 18 aksara), markah, bintang, permata, gulungan dan bilangan bab. Tiada emel, tiada lokasi.
- Setiap pemain ada ID dan kunci rahsia rawak yang dijana dalam pelayar sendiri. Pelayan hanya simpan hash kunci itu, jadi seorang pemain tidak boleh mengubah markah orang lain.
- Markah disemak di pelayan: mesti sepadan dengan formula (bintang × 10 + permata × 5 + gulungan × 3) dan dalam had yang munasabah.
- Had pemain baru: 30 seminit untuk seluruh game, bagi menghalang spam.
- Pemain boleh tarik balik markah sendiri dari skrin Leaderboard.

## Padam nama yang tidak sesuai

Di Netlify: **Project > Blobs**, buka store `jejak-sirah`, kunci `board`. Data ialah JSON; padam entri pemain di bawah `players` dan simpan. Jika tidak pasti, minta bantuan sebelum mengubah.

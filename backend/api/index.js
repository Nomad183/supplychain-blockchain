const express = require('express');
const cors = require('cors');
const app = express();

// Mengizinkan Frontend dari mana saja (termasuk localhost dan domain Vercel nanti)
app.use(cors());
app.use(express.json());

// Basis data simulasi di memori (Dummy Database)
let dataRantaiPasok = [
    {
        id: "GAYO-SAMPLE-01",
        lokasi: "Gudang Supplier Kendari",
        catatan: "Bahan baku kopi telah disortir dan siap didistribusikan.",
        timestamp: new Date().toISOString()
    }
];

// 1. Endpoint Cek Server
app.get('/', (req, res) => {
    res.json({ 
        status: "Online", 
        pesan: "API Rantai Pasok Kelompok 4 UHO Berjalan Lancar!" 
    });
});

// 2. Endpoint Mengambil Seluruh Riwayat Data (GET)
app.get('/api/logs', (req, res) => {
    res.json(dataRantaiPasok);
});

// 3. Endpoint Menerima Input Baru dari Frontend (POST)
app.post('/api/logs', (req, res) => {
    const { id, lokasi, catatan } = req.body;

    if (!id || !lokasi || !catatan) {
        return res.status(400).json({ error: "Semua kolom data wajib diisi!" });
    }

    const dataBaru = {
        id,
        lokasi,
        catatan,
        timestamp: new Date().toISOString()
    };

    // Simpan ke database dummy
    dataRantaiPasok.push(dataBaru);

    res.status(201).json({
        message: "Data berhasil dicatat di server backend!",
        data: dataBaru
    });
});

// Ekspor untuk Vercel Serverless
module.exports = app;

// Jalankan server lokal jika di-run manual
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server lokal backend berjalan di port ${PORT}`));
}
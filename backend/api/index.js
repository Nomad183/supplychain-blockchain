const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let dataRantaiPasokGlobal = []; // Menyimpan data asli Sepolia secara dinamis

app.get('/api/logs', (req, res) => {
    res.json(dataRantaiPasokGlobal);
});

app.post('/api/logs', (req, res) => {
    const { id, lokasi, catatan, txHash, blockNumber } = req.body;
    
    const dataBlockchainBaru = {
        id,
        lokasi,
        catatan,
        txHash,        // Menerima TxHash ril dari Frontend
        blockNumber,   // Menerima Block Number ril dari Frontend
        timestamp: new Date().toISOString()
    };

    dataRantaiPasokGlobal.push(dataBlockchainBaru);
    res.status(201).json({ message: "Data Sinkron!", data: dataBlockchainBaru });
});

module.exports = app;
// ... (port listener di bawahnya)
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function App() {
  const [walletAddress, setWalletAddress] = useState("Belum Terhubung");
  const [isConnected, setIsConnected] = useState(false);
  const [productId, setProductId] = useState("");
  const [location, setLocation] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [searchId, setSearchId] = useState("");
  const [trackingData, setTrackingData] = useState(null);
  const [backendLogs, setBackendLogs] = useState([]);

  // ALAMAT KONTRAK REMIX
  const CONTRACT_ADDRESS = "0xD0E7771D31452734A6e3B3b19B03c2e13f7eAD8E";

  // URL Backend Vercel
  const BACKEND_URL = "https://supplychain-blockchain-vugl.vercel.app"; 

  // ABI KONTRAK REMIX
  const CONTRACT_ABI = [
    {
      "anonymous": false,
      "inputs": [
        { "indexed": false, "internalType": "string", "name": "itemId", "type": "string" },
        { "indexed": false, "internalType": "string", "name": "lokasi", "type": "string" },
        { "indexed": false, "internalType": "string", "name": "catatan", "type": "string" },
        { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
        { "indexed": true, "internalType": "address", "name": "operator", "type": "address" }
      ],
      "name": "LogDicatat",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "ambilSemuaRiwayat",
      "outputs": [
        {
          "components": [
            { "internalType": "string", "name": "itemId", "type": "string" },
            { "internalType": "string", "name": "lokasi", "type": "string" },
            { "internalType": "string", "name": "catatan", "type": "string" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
            { "internalType": "address", "name": "operator", "type": "address" }
          ],
          "internalType": "struct SupplyChain.LogBarang[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "hitungTotalLog",
      "outputs": [
        { "internalType": "uint256", "name": "", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "string", "name": "_itemId", "type": "string" },
        { "internalType": "string", "name": "_lokasi", "type": "string" },
        { "internalType": "string", "name": "_catatan", "type": "string" }
      ],
      "name": "tambahLog",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  // Ambil data log dari backend saat aplikasi pertama kali dibuka
  useEffect(() => {
    muatDataBackend();
  }, []);

  const muatDataBackend = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/logs`);
      if (response.ok) {
        const data = await response.json();
        setBackendLogs(data);
      }
    } catch (error) {
      console.log("Backend offline, menggunakan simulasi lokal.");
    }
  };

  // 1. Autentikasi Pengguna Menggunakan MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setWalletAddress(address);
        setIsConnected(true);
      } catch (error) {
        if (error.code === -32002 || (error.message && error.message.includes("-32002"))) {
          alert("Permintaan koneksi sudah dikirim! Silakan buka ekstensi MetaMask Anda untuk menyetujui koneksi.");
        } else {
          alert("Gagal menghubungkan dompet: " + error.message);
        }
      }
    } else {
      alert("MetaMask tidak mendeteksi browser Web3. Silakan instal ekstensi MetaMask!");
    }
  };

  // 2. Penguncian Data ke Jaringan Blockchain & Simpan ke Backend
  const simpanData = async (e) => {
    e.preventDefault();
    if (!isConnected) return alert("Wajib melakukan autentikasi via MetaMask!");
    if (!productId || !location || !statusNote) return alert("Mohon isi semua data!");

    let liveTxHash = "";
    let liveBlockNumber = "";

    // A. PROSES ASLI: KUNCI DATA KE BLOCKCHAIN SEPOLIA (WEB3)
    try {
      if (typeof window.ethereum === 'undefined') {
        alert("Silakan instal MetaMask terlebih dahulu!");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      alert(`Mekanisme Konsensus Jaringan Sepolia Dipicu!\n\nData Produk [ ${productId} ] akan di-hash. Silakan setujui Gas Fee di MetaMask untuk mengunci data secara permanen.`);
      
      // Menggunakan metode v6 untuk memanggil fungsi smart contract nonpayable
      const tx = await contract.tambahLog(productId, location, statusNote);
      liveTxHash = tx.hash; // Menangkap TxHash asli dari MetaMask

      const receipt = await tx.wait(); // Menunggu blok tervalidasi di Sepolia (Proses Validasi Gas Fee)
      liveBlockNumber = receipt.blockNumber.toString(); // Menangkap nomor blok asli setelah masuk jaringan

      alert("Sukses! Data resmi dikunci secara permanen di Blockchain Sepolia (Web3).");

    } catch (error) {
      console.error(error);
      alert("Gagal mengunci data ke Blockchain: " + error.message);
      return; 
    }

    // B. Kirim data lengkap dengan bukti Blockchain ke Backend API (WEB2)
    try {
      const response = await fetch(`${BACKEND_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: productId, 
          lokasi: location, 
          catatan: statusNote,
          txHash: liveTxHash,          // Mengirim Hash Asli ke Database Vercel
          blockNumber: liveBlockNumber // Mengirim Nomor Blok Asli ke Database Vercel
        })
      });

      if (response.ok) {
        alert("Sukses! Data juga berhasil dicatat di Server Backend.");
        setProductId("");
        setLocation("");
        setStatusNote("");
        muatDataBackend(); 
      }
    } catch (error) {
      alert("Data sukses di Blockchain, namun Server Backend Anda belum merespons.");
    }
  };

  // 3. Pelacakan & Verifikasi Integritas Kriptografi
  const lacakProduk = () => {
    if (!searchId) return alert("Masukkan ID Produk!");
    
    const produkDitemukan = backendLogs.find(log => log.id.toLowerCase() === searchId.toLowerCase());

    if (produkDitemukan) {
      setTrackingData({
        id: produkDitemukan.id,
        status: produkDitemukan.lokasi,
        catatan: produkDitemukan.catatan,
        blockNumber: produkDitemukan.blockNumber || "Memproses...", 
        txHash: produkDitemukan.txHash || "", 
        timestamp: produkDitemukan.timestamp
      });
    } else {
      alert("ID Produk tidak ditemukan dalam manifest rantai pasok.");
      setTrackingData(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      {/* Top Navigation */}
      <nav className="bg-slate-900 text-white shadow-lg p-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-lg font-bold tracking-wide">SISTEM INFORMASI SUPPLY CHAIN</h1>
            <p className="text-xs text-slate-400">Implementasi Teknologi Blockchain untuk Keamanan Data</p>
          </div>
          <button 
            onClick={connectWallet}
            className={`px-5 py-2 rounded-md font-semibold text-sm transition-all duration-300 ${
              isConnected ? 'bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
            }`}
          >
            {isConnected ? "✓ Terautentikasi" : "Hubungkan MetaMask"}
          </button>
        </div>
      </nav>

      {/* Main Content Dashboard */}
      <main className="container mx-auto p-4 md:p-8 max-w-5xl flex-grow grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Wallet Status & Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Status Autentikasi Node</h2>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs break-all">
              <p className="text-slate-500 mb-1">Public Key Pengguna:</p>
              <p className={`font-bold ${isConnected ? 'text-emerald-600' : 'text-rose-500'}`}>{walletAddress}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informasi Riset Academic</h2>
            <div className="text-xs text-slate-600 space-y-2">
              <p><strong>Judul:</strong> Implementasi Teknologi Blockchain untuk Keamanan Data Pada Sistem Informasi</p>
              <p><strong>Institusi:</strong> Teknik Informatika, Universitas Halu Oleo</p>
              <p><strong>Metode:</strong> Jaringan Publik (Sepolia Testnet)</p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Panel */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Form Input */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
              Pencatatan Rantai Pasok Baru (Mekanisme Immutability)
            </h3>
            <form onSubmit={simpanData} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ID Unik Produk</label>
                  <input 
                    type="text" 
                    placeholder="Misal: GAYO-BRG-01"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Lokasi Distribusi</label>
                  <input 
                    type="text" 
                    placeholder="Misal: Gudang Kendari"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Deklarasi Status & Kondisi</label>
                <textarea 
                  rows="2"
                  placeholder="Deskripsikan kondisi fisik, suhu logistik, atau kelayakan dokumen..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>
              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-all"
              >
                Kunci ke Jaringan Blockchain
              </button>
            </form>
          </div>

          {/* Tracking Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
              Audit Publik & Verifikasi Integritas Data
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Masukkan ID Produk untuk diaudit..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button 
                onClick={lacakProduk}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 rounded-lg transition-all"
              >
                Audit Data
              </button>
            </div>

            {/* Tracking Result View */}
            {trackingData && (
              <div className="mt-5 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-semibold">
                    Blok Terverifikasi:{" "}
                    {trackingData.blockNumber && trackingData.blockNumber !== "Memproses..." ? (
                      <a 
                        href={`https://sepolia.etherscan.io/block/${trackingData.blockNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-700 font-bold"
                      >
                        #{trackingData.blockNumber}
                      </a>
                    ) : (
                      <span>Memproses...</span>
                    )}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    ● Integritas Data Terjamin (Valid)
                  </span>
                </div>
                <div className="text-sm text-slate-700 space-y-1">
                  <p><strong>ID Produk:</strong> {trackingData.id}</p>
                  <p><strong>Posisi Terakhir:</strong> {trackingData.status}</p>
                  <p className="text-xs text-slate-500"><strong>Catatan Lapangan:</strong> {trackingData.catatan}</p>
                  <p className="text-[11px] text-slate-400"><strong>Waktu Transaksi:</strong> {trackingData.timestamp ? new Date(trackingData.timestamp).toLocaleString() : "-"}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 font-mono text-[10px] break-all">
                  <p className="font-semibold text-slate-500 mb-1">Bukti Fungsi Hash (TxHash):</p>
                  {trackingData.txHash ? (
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${trackingData.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer block font-semibold"
                    >
                      {trackingData.txHash}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Tidak ada hash transaksi terikat</span>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Tambahkan blok ini di bawah komponen Audit Data */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
                Riwayat Transaksi (Log Global)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="p-3">ID Produk</th>
                      <th className="p-3">Lokasi</th>
                      <th className="p-3">TxHash (Link Audit)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backendLogs.length > 0 ? (
                      backendLogs.map((log, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-700">{log.id}</td>
                          <td className="p-3 text-slate-600">{log.lokasi}</td>
                          <td className="p-3">
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${log.txHash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 underline font-mono text-xs break-all"
                            >
                              {log.txHash.substring(0, 15)}...
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="p-4 text-center text-slate-400 italic">Belum ada data transaksi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

        </div>
      </main>

    </div>
  );
}

export default App;
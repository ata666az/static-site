// config.js
export default {
  // Daftar backend/proxy worker target (untuk generate path config)
  // Ini bisa worker Anda sendiri atau proxy IP dari bank
  BACKEND_HOSTS: [
    'cf.bebas11.workers.dev',
    'cf.bebas9.workers.dev',
    // ... tambah sesuai kebutuhan
  ],

  // Sumber proxy bank
  PROXY_BANK_URL: 'https://raw.githubusercontent.com/papapapapdelesia/Emilia/refs/heads/main/Data/Country-ALIVE.txt',

  // Protokol & port
  PORTS: [443, 80],
  PROTOCOLS: ['trojan', 'vless', 'ss'],

  // UUID — static, shared untuk semua user
  // Ganti dengan UUID kamu sendiri (bisa generate di https://www.uuidgenerator.net/)
  SHARED_UUID: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',

  // Batas proxy per build (untuk kurangi ukuran file)
  MAX_PROXIES: 200,

  // Nama output
  OUTPUT_JSON: 'public/data/proxies.json',
  OUTPUT_SUB: 'public/data/sub.txt',
};

// Gera icons/icon-192.png e icons/icon-512.png sem dependências externas,
// usando apenas o módulo zlib nativo do Node para codificar PNG.
// Uso: node tools/generate-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const COR_FUNDO = [234, 88, 12, 255];   // #ea580c
const COR_CLIP = [194, 65, 12, 255];    // #c2410c
const COR_BRANCO = [255, 255, 255, 255];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
  const tipoBuf = Buffer.from(tipo, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dados.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tipoBuf, dados])), 0);
  return Buffer.concat([lenBuf, tipoBuf, dados, crcBuf]);
}

function criarPng(pixels, n) {
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(n, 0);
  ihdrData.writeUInt32BE(n, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  const raw = Buffer.alloc(n * (1 + n * 4));
  for (let y = 0; y < n; y++) {
    const rowStart = y * (1 + n * 4);
    raw[rowStart] = 0; // sem filtro
    for (let x = 0; x < n; x++) {
      const [r, g, b, a] = pixels[y * n + x];
      const off = rowStart + 1 + x * 4;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }
  const idatData = zlib.deflateSync(raw, { level: 9 });
  const idat = chunk('IDAT', idatData);

  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([assinatura, ihdr, idat, iend]);
}

function desenharIcone(n) {
  const pixels = new Array(n * n).fill(COR_FUNDO);

  function setPx(x, y, cor) {
    if (x < 0 || x >= n || y < 0 || y >= n) return;
    pixels[y * n + x] = cor;
  }

  function fillRect(x0f, y0f, x1f, y1f, cor) {
    const x0 = Math.round(x0f * n), y0 = Math.round(y0f * n);
    const x1 = Math.round(x1f * n), y1 = Math.round(y1f * n);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) setPx(x, y, cor);
    }
  }

  // Corpo do bloco de anotações (dentro da safe zone maskable ~40% raio)
  fillRect(0.28, 0.22, 0.72, 0.80, COR_BRANCO);
  // Prendedor no topo do bloco
  fillRect(0.42, 0.16, 0.58, 0.26, COR_CLIP);
  // Linhas de texto dentro do bloco
  fillRect(0.35, 0.36, 0.65, 0.405, COR_FUNDO);
  fillRect(0.35, 0.48, 0.65, 0.525, COR_FUNDO);
  fillRect(0.35, 0.60, 0.58, 0.645, COR_FUNDO);

  return pixels;
}

function gerar(n, arquivo) {
  const pixels = desenharIcone(n);
  const png = criarPng(pixels, n);
  fs.writeFileSync(arquivo, png);
  console.log('Gerado', arquivo, `(${png.length} bytes)`);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
gerar(192, path.join(outDir, 'icon-192.png'));
gerar(512, path.join(outDir, 'icon-512.png'));

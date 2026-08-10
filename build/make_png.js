import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function evalCubic(p0, p1, p2, p3, steps = 40) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
    const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
    points.push([x, y]);
  }
  return points;
}

function parsePath(str) {
  const tokens = str.match(/([a-zA-Z])|([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g) || [];
  const items = [];
  for (const tok of tokens) {
    if (/^[a-zA-Z]$/.test(tok)) items.push(tok);
    else items.push(parseFloat(tok));
  }
  const points = [];
  let curr = [0, 0];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item === 'M') {
      curr = [items[i + 1], items[i + 2]];
      points.push(curr);
      i += 3;
    } else if (item === 'l') {
      curr = [curr[0] + items[i + 1], curr[1] + items[i + 2]];
      points.push(curr);
      i += 3;
    } else if (item === 'c') {
      const p1 = [curr[0] + items[i + 1], curr[1] + items[i + 2]];
      const p2 = [curr[0] + items[i + 3], curr[1] + items[i + 4]];
      const p3 = [curr[0] + items[i + 5], curr[1] + items[i + 6]];
      const curve = evalCubic(curr, p1, p2, p3);
      points.push(...curve.slice(1));
      curr = p3;
      i += 7;
    } else if (item === 'z') {
      i += 1;
    } else {
      i += 1;
    }
  }
  return points;
}

const path1Str = "M 217.3,85.5 l 0,85.6 l 7.1,0 c 26.8,0.3 55.7,7.7 79.2,20.7 c 19.5,10.8 42.8,31.7 54.7,49.3 c 6.1,9.1 13.9,24 17.7,34.3 c 1.5,3.7 3.9,11.7 5.5,17.6 c 4.3,16.0 3.7,32.8 4.2,49.3 l 0,36.7 l 165.6,0 l 0,-7.7 c 1.9,-16.7 2.4,-57.6 0.9,-76.3 c -3.1,-38.1 -13.9,-78.9 -29.6,-111.9 c -10.1,-21.2 -18.8,-35.7 -32.9,-54.8 c -12.1,-16.3 -34.8,-40.4 -49.9,-52.9 c -46.1,-38.5 -102.3,-63.2 -162.4,-71.7 c -8.4,-1.2 -25.3,-2.5 -37.6,-2.9 l -22.4,0 l 0,84.8 z";
const path2Str = "M 255.3,380.0 c -13.7,1.2 -34.9,5.2 -51.6,9.9 c -32.8,9.2 -64,24.5 -91.3,44.9 c -14.5,10.9 -36.7,32.1 -48,46.3 c -23.2,28.8 -42.9,66.4 -53.1,101.3 c -4.5,15.7 -8.4,35.9 -10,52.1 c -0.7,7.3 -1.3,39.7 -1.3,72.1 l 0,59.1 l 83.3,0 l 83.3,0 l 0,-7.7 c 0.1,-4.1 0.4,-30.1 0.7,-57.6 l 0.4,-50 l 2,-9.5 c 7.6,-36 33.9,-67.2 69.6,-82.8 c 11.3,-4.9 26.3,-8.3 38.3,-8.5 l 9.1,-0.3 l 0.3,-85.2 l 0.4,-85.1 l -13.3,0.3 c -7.3,0.1 -15.7,0.4 -18.7,0.7 z";

const poly1 = parsePath(path1Str);
const poly2 = parsePath(path2Str);

const WIDTH = 512;
const HEIGHT = 512;
const OFFSET_X = (-553 / 2 + WIDTH / 2) + 110;
const OFFSET_Y = (-766 / 2 + HEIGHT / 2) + 60;
const SCALE = 0.55;

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0] * SCALE + OFFSET_X;
    const yi = poly[i][1] * SCALE + OFFSET_Y;
    const xj = poly[j][0] * SCALE + OFFSET_X;
    const yj = poly[j][1] * SCALE + OFFSET_Y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const rawData = Buffer.alloc(HEIGHT * (1 + WIDTH * 4));
let offset = 0;

for (let y = 0; y < HEIGHT; y++) {
  rawData[offset++] = 0; // filter 0
  for (let x = 0; x < WIDTH; x++) {
    let hits = 0;
    const sub = [0.25, 0.75];
    for (const sx of sub) {
      for (const sy of sub) {
        if (inPoly(x + sx, y + sy, poly1) || inPoly(x + sx, y + sy, poly2)) {
          hits++;
        }
      }
    }
    const alpha = Math.round((hits / 4) * 255);
    rawData[offset++] = 28;  // R (#1c1917)
    rawData[offset++] = 25;  // G
    rawData[offset++] = 23;  // B
    rawData[offset++] = alpha;
  }
}

const compressed = zlib.deflateSync(rawData);

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const buf = Buffer.concat([typeBuf, data]);
  const crc = crc32(buf);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, buf, crcBuf]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(WIDTH, 0);
ihdrData.writeUInt32BE(HEIGHT, 4);
ihdrData[8] = 8;
ihdrData[9] = 6;
ihdrData[10] = 0;
ihdrData[11] = 0;
ihdrData[12] = 0;

const ihdr = makeChunk('IHDR', ihdrData);
const idat = makeChunk('IDAT', compressed);
const iend = makeChunk('IEND', Buffer.alloc(0));

const pngBuffer = Buffer.concat([sig, ihdr, idat, iend]);
console.log('BASE64_START:' + pngBuffer.toString('base64') + ':BASE64_END');

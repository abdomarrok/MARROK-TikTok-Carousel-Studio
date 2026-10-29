/**
 * Zero-dependency binary container duration header patcher for MP4 (ISO BMFF / fMP4)
 * and WebM (Matroska EBML) video files produced by browser MediaRecorder streams.
 *
 * Why this is needed:
 * Browser MediaRecorder writes live streaming containers starting at t = 0 without knowing
 * the final clip duration when emitting the initial header:
 * - In fragmented MP4, `mvhd`, `tkhd`, `mdhd`, and `mehd` duration fields are left at 0
 *   or only reflect the first fragment (~3–4s), causing video editors (CapCut, TikTok, Premiere)
 *   to truncate a 24s video to ~3–4s on import.
 * - In WebM, the EBML `Segment -> Info -> Duration` (0x4489) float element is omitted,
 *   causing players/editors to display `00:24 / 00:03` or unknown duration.
 */

function readAscii4(bytes: Uint8Array, offset: number): string {
  if (offset + 4 > bytes.length) return '';
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3]
  );
}

interface Mp4BoxHeader {
  start: number;
  headerSize: number;
  size: number;
  end: number;
  type: string;
}

function readMp4BoxHeader(bytes: Uint8Array, offset: number, limit: number): Mp4BoxHeader | null {
  if (offset + 8 > limit || offset + 8 > bytes.length) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rawSize = view.getUint32(offset, false);
  const type = readAscii4(bytes, offset + 4);

  let headerSize = 8;
  let size = rawSize;

  if (rawSize === 1) {
    if (offset + 16 > limit || offset + 16 > bytes.length) return null;
    const hi = view.getUint32(offset + 8, false);
    const lo = view.getUint32(offset + 12, false);
    size = hi * 4294967296 + lo;
    headerSize = 16;
  } else if (rawSize === 0) {
    size = limit - offset;
  }

  if (size < headerSize) return null;
  const end = Math.min(limit, bytes.length, offset + size);
  return { start: offset, headerSize, size, end, type };
}

/**
 * Patches `mvhd`, `tkhd`, `mdhd`, `elst`, and `mehd` duration fields inside an MP4 / fMP4 byte buffer
 * so that video editors (CapCut, TikTok, QuickTime, iOS/Android) read the exact full timeline duration.
 */
export function fixMp4DurationBytes(input: Uint8Array, durationSec: number): Uint8Array {
  if (!Number.isFinite(durationSec) || durationSec <= 0 || input.length < 16) {
    return input;
  }

  const bytes = new Uint8Array(input.length);
  bytes.set(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let movieTimescale = 1000;

  const patchMvhd = (box: Mp4BoxHeader) => {
    const payload = box.start + box.headerSize;
    if (payload + 20 > box.end) return;
    const version = bytes[payload];
    if (version === 0) {
      if (payload + 20 > box.end) return;
      const timescale = view.getUint32(payload + 12, false);
      if (timescale > 0) {
        movieTimescale = timescale;
        const scaled = Math.max(1, Math.round(durationSec * timescale));
        view.setUint32(payload + 16, scaled, false);
      }
    } else if (version === 1) {
      if (payload + 32 > box.end) return;
      const timescale = view.getUint32(payload + 20, false);
      if (timescale > 0) {
        movieTimescale = timescale;
        const scaled = BigInt(Math.max(1, Math.round(durationSec * timescale)));
        view.setBigUint64(payload + 24, scaled, false);
      }
    }
  };

  const patchTkhd = (box: Mp4BoxHeader) => {
    const payload = box.start + box.headerSize;
    if (payload + 24 > box.end) return;
    const version = bytes[payload];
    const scaled = Math.max(1, Math.round(durationSec * movieTimescale));
    if (version === 0) {
      if (payload + 24 > box.end) return;
      view.setUint32(payload + 20, scaled, false);
    } else if (version === 1) {
      if (payload + 36 > box.end) return;
      view.setBigUint64(payload + 28, BigInt(scaled), false);
    }
  };

  const patchMdhd = (box: Mp4BoxHeader) => {
    const payload = box.start + box.headerSize;
    if (payload + 20 > box.end) return;
    const version = bytes[payload];
    if (version === 0) {
      if (payload + 20 > box.end) return;
      const timescale = view.getUint32(payload + 12, false);
      if (timescale > 0) {
        const scaled = Math.max(1, Math.round(durationSec * timescale));
        view.setUint32(payload + 16, scaled, false);
      }
    } else if (version === 1) {
      if (payload + 32 > box.end) return;
      const timescale = view.getUint32(payload + 20, false);
      if (timescale > 0) {
        const scaled = BigInt(Math.max(1, Math.round(durationSec * timescale)));
        view.setBigUint64(payload + 24, scaled, false);
      }
    }
  };

  const patchMehd = (box: Mp4BoxHeader) => {
    const payload = box.start + box.headerSize;
    if (payload + 8 > box.end) return;
    const version = bytes[payload];
    const scaled = Math.max(1, Math.round(durationSec * movieTimescale));
    if (version === 0) {
      if (payload + 8 > box.end) return;
      view.setUint32(payload + 4, scaled, false);
    } else if (version === 1) {
      if (payload + 12 > box.end) return;
      view.setBigUint64(payload + 4, BigInt(scaled), false);
    }
  };

  const patchElst = (box: Mp4BoxHeader) => {
    const payload = box.start + box.headerSize;
    if (payload + 8 > box.end) return;
    const version = bytes[payload];
    const entryCount = view.getUint32(payload + 4, false);
    if (entryCount !== 1) return;
    const scaled = Math.max(1, Math.round(durationSec * movieTimescale));
    if (version === 0 && payload + 20 <= box.end) {
      view.setUint32(payload + 8, scaled, false);
    } else if (version === 1 && payload + 28 <= box.end) {
      view.setBigUint64(payload + 8, BigInt(scaled), false);
    }
  };

  const walkBoxes = (startOffset: number, endLimit: number) => {
    let cursor = startOffset;
    while (cursor + 8 <= endLimit) {
      const box = readMp4BoxHeader(bytes, cursor, endLimit);
      if (!box || box.end <= cursor) break;

      if (box.type === 'mvhd') {
        patchMvhd(box);
      } else if (box.type === 'tkhd') {
        patchTkhd(box);
      } else if (box.type === 'mdhd') {
        patchMdhd(box);
      } else if (box.type === 'mehd') {
        patchMehd(box);
      } else if (box.type === 'elst') {
        patchElst(box);
      } else if (
        box.type === 'moov' ||
        box.type === 'trak' ||
        box.type === 'mdia' ||
        box.type === 'edts' ||
        box.type === 'mvex'
      ) {
        walkBoxes(box.start + box.headerSize, box.end);
      }

      cursor = box.end;
    }
  };

  walkBoxes(0, bytes.length);
  return bytes;
}

interface EbmlVint {
  value: number;
  length: number;
  isUnknown: boolean;
}

function readEbmlId(bytes: Uint8Array, offset: number): { id: number; length: number } | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  if (first === 0) return null;
  let length = 1;
  let mask = 0x80;
  while (length <= 4 && (first & mask) === 0) {
    length++;
    mask >>= 1;
  }
  if (length > 4 || offset + length > bytes.length) return null;
  let id = 0;
  for (let i = 0; i < length; i++) {
    id = id * 256 + bytes[offset + i];
  }
  return { id, length };
}

function readEbmlSize(bytes: Uint8Array, offset: number): EbmlVint | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  if (first === 0) return null;
  let length = 1;
  let mask = 0x80;
  while (length <= 8 && (first & mask) === 0) {
    length++;
    mask >>= 1;
  }
  if (length > 8 || offset + length > bytes.length) return null;

  let value = first & (mask - 1);
  let allOnes = value === mask - 1;
  for (let i = 1; i < length; i++) {
    const b = bytes[offset + i];
    if (b !== 0xff) allOnes = false;
    value = value * 256 + b;
  }

  return { value, length, isUnknown: allOnes };
}

function encodeEbmlSizeWithLength(size: number, byteLength: number): Uint8Array {
  const out = new Uint8Array(byteLength);
  let rem = size;
  for (let i = byteLength - 1; i >= 0; i--) {
    out[i] = rem & 0xff;
    rem = Math.floor(rem / 256);
  }
  const markerBit = 0x80 >> (byteLength - 1);
  out[0] = (out[0] & (markerBit - 1)) | markerBit;
  return out;
}

function readEbmlUint(bytes: Uint8Array, offset: number, length: number): number {
  let val = 0;
  for (let i = 0; i < length; i++) {
    val = val * 256 + bytes[offset + i];
  }
  return val;
}

/**
 * Patches or injects the EBML `Segment -> Info -> Duration` (0x4489) Float64 element
 * inside a WebM byte buffer so players and editors read the exact duration in milliseconds.
 */
export function fixWebmDurationBytes(input: Uint8Array, durationSec: number): Uint8Array {
  if (!Number.isFinite(durationSec) || durationSec <= 0 || input.length < 16) {
    return input;
  }
  // Verify EBML magic bytes: 1A 45 DF A3
  if (
    input[0] !== 0x1a ||
    input[1] !== 0x45 ||
    input[2] !== 0xdf ||
    input[3] !== 0xa3
  ) {
    return input;
  }

  let cursor = 0;
  // 1. Skip EBML Header element (0x1A45DFA3)
  const ebmlId = readEbmlId(input, cursor);
  if (!ebmlId || ebmlId.id !== 0x1a45dfa3) return input;
  cursor += ebmlId.length;
  const ebmlSize = readEbmlSize(input, cursor);
  if (!ebmlSize) return input;
  cursor += ebmlSize.length + ebmlSize.value;

  // 2. Locate Segment element (0x18538067)
  while (cursor < input.length) {
    const elId = readEbmlId(input, cursor);
    if (!elId) return input;
    const elSize = readEbmlSize(input, cursor + elId.length);
    if (!elSize) return input;

    if (elId.id === 0x18538067) {
      // Found Segment
      const segSizeOffset = cursor + elId.length;
      const segPayloadStart = segSizeOffset + elSize.length;
      const segPayloadEnd = elSize.isUnknown
        ? input.length
        : Math.min(input.length, segPayloadStart + elSize.value);

      // Scan inside Segment for Info (0x1549A966)
      let segCursor = segPayloadStart;
      while (segCursor < segPayloadEnd && segCursor < segPayloadStart + 65536) {
        const childId = readEbmlId(input, segCursor);
        if (!childId) break;
        const childSize = readEbmlSize(input, segCursor + childId.length);
        if (!childSize) break;

        const childSizeOffset = segCursor + childId.length;
        const childPayloadStart = childSizeOffset + childSize.length;
        const childPayloadEnd = childSize.isUnknown
          ? segPayloadEnd
          : Math.min(segPayloadEnd, childPayloadStart + childSize.value);

        if (childId.id === 0x1549a966) {
          // Found Segment -> Info
          let timecodeScale = 1_000_000; // default 1ms in nanoseconds
          let durationValueOffset = -1;
          let durationByteLength = 0;

          let infoCursor = childPayloadStart;
          while (infoCursor < childPayloadEnd) {
            const infoElId = readEbmlId(input, infoCursor);
            if (!infoElId) break;
            const infoElSize = readEbmlSize(input, infoCursor + infoElId.length);
            if (!infoElSize) break;
            const valStart = infoCursor + infoElId.length + infoElSize.length;
            const valEnd = valStart + infoElSize.value;
            if (valEnd > childPayloadEnd) break;

            if (infoElId.id === 0x2ad7b1 && infoElSize.value >= 1 && infoElSize.value <= 8) {
              const parsedScale = readEbmlUint(input, valStart, infoElSize.value);
              if (parsedScale > 0) timecodeScale = parsedScale;
            } else if (
              infoElId.id === 0x4489 &&
              (infoElSize.value === 4 || infoElSize.value === 8)
            ) {
              durationValueOffset = valStart;
              durationByteLength = infoElSize.value;
            }

            infoCursor = valEnd;
          }

          const durationUnits = (durationSec * 1_000_000_000) / timecodeScale;

          // Case A: Duration element already exists in Info -> overwrite in-place
          if (durationValueOffset >= 0) {
            const patched = new Uint8Array(input.length);
            patched.set(input);
            const dv = new DataView(patched.buffer, patched.byteOffset, patched.byteLength);
            if (durationByteLength === 4) {
              dv.setFloat32(durationValueOffset, durationUnits, false);
            } else {
              dv.setFloat64(durationValueOffset, durationUnits, false);
            }
            return patched;
          }

          // Case B: Duration element is missing -> inject 11-byte Float64 Duration element (0x4489, size 0x88, 8-byte float64)
          const durationElem = new Uint8Array(11);
          durationElem[0] = 0x44;
          durationElem[1] = 0x89;
          durationElem[2] = 0x88; // VINT size = 8 bytes
          const elemDv = new DataView(durationElem.buffer);
          elemDv.setFloat64(3, durationUnits, false);

          const newInfoPayloadSize = childSize.value + durationElem.length;
          // Use at least 4 bytes for the Info VINT size if the old VINT length is too narrow
          const maxCapForOldLen = Math.pow(2, 7 * childSize.length) - 2;
          const newInfoSizeLen =
            newInfoPayloadSize <= maxCapForOldLen ? childSize.length : Math.max(4, childSize.length);
          const encodedInfoSize = encodeEbmlSizeWithLength(newInfoPayloadSize, newInfoSizeLen);

          const sizeLenDiff = newInfoSizeLen - childSize.length;
          const totalExtra = sizeLenDiff + durationElem.length;

          const out = new Uint8Array(input.length + totalExtra);
          // Copy up to Info size VINT
          out.set(input.subarray(0, childSizeOffset), 0);
          // Write updated Info size VINT
          out.set(encodedInfoSize, childSizeOffset);
          // Copy existing Info payload
          out.set(
            input.subarray(childPayloadStart, childPayloadEnd),
            childSizeOffset + newInfoSizeLen
          );
          // Append injected Duration element at end of Info payload
          out.set(
            durationElem,
            childSizeOffset + newInfoSizeLen + (childPayloadEnd - childPayloadStart)
          );
          // Copy remainder of file after Info
          out.set(input.subarray(childPayloadEnd), childPayloadEnd + totalExtra);

          // If Segment had a fixed known size, update it by +totalExtra if it fits in its VINT width
          if (!elSize.isUnknown) {
            const newSegSize = elSize.value + totalExtra;
            const maxSegCap = Math.pow(2, 7 * elSize.length) - 2;
            if (newSegSize <= maxSegCap) {
              const encodedSegSize = encodeEbmlSizeWithLength(newSegSize, elSize.length);
              out.set(encodedSegSize, segSizeOffset);
            }
          }

          return out;
        }

        // Stop scanning if we hit Cluster (0x1F43B675) before Info
        if (childId.id === 0x1f43b675) break;
        segCursor = childPayloadEnd;
      }
      break;
    }

    if (elSize.isUnknown) break;
    cursor += elId.length + elSize.length + elSize.value;
  }

  return input;
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    const ab = await blob.arrayBuffer();
    return new Uint8Array(ab);
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new Uint8Array(reader.result as ArrayBuffer));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Inspects a recorded video Blob (MP4 or WebM) and patches its binary duration headers
 * to match `durationSec` accurately.
 */
export async function fixVideoBlobDuration(blob: Blob, durationSec: number): Promise<Blob> {
  if (!blob || blob.size < 16 || !Number.isFinite(durationSec) || durationSec <= 0) {
    return blob;
  }

  try {
    const rawBytes = await readBlobBytes(blob);
    const isWebm =
      rawBytes[0] === 0x1a &&
      rawBytes[1] === 0x45 &&
      rawBytes[2] === 0xdf &&
      rawBytes[3] === 0xa3;

    const isMp4 =
      readAscii4(rawBytes, 4) === 'ftyp' ||
      readAscii4(rawBytes, 4) === 'moov' ||
      readAscii4(rawBytes, 4) === 'mdat' ||
      blob.type.includes('mp4');

    let patched = rawBytes;
    if (isWebm) {
      patched = fixWebmDurationBytes(rawBytes, durationSec);
    } else if (isMp4) {
      patched = fixMp4DurationBytes(rawBytes, durationSec);
    }

    const bufferCopy = new ArrayBuffer(patched.byteLength);
    new Uint8Array(bufferCopy).set(patched);
    return new Blob([bufferCopy], { type: blob.type || (isWebm ? 'video/webm' : 'video/mp4') });
  } catch {
    return blob;
  }
}

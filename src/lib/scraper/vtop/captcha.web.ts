import captchaWeights from './captcha-weights.json';
import type { CaptchaResult } from './captcha';

const LABEL_TEXT = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Matrix = number[][];
type Vector = number[];

function getImageBlocks(pixelData: Uint8ClampedArray, width: number, height: number): Matrix[] {
  const saturate: Vector = new Array((pixelData.length / 4));
  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i]!;
    const g = pixelData[i + 1]!;
    const b = pixelData[i + 2]!;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    saturate[i / 4] = max === 0 ? 0 : Math.round(((max - min) * 255) / max);
  }
  const img: Matrix = Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col) => saturate[row * width + col] ?? 0),
  );
  const blocks: Matrix[] = new Array(6);
  for (let i = 0; i < 6; i++) {
    const x1 = (i + 1) * 25 + 2;
    const y1 = 7 + 5 * (i % 2) + 1;
    const x2 = (i + 2) * 25 + 1;
    const y2 = 35 - 5 * ((i + 1) % 2);
    blocks[i] = img.slice(y1, y2).map((row) => row.slice(x1, x2));
  }
  return blocks;
}

function binarize(charImg: Matrix): Matrix {
  let avg = 0;
  charImg.forEach((row) => row.forEach((p) => (avg += p)));
  avg /= charImg.length * (charImg[0]?.length ?? 1);
  return charImg.map((row) => row.map((p) => (p > avg ? 1 : 0)));
}

function flatten(m: Matrix): Vector { return m.flat(); }

function matMul(a: Matrix, b: Matrix): Matrix {
  const x = a.length, z = a[0]?.length ?? 0, y = b[0]?.length ?? 0;
  const out: Matrix = Array.from({ length: x }, () => new Array(y).fill(0));
  for (let i = 0; i < x; i++)
    for (let j = 0; j < y; j++)
      for (let k = 0; k < z; k++)
        out[i]![j] += (a[i]![k] ?? 0) * (b[k]![j] ?? 0);
  return out;
}
function matAdd(a: Vector, b: Vector): Vector { return a.map((v, i) => v + (b[i] ?? 0)); }
function softmax(v: Vector): Vector {
  const e = v.map(Math.exp);
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

export async function solveCaptcha(base64Image: string): Promise<CaptchaResult> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = base64Image;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const blocks = getImageBlocks(data, canvas.width, canvas.height);
  const weights = captchaWeights.weights as Matrix;
  const biases = captchaWeights.biases as Vector;

  let result = '';
  let totalConf = 0;
  for (const block of blocks) {
    const input: Matrix = [flatten(binarize(block))];
    const logits = matAdd(matMul(input, weights)[0] ?? [], biases);
    const probs = softmax(logits);
    const maxIdx = probs.indexOf(Math.max(...probs));
    result += LABEL_TEXT[maxIdx] ?? '?';
    totalConf += probs[maxIdx] ?? 0;
  }

  return { solved: result, confidence: totalConf / 6 };
}

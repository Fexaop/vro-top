import jpegJs from 'jpeg-js';
import captchaWeights from './captcha-weights.json';

export interface CaptchaResult {
  solved: string;
  confidence: number;
}

const LABEL_TEXT = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Matrix = number[][];
type Vector = number[];

function getImageBlocks(pixelData: Uint8Array, width: number, height: number): Matrix[] {
  const totalPixels = width * height;
  const saturate: Vector = new Array(totalPixels);

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

function binarizeImage(charImg: Matrix): Matrix {
  let avg = 0;
  charImg.forEach((row) => row.forEach((p) => (avg += p)));
  avg /= charImg.length * (charImg[0]?.length ?? 1);
  return charImg.map((row) => row.map((p) => (p > avg ? 1 : 0)));
}

function flatten(matrix: Matrix): Vector {
  return matrix.flat();
}

function matMul(a: Matrix, b: Matrix): Matrix {
  const x = a.length;
  const z = a[0]?.length ?? 0;
  const y = b[0]?.length ?? 0;
  const product: Matrix = Array.from({ length: x }, () => new Array(y).fill(0));
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        product[i]![j] += (a[i]![k] ?? 0) * (b[k]![j] ?? 0);
      }
    }
  }
  return product;
}

function matAdd(a: Vector, b: Vector): Vector {
  return a.map((val, i) => val + (b[i] ?? 0));
}

function softmax(vec: Vector): Vector {
  const exps = vec.map((x) => Math.exp(x));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sumExps);
}

function base64ToUint8Array(base64WithPrefix: string): Uint8Array {
  const base64 = base64WithPrefix.replace(/^data:image\/\w+;base64,/, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function solveCaptcha(base64Image: string): Promise<CaptchaResult> {
  const bytes = base64ToUint8Array(base64Image);
  const { data, width, height } = jpegJs.decode(bytes, { useTArray: true });

  const charBlocks = getImageBlocks(data, width, height);
  const weights = captchaWeights.weights as Matrix;
  const biases = captchaWeights.biases as Vector;

  let result = '';
  let totalConfidence = 0;

  for (const block of charBlocks) {
    const binarized = binarizeImage(block);
    const inputMatrix: Matrix = [flatten(binarized)];
    const output = matMul(inputMatrix, weights);
    const logits = matAdd(output[0] ?? [], biases);
    const probs = softmax(logits);
    const maxIdx = probs.indexOf(Math.max(...probs));
    result += LABEL_TEXT[maxIdx] ?? '?';
    totalConfidence += probs[maxIdx] ?? 0;
  }

  return { solved: result, confidence: totalConfidence / 6 };
}

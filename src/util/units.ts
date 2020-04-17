export function toKibibytes(bytes: number) {
  return bytes << 10;
}

export function toMebibytes(bytes: number) {
  return bytes << 20;
}

export function toGibibytes(bytes: number) {
  return bytes << 30;
}
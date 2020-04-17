/** Convert bytes to KiB */
export function toKibibytes(bytes: number) {
  return bytes << 10;
}

/** 1 KiB in bytes */
export const KiB = toKibibytes(1);

/** Convert bytes to MiB */
export function toMebibytes(bytes: number) {
  return bytes << 20;
}

/** 1 MiB in bytes */
export const MiB = toMebibytes(1);

/** Convert bytes to GiB */
export function toGibibytes(bytes: number) {
  return bytes << 30;
}

/** 1 GiB in bytes */
export const GiB = toGibibytes(1);
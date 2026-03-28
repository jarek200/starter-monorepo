declare module 'libsodium-wrappers' {
  interface Sodium {
    ready: Promise<void>;
    base64_variants: { ORIGINAL: number };
    from_base64(s: string, variant: number): Uint8Array;
    from_string(s: string): Uint8Array;
    crypto_box_seal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
    to_base64(data: Uint8Array, variant: number): string;
  }
  const sodium: Sodium;
  export default sodium;
}

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export type Encoding = "utf-8" | "utf-16" | "windows-1252";
export type DecodeErrorCode = "too-large" | "binary";

// Lê um arquivo como texto: tenta UTF-8 estrito e, se falhar, usa Windows-1252 (comum em arquivos do Windows em PT-BR).
// UTF-16 com BOM (o "Unicode" do Bloco de Notas e o `>` do Windows PowerShell) é reconhecido antes da checagem de binário.
// Erros: lança Error cuja message é um DecodeErrorCode, traduzido pela interface.
export async function decodeFile(file: File): Promise<{ text: string; encoding: Encoding }> {
  if (file.size > MAX_FILE_BYTES) throw new Error("too-large" satisfies DecodeErrorCode);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bom16 = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : null;
  if (bom16) return { text: new TextDecoder(bom16).decode(bytes), encoding: "utf-16" };
  if (bytes.subarray(0, 8192).includes(0)) throw new Error("binary" satisfies DecodeErrorCode);
  try {
    return { text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
  }
}

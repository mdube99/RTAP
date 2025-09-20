declare module 'jszip' {
  export default class JSZip {
    file(path: string, data: string, options?: { base64?: boolean }): JSZip;
    generateAsync(options: { type: 'blob' }): Promise<Blob>;
  }
}

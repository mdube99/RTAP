declare module 'html-to-image' {
  export function toPng(
    node: HTMLElement,
    options?: {
      skipFonts?: boolean;
      width?: number;
      height?: number;
      backgroundColor?: string;
      filter?: (node: HTMLElement) => boolean;
      style?: Record<string, string>;
    }
  ): Promise<string>;
}

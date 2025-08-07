// Type definitions for @myriaddreamin/typst-all-in-one.ts
declare module "@myriaddreamin/typst-all-in-one.ts" {
  export const $typst: {
    svg(options: { mainContent: string }): Promise<string>;
    pdf(options: { mainContent: string }): Promise<Uint8Array<ArrayBufferLike>>;
    ready?: Promise<void>;
  };
}

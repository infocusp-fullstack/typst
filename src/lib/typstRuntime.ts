/* eslint-disable @typescript-eslint/no-explicit-any */

// A fast-loading singleton for Typst that avoids idle delays and React context overhead
// Ensures the instance initializes once and is reused across the app.

let typstInstancePromise: Promise<any> | null = null;

export async function loadTypstFast(): Promise<any> {
  if (typstInstancePromise) {
    console.log("cached instance now");
    return typstInstancePromise;
  }

  typstInstancePromise = (async () => {
    console.log("init instance once");
    const { $typst } = await import("@myriaddreamin/typst-all-in-one.ts");
    if ($typst.ready) {
      await $typst.ready;
    }
    return $typst;
  })();

  return typstInstancePromise;
}

export async function compileFast(source: string): Promise<Uint8Array> {
  const $typst = await loadTypstFast();
  const pdf = await $typst.pdf({ mainContent: source });
  return pdf as Uint8Array;
}

const BASE = import.meta.env.BASE_URL;
export const IMAGE_SRC = {
  ship: BASE + 'img/ship.png',
  flame: BASE + 'img/flame.png',
  asteroid1: BASE + 'img/asteroid1.png',
  asteroid2: BASE + 'img/asteroid2.png',
  asteroid3: BASE + 'img/asteroid3.png',
  asteroid4: BASE + 'img/asteroid4.png',
  ufoBig: BASE + 'img/ufo-big.png',
  ufoSmall: BASE + 'img/ufo-small.png',
  background: BASE + 'img/background.jpg',
} as const;

export type ImageKey = keyof typeof IMAGE_SRC;
export type Images = Record<ImageKey, HTMLImageElement>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadImages(onProgress: (done: number, total: number) => void): Promise<Images> {
  const entries = Object.entries(IMAGE_SRC) as [ImageKey, string][];
  let done = 0;
  const out = {} as Images;
  await Promise.all(
    entries.map(async ([key, src]) => {
      out[key] = await loadImage(src);
      onProgress(++done, entries.length);
    }),
  );
  return out;
}

export async function loadFont(): Promise<void> {
  const font = new FontFace('Ransom', 'url(' + BASE + 'fonts/Ransom.ttf)');
  await font.load();
  document.fonts.add(font);
}

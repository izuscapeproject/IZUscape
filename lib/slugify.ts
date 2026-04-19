export function slugify(text: string, area?: string) {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  // エリアがある場合は前に付ける
  if (area) {
    return `${area}-${base}`;
  }

  return base;
}
export const normalizeImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;

  if (url.includes("localhost")) {
    return url.replace("localhost", "10.0.2.2");
  }

  return url;
};

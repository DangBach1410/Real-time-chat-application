export const normalizeImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;

  if (url.includes("http://localhost")) {
    return url.replace("http://localhost", `${process.env.EXPO_PUBLIC_API_URL}`);
  }

  return url;
};

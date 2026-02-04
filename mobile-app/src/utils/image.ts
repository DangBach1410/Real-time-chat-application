import { API_URL } from '../constants/common';
export const normalizeImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;

  if (url.includes("http://localhost")) {
    return url.replace("http://localhost", `${API_URL}`);
  }

  return url;
};

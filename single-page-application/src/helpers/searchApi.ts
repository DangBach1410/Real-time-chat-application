import api from './axiosInterceptor';

export interface SearchUserResponse {
  id: string;
  fullName: string;
  email?: string;
  imageUrl?: string;
  status: "FRIEND" | "PENDING" | "REQUESTED" | "NONE";
}

export const searchUsers = (
  currentUserId: string,
  keyword: string,
  page: number,
  size: number = 10
) => {
  return api.get<SearchUserResponse[]>("/auth/users/search", {
    params: { currentUserId, keyword, page, size },
  });
};

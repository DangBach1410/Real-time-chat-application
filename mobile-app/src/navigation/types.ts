export type AuthStackParamList = {
  Login?: { successMessage?: string };
  Register: undefined;
};

export type MainStackParamList = {
  Chat: undefined;
  ConversationChat: {
    conversationId: string;
    conversationName: string;
  };
  EditProfile: undefined;
  ChangePassword: undefined;
  FriendList: undefined;
  FriendRequests: undefined;
};

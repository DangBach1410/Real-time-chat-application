export type AuthStackParamList = {
  Login?: { successMessage?: string };
  Register: undefined;
};

export type MainStackParamList = {
  Chat: undefined;
  ConversationChat: {
    conversation: any;
    usersPresence?: Record<string, boolean>;
    jumpMessage?: any;
    jumpQuery?: string;
  };
  EditProfile: undefined;
  ChangePassword: undefined;
  FriendList: undefined;
  FriendRequests: undefined;
  NewGroup: {
    currentUserId: string;
    onCreated: (conv: any) => void;
  };
  ConversationDetails: {
    conversation: any;
  };
  AddMember: {
    conversationId: string;
    existingMemberIds: string[];
  };
  ConversationSearch: {
    conversation: any;
    onSelectMessage?: (message: any, query: string) => void;
  };
};

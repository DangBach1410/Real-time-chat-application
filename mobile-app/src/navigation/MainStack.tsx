import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatScreen from '../screens/ChatScreen';
import ConversationChatScreen from '../screens/ConversationChatScreen';
import { MainStackParamList } from './types';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import FriendListScreen from '../screens/FriendListScreen';
import FriendRequestsScreen from '../screens/FriendRequestsScreen';
import NewGroupScreen from '../screens/NewGroupScreen';
import ConversationDetailsScreen from '../screens/ConversationDetailsScreen';
import AddMemberScreen from '../screens/AddMemberScreen';
import ConversationSearchScreen from '../screens/ConversationSearchScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen 
        name="ConversationChat" 
        component={ConversationChatScreen}
      />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="FriendList" component={FriendListScreen} />
      <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
      <Stack.Screen name="NewGroup" component={NewGroupScreen} />
      <Stack.Screen name="ConversationDetails" component={ConversationDetailsScreen} />
      <Stack.Screen name="AddMember" component={AddMemberScreen} />
      <Stack.Screen name="ConversationSearch" component={ConversationSearchScreen} />
    </Stack.Navigator>
  );
}

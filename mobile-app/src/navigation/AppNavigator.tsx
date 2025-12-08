import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { useAuth, AuthProvider } from '../context/AuthContext';
import ChatLayout from '../layouts/ChatLayout';

function AppNavigatorInner() {
  const { isLoggedIn } = useAuth();

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <ChatLayout>
          <MainStack />
        </ChatLayout>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <AuthProvider>
      <AppNavigatorInner />
    </AuthProvider>
  );
}

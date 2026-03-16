import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import { useAuth, AuthProvider } from '../context/AuthContext';
import ChatLayout from '../layouts/ChatLayout';

export const navigationRef = createNavigationContainerRef();

function AppNavigatorInner() {
  const { isLoggedIn } = useAuth();

  return (
    <NavigationContainer ref={navigationRef}>
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

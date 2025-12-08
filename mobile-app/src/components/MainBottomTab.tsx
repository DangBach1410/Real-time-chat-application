// MainBottomTab.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, ScrollView } from "react-native";
import { useChatContext } from "../context/ChatContext";
import SearchUserScreen from "../screens/SearchUserScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function MainBottomTab({ scrollRef }: { scrollRef: React.RefObject<ScrollView | null> }) {
  const { user } = useChatContext();

  const HomeTab = () => (
    <ScrollView ref={scrollRef} style={{ flex: 1, padding: 16 }}>
      <Text>Hello, {user.fullName}</Text>
      <Text>User info demo...</Text>
    </ScrollView>
  );

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      screenListeners={{
        tabPress: (e) => {
          if (e.target?.endsWith("Home")) {
            // scroll lên đầu khi bấm lại tab Home
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTab}
        options={{ tabBarIcon: () => <Text>🏠</Text> }}
      />
      <Tab.Screen
        name="Search"
        component={SearchUserScreen}
        options={{ tabBarIcon: () => <Text>🔍</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: () => <Text>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

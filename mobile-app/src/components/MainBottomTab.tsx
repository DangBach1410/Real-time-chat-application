// MainBottomTab.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import SearchUserScreen from "../screens/SearchUserScreen";
import ProfileScreen from "../screens/ProfileScreen";
import HomeTab from "./HomeTab";
import { MaterialIcons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

export default function MainBottomTab({ scrollRef }: { scrollRef: React.RefObject<any> }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTab}
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
          tabBarLabel: "Chats",
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchUserScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="search" size={24} color={color} />,
          tabBarLabel: "Search",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

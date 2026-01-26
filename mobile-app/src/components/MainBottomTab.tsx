import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchUserScreen from "../screens/SearchUserScreen";
import ProfileScreen from "../screens/ProfileScreen";
import HomeTab from "./HomeTab";
import { MaterialIcons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

function withSafeArea(Component: React.ComponentType<any>) {
  return (props: any) => (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }} edges={["top"]}>
      <Component {...props} />
    </SafeAreaView>
  );
}

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
        component={withSafeArea(HomeTab)}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
          tabBarLabel: "Chats",
        }}
      />

      <Tab.Screen
        name="Search"
        component={withSafeArea(SearchUserScreen)}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="search" size={24} color={color} />
          ),
          tabBarLabel: "Search",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={withSafeArea(ProfileScreen)}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

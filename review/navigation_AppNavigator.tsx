import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fonts } from '../constants/theme';

import ZoekenScreen from '../screens/ZoekenScreen';
import BijbelScreen from '../screens/BijbelScreen';
import HoofdstukkenScreen from '../screens/HoofdstukkenScreen';
import VerzenScreen from '../screens/VerzenScreen';
import OudvadersScreen from '../screens/OudvadersScreen';
import OudvaderDetailScreen from '../screens/OudvaderDetailScreen';
import MeerScreen from '../screens/MeerScreen';
import CatechismusScreen from '../screens/CatechismusScreen';
import InstellingenScreen from '../screens/InstellingenScreen';
import BladwijzersScreen from '../screens/BladwijzersScreen';
import PreekVoorbereidingScreen from '../screens/PreekVoorbereidingScreen';

const Tab = createBottomTabNavigator();

// Custom header title with guaranteed font (native stack ignores fontFamily in headerTitleStyle on Android)
const HeaderTitle = ({ children }: { children?: React.ReactNode }) => (
  <Text
    style={{
      fontFamily: fonts.serifBold,
      fontSize: fontSize.lg + 2,
      color: colors.text,
      letterSpacing: 0.5,
    }}
    numberOfLines={1}
  >
    {children}
  </Text>
);

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.accent,
  headerTitle: (props: any) => <HeaderTitle>{props.children}</HeaderTitle>,
  headerBackTitleStyle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
  headerShadowVisible: false,
  headerTitleAlign: 'center' as const,
};

// -- Zoeken Stack --
const ZoekenStack = createNativeStackNavigator();
function ZoekenStackScreen() {
  return (
    <ZoekenStack.Navigator screenOptions={stackScreenOptions}>
      <ZoekenStack.Screen
        name="Zoeken"
        component={ZoekenScreen}
        options={{ headerShown: false }}
      />
    </ZoekenStack.Navigator>
  );
}

// -- Bijbel Stack --
const BijbelStack = createNativeStackNavigator();
function BijbelStackScreen() {
  return (
    <BijbelStack.Navigator screenOptions={stackScreenOptions}>
      <BijbelStack.Screen
        name="Bijbelboeken"
        component={BijbelScreen}
        options={{ title: 'Bijbel' }}
      />
      <BijbelStack.Screen
        name="Hoofdstukken"
        component={HoofdstukkenScreen}
        options={({ route }: any) => ({ title: route.params.bookName })}
      />
      <BijbelStack.Screen
        name="Verzen"
        component={VerzenScreen}
        options={({ route }: any) => ({
          title: `${route.params.bookName} ${route.params.chapter}`,
        })}
      />
    </BijbelStack.Navigator>
  );
}

// -- Oudvaders Stack --
const OudvadersStack = createNativeStackNavigator();
function OudvadersStackScreen() {
  return (
    <OudvadersStack.Navigator screenOptions={stackScreenOptions}>
      <OudvadersStack.Screen
        name="OudvadersLijst"
        component={OudvadersScreen}
        options={{ title: 'Oudvaders' }}
      />
      <OudvadersStack.Screen
        name="OudvaderDetail"
        component={OudvaderDetailScreen}
        options={({ route }: any) => ({ title: route.params.authorName })}
      />
    </OudvadersStack.Navigator>
  );
}

// -- Meer Stack --
const MeerStack = createNativeStackNavigator();
function MeerStackScreen() {
  return (
    <MeerStack.Navigator screenOptions={stackScreenOptions}>
      <MeerStack.Screen
        name="MeerOverzicht"
        component={MeerScreen}
        options={{ title: 'Meer' }}
      />
      <MeerStack.Screen
        name="Catechismus"
        component={CatechismusScreen}
        options={{ title: 'Heidelbergse Catechismus' }}
      />
      <MeerStack.Screen
        name="Instellingen"
        component={InstellingenScreen}
        options={{ title: 'Instellingen' }}
      />
      <MeerStack.Screen
        name="PreekVoorbereiding"
        component={PreekVoorbereidingScreen}
        options={{ title: 'Preekvoorbereiding' }}
      />
    </MeerStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(12,10,9,0.95)',
            borderTopColor: 'rgba(231,225,216,0.06)',
            paddingBottom: 4,
            height: 60,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarLabelStyle: {
            fontSize: fontSize.xs - 2,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="ZoekenTab"
          component={ZoekenStackScreen}
          options={{
            title: 'Zoeken',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="BijbelTab"
          component={BijbelStackScreen}
          options={{
            title: 'Bijbel',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="OudvadersTab"
          component={OudvadersStackScreen}
          options={{
            title: 'Oudvaders',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="BladwijzersTab"
          component={BladwijzersScreen}
          options={{
            title: 'Bladwijzers',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmark-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="MeerTab"
          component={MeerStackScreen}
          options={{
            title: 'Meer',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="ellipsis-vertical" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

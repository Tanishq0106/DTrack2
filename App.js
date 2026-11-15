import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverScreen from './src/screens/DriverScreen';
import CustomerScreen from './src/screens/CustomerScreen';
import { createOrder } from './src/services/api';

const Stack = createNativeStackNavigator();

// CP1/CP2 vertical slice + Gate 4 integration: order creation issues the
// bearer token both screens need for every subsequent request (security
// control). AI ETA/route and battery-aware tracking sit inside the screens
// and services; this stays a thin shell.
export default function App() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    createOrder()
      .then(setOrder)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <Text>Could not reach backend to create an order: {error}</Text>
        <Text>Check that backend/server.js is running and BASE_URL is reachable.</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Customer">
        <Stack.Screen name="Driver" initialParams={order}>
          {(props) => <DriverScreen {...props} orderId={order.orderId} token={order.token} />}
        </Stack.Screen>
        <Stack.Screen name="Customer" initialParams={order}>
          {(props) => <CustomerScreen {...props} orderId={order.orderId} token={order.token} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

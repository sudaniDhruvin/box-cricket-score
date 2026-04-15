import { StyleSheet } from 'react-native';
import React from 'react';
import RootNavigator from './src/navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const App = () => {
  return (
    <SafeAreaProvider style={styles.container}>
      <RootNavigator />
    </SafeAreaProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

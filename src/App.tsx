// src/App.tsx - FINAL PRODUCTION VERSION
import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar, Platform} from 'react-native';
import {store} from './store';
import {AppNavigator} from './navigation/AppNavigator';
import {colors} from './theme/colors';

const App: React.FC = () => {
  useEffect(() => {
    // Setup any app-wide initialization here
    console.log('HederaNet Mobile App Started');
    console.log('Platform:', Platform.OS);
    console.log('Environment:', __DEV__ ? 'Development' : 'Production');
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
            translucent={false}
          />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastActive, setLastActive] = useState(Date.now());

  const saveSession = async (data) => {
    setUser(data);
    await AsyncStorage.setItem('session', JSON.stringify(data));
    setLastActive(Date.now());
  };

  const clearSession = async () => {
    setUser(null);
    await AsyncStorage.removeItem('session');
  };

  const loadSession = async () => {
    const stored = await AsyncStorage.getItem('session');
    if (stored) setUser(JSON.parse(stored));
  };

  // Logout if inactive for more than 30 min
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && Date.now() - lastActive > 30 * 60 * 1000) {
        clearSession();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user, lastActive]);

  useEffect(() => {
    const handleAppStateChange = (nextState) => {
      if (nextState === 'active') setLastActive(Date.now());
      setAppState(nextState);
    };

    AppState.addEventListener('change', handleAppStateChange);
    loadSession();

    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, []);

  return (
    <SessionContext.Provider value={{ user, saveSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
};

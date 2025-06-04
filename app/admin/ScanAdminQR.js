import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Camera from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Theme colors
const themes = {
  RenderATL: {
    background: '#fdf0e2',
    text: '#711b43',
  },
  ATW: {
    background: '#f5f5f5',
    text: '#4f2b91',
  },
};

// ✅ DEV BYPASS toggle (works for both iOS & Android in emulator / test builds)
const isDevBypass = __DEV__ || process.env.EXPO_PUBLIC_QR_BYPASS === 'true';

export default function ScanAdminQR() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const { event } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;

  useEffect(() => {
    (async () => {
      if (isDevBypass) {
        setHasPermission(true); // ✅ Skip permission entirely in bypass mode
        return;
      }

      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    if (data.includes('event=')) {
      router.push(data); // Navigate to checkin
    } else {
      alert('Invalid QR code.');
      setScanned(false);
    }
  };

  // ✅ Use bypass logic for simulated scan view
  if (isDevBypass && hasPermission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.instruction, { color: theme.text }]}>
          Simulated: Tap below to simulate scan
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: '/checkin', params: { event } })
          }
        >
          <Text style={[styles.simulateBtn, { color: theme.text }]}>
            ▶️ Simulate Scan ➡️ Go to Check-In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === null) return <Text>Requesting camera permission…</Text>;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.instruction, { color: theme.text }]}>
        Scan Admin QR to Begin Check-In
      </Text>
      <Camera
        style={StyleSheet.absoluteFillObject}
        onBarCodeScanned={handleBarCodeScanned}
        barCodeScannerSettings={{ barCodeTypes: ['qr'] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  instruction: {
    textAlign: 'center',
    fontSize: 18,
    marginTop: 40,
  },
  simulateBtn: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
});

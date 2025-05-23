import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ScreenWrapper from '../../components/ScreenWrapper';

const themes = {
  RenderATL: {
    primary: '#fe88df',
    text: '#711b43',
  },
  ATW: {
    primary: '#ffb89e',
    text: '#4f2b91',
  },
};

export default function AdminLoginScreen() {
  const router = useRouter();
  const { event } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setError('');

    if (!firstName || !lastName) {
      setError('Please enter both first and last name.');
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const userQuery = query(
        usersRef,
        where('first_name', '==', firstName.trim()),
        where('last_name', '==', lastName.trim())
      );
      const snapshot = await getDocs(userQuery);

      if (snapshot.empty) {
        setError('No admin found with that name.');
        return;
      }

      const userData = snapshot.docs[0].data();
      const role = userData.role?.toLowerCase();

      if (role === 'admin') {
        router.push({
          pathname: '/admin/home',
          params: {
            event,
            name: `${firstName.trim()} ${lastName.trim()}`
          }
        });
      } else {
        setError('You are not authorized as an admin.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <ScreenWrapper event={event} scroll={true}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formWrapper}
      >
        <Text style={[styles.title, { color: theme.text }]}>Admin Login</Text>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          Access admin tools for {event}
        </Text>

        <TextInput
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          style={[styles.input, { borderColor: theme.primary }]}
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          style={[styles.input, { borderColor: theme.primary }]}
          placeholderTextColor="#999"
        />

        {error !== '' && <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>}

        <TouchableOpacity
          onPress={handleContinue}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    padding: 8,
    zIndex: 1,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  formWrapper: {
    marginTop: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { schedules } from '../data/scheduleData';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

const sanitizeKey = (str) => (str || '').replace(/[^a-zA-Z0-9._-]/g, '_');

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

export default function VolunteerDashboard() {
  const { name, event } = useLocalSearchParams();
  const theme = themes[event] || themes.RenderATL;
  const router = useRouter();
  const db = getFirestore();

  const isATW = event?.toLowerCase() === 'atw';
  const [floor, setFloor] = useState('');

  const today = new Date();
  const day = today.getDate();
  let activeDay = isATW ? 'June8' : 'June11';
  if (!isATW && day === 12) activeDay = 'June12';
  else if (!isATW && day === 13) activeDay = 'June13';

  const normalizedEvent =
    event?.toLowerCase() === 'renderatl' ? 'RenderATL'
    : event?.toLowerCase() === 'atw' ? 'ATW'
    : event;

  const selectedSchedule = schedules[`${normalizedEvent}_${activeDay}`] || [];
  const upcomingBlocks = getTimeBlockEvents(selectedSchedule, isATW);
  const highlights = getHighlightsFromSchedule(selectedSchedule);

  useEffect(() => {
    const loadFloor = async () => {
      try {
        const key = `floor_${sanitizeKey(name)}_${sanitizeKey(event)}`;
        console.log('📦 Checking SecureStore key:', key);

        const cached = await SecureStore.getItemAsync(key);
        if (cached) {
          console.log('✅ Found cached floor:', cached);
          setFloor(cached);
          return;
        }

        const q = query(
          collection(db, 'task_checkins'),
          where('name', '==', name),
          where('event', '==', event)
        );

        const snapshot = await getDocs(q);
        const doc = snapshot.docs[0]?.data();
        if (doc?.floor) {
          console.log('🛜 Fetched floor from Firestore:', doc.floor);
          setFloor(doc.floor);
          await SecureStore.setItemAsync(key, doc.floor);
        }
      } catch (error) {
        console.error('🧨 Error during loadFloor:', error);
      }
    };

    const timeout = setTimeout(loadFloor, 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Heads Up!',
      'Logging out does NOT check you out of your shift.\nPlease see a team lead or admin to check out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out Anyway',
          style: 'destructive',
          onPress: async () => {
            const key = `checkedIn_${sanitizeKey(name)}_${sanitizeKey(event)}`;
            await SecureStore.deleteItemAsync(key);
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleHelpRequest = async () => {
    try {
      await addDoc(collection(db, 'help_requests'), {
        name: name?.split(' ')[0] || 'Volunteer',
        event,
        floor: floor || 'Main Floor',
        roleToNotify: 'team_lead',
        timestamp: serverTimestamp(),
        resolved: false,
        escalatedToRapid: false,
        pickedUpBy: null,
        pickedUpAt: null,
      });

      Alert.alert(
        'Help Request Sent',
        `A team lead has been notified.${
          floor ? ` (Floor: ${floor})` : ''
        }\nPlease stay where you are.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Help request failed:', error);
      Alert.alert('Error', 'Could not send your help request. Try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollArea}>
        <Text style={[styles.welcomeText, { color: theme.text }]}>
          👋 Welcome, {name?.split(' ')[0] || 'Volunteer'}!
        </Text>

        <Text style={[styles.subText, { color: theme.text }]}>
          {floor
            ? `✅ You’re checked in on Floor ${floor}`
            : '⚠️ Please check in with your team lead to get your assignment.'}
        </Text>

        <Text style={[styles.subText, { color: theme.text }]}>
          {isATW
            ? 'Here’s what’s coming up at Atlanta Tech Week:'
            : 'Here’s what’s happening soon:'}
        </Text>

        {upcomingBlocks.length > 0 ? (
          upcomingBlocks.map((block, index) => (
            <View key={index} style={[styles.scheduleCard, { borderColor: theme.text }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>📅 {block.label}</Text>

              {block.items.map((item, i) => (
                <View key={i} style={styles.scheduleItem}>
                  <Text style={[styles.scheduleTime, { color: theme.text }]}>
                    {isATW ? `🕒 ${item.time}` : `📅 ${item.start} – ${item.end}`}
                  </Text>
                  <Text style={[styles.scheduleTitle, { color: theme.text }]}>
                    {isATW ? `📛 ${item.label}` : `🎤 ${item.label}`}
                  </Text>
                  {!isATW && item.speaker && (
                    <Text style={[styles.scheduleSpeaker, { color: theme.text }]}>
                      🙋 {item.speaker}
                    </Text>
                  )}
                  {item.location && (
                    <Text style={[styles.scheduleLocation, { color: theme.text }]}>
                      📍 {item.location}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={[styles.scheduleTitle, { color: theme.text }]}>
            No sessions in this time block. Full schedule available in the Render app.
          </Text>
        )}

        {/* ⚡️ Today’s Highlights (now dynamic) */}
        {highlights.length > 0 && (
          <View style={[styles.infoCard, { borderColor: theme.text }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>⚡ Today’s Highlights</Text>
            {highlights.map((line, i) => (
              <Text key={i} style={[styles.cardText, { color: theme.text }]}>• {line}</Text>
            ))}
          </View>
        )}

        {/* 🧰 Quick Tips */}
        <View style={[styles.infoCard, { borderColor: theme.text }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🧰 Quick Tips</Text>
          <Text style={[styles.cardText, { color: theme.text }]}>
            • Wi-Fi: render2025 / Password: atltech{'\n'}
            • Lost & Found: Check at HQ{'\n'}
            • Slack: #volunteers channel
          </Text>
        </View>

        <View style={styles.renderAppNote}>
          <Text style={[styles.renderAppText, { color: theme.text }]}>
            *The full schedule is available in the Render App.*
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://renderatl.com/app')}>
            <Text style={[styles.renderAppLink, { color: theme.text }]}>
              🔗 Tap here to download or open it
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.text, backgroundColor: theme.background }]}>
        <IconButton
          label="Briefing"
          icon={<MaterialIcons name="menu-book" size={28} color={theme.text} />}
          onPress={() =>
            Linking.openURL('https://docs.google.com/document/d/1SOTpiN8kImUlg8pwKnOA5RvYTYM7PztG3Cx1q5LwUFM/edit?usp=sharing')
          }
          theme={theme}
        />
        <IconButton
          label="FAQ"
          icon={<MaterialIcons name="help-outline" size={28} color={theme.text} />}
          onPress={() =>
            Linking.openURL('https://docs.google.com/document/d/1hfUp3M084ql5a4iMtezsJbVbQZEAnkUBMo63WZozphw/edit?usp=sharing')
          }
          theme={theme}
        />
        <IconButton
          label="Help"
          icon={<MaterialIcons name="support-agent" size={28} color={theme.text} />}
          onPress={handleHelpRequest}
          theme={theme}
        />
        <IconButton
          label="Logout"
          icon={<MaterialIcons name="logout" size={28} color={theme.text} />}
          onPress={handleLogout}
          theme={theme}
        />
      </View>
    </SafeAreaView>
  );
}

function IconButton({ label, icon, onPress, theme }) {
  return (
    <TouchableOpacity style={styles.iconButton} onPress={onPress}>
      {icon}
      <Text style={[styles.iconLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getTimeBlockEvents(schedule, isATW) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  const blocks = [
    { label: '9:00–11:00 AM', start: 9, end: 11 },
    { label: '11:30 AM–2:00 PM', start: 11.5, end: 14 },
    { label: '2:30–5:00 PM', start: 14.5, end: 17 },
    { label: 'Evening', start: 17.5, end: 23.99 },
  ];

  const getDecimalTime = (time) => {
    const [hr, min] = time.split(':').map(Number);
    return hr + min / 60;
  };

  for (let block of blocks) {
    const blockEvents = schedule.filter(event => {
      const startTime = isATW
        ? getDecimalTime(event.time)
        : getDecimalTime(event.start);
      return startTime >= block.start && startTime < block.end;
    });

    if (blockEvents.length && currentHour < block.end) {
      return [{ label: block.label, items: blockEvents.slice(0, 3) }];
    }
  }

  return [];
}

function getHighlightsFromSchedule(schedule) {
  const prioritize = (label = '', location = '') => {
    const text = `${label} ${location}`.toLowerCase();
    if (text.includes('keynote')) return 1;
    if (text.includes('main stage') && text.includes('ai')) return 2;
    if (text.includes('silicon south')) return 3;
    if (text.includes('fireside')) return 4;
    if (text.includes('closing') || text.includes('opening')) return 5;
    return 6; // fallback priority for sub-stages or other good stuff
  };

  const getDecimalTime = (timeStr) => {
    const time = timeStr || '';
    const [h, m] = time.split(':').map(Number);
    return h + (m || 0) / 60;
  };

  return schedule
    .map((event) => {
      const label = event.label?.toLowerCase() || '';
      const location = event.location?.toLowerCase() || '';
      const time = event.time || event.start || '00:00';
      const rank = prioritize(label, location);
      return { ...event, rank, timeVal: getDecimalTime(time) };
    })
    .filter((e) => e.rank < 6)
    .sort((a, b) => {
      if (a.rank === b.rank) return a.timeVal - b.timeVal;
      return a.rank - b.rank;
    })
    .slice(0, 3)
    .map((e) => {
      const time = e.time || `${e.start} – ${e.end}`;
      return `${e.label} at ${time}${e.location ? ` (${e.location})` : ''}`;
    });
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { padding: 24, paddingBottom: 100 },
  welcomeText: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  subText: { fontSize: 16, textAlign: 'center', marginBottom: 12 },
  scheduleCard: { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  scheduleItem: { marginBottom: 12 },
  scheduleTime: { fontSize: 14, fontWeight: '600' },
  scheduleTitle: { fontSize: 15, marginTop: 2, fontWeight: '500' },
  scheduleSpeaker: { fontSize: 14, marginTop: 1 },
  scheduleLocation: { fontSize: 14, marginTop: 1, fontStyle: 'italic' },
  infoCard: { borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 20 },
  cardText: { fontSize: 14, lineHeight: 22 },
  renderAppNote: { marginTop: 8, marginBottom: 28, alignItems: 'center' },
  renderAppText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  renderAppLink: { fontSize: 14, textDecorationLine: 'underline', fontWeight: '500', marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 2, paddingVertical: 12 },
  iconButton: { alignItems: 'center' },
  iconLabel: { marginTop: 4, fontSize: 14, fontWeight: '600' },
});

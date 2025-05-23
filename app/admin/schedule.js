// app/admin/schedule.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import ScreenWrapper from '../../components/ScreenWrapper';

const themes = {
  RenderATL: {
    background: '#fdf0e2',
    primary: '#fe88df',
    text: '#711b43',
  },
  ATW: {
    background: '#f5f5f5',
    primary: '#ffb89e',
    text: '#4f2b91',
  },
};

export default function ScheduleScreen() {
  const { event, name } = useLocalSearchParams();
  const router = useRouter();
  const [currentEvent, setCurrentEvent] = useState(event || 'RenderATL');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const theme = themes[currentEvent] || themes.RenderATL;

  useEffect(() => {
    const fetchSchedule = async () => {
      const q = query(
        collection(db, 'scheduled_volunteers'),
        where('date', '==', selectedDate.toISOString().split('T')[0]),
        where('event', '==', currentEvent)
      );
      const snapshot = await getDocs(q);
      setSchedule(snapshot.docs.map((doc) => doc.data()));
    };

    fetchSchedule();
  }, [selectedDate, currentEvent]);

  const handleExport = async () => {
    const rows = [
      ['First Name', 'Last Name', 'Shift', 'Role'],
      ...schedule.map((v) => [v.first_name, v.last_name, v.shift, v.role || 'Volunteer']),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const fileUri = FileSystem.documentDirectory + `schedule-${selectedDate.toISOString().split('T')[0]}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

    await Sharing.shareAsync(fileUri);
  };

  return (
    <ScreenWrapper event={currentEvent} scroll={false}>
      <View style={{ marginTop: 60, marginBottom: 20 }}>
        <Text style={[styles.title, { color: theme.text }]}>
          {currentEvent} Schedule
        </Text>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          Volunteers scheduled for {selectedDate.toISOString().split('T')[0]}
        </Text>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={() => setCurrentEvent(currentEvent === 'RenderATL' ? 'ATW' : 'RenderATL')}
            style={[styles.switchButton, { borderColor: theme.primary }]}
          >
            <Text style={{ color: theme.primary }}>
              Switch to {currentEvent === 'RenderATL' ? 'ATW' : 'RenderATL'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.dateButtonText}>Change Date</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}
      </View>

      <FlatList
        data={schedule}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: theme.primary }]}>
            <Text style={[styles.cell, { color: theme.text }]}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={[styles.cell, { color: theme.text }]}>{item.shift}</Text>
            <Text style={[styles.cell, { color: theme.text }]}>{item.role || 'Volunteer'}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: theme.text, textAlign: 'center' }}>
            No volunteers scheduled.
          </Text>
        }
      />

      <TouchableOpacity
        onPress={handleExport}
        style={[styles.exportButton, { backgroundColor: theme.primary }]}
      >
        <Text style={styles.exportText}>📤 Export to CSV</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push({ pathname: '/admin/home', params: { name, event: currentEvent } })}
        style={[styles.backButton, { borderColor: theme.primary }]}
      >
        <Text style={[styles.backText, { color: theme.primary }]}>← Back to Dashboard</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  switchButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderRadius: 20,
  },
  dateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  dateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 6,
    padding: 12,
    backgroundColor: '#fff',
  },
  cell: {
    fontSize: 16,
    marginBottom: 4,
  },
  exportButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  exportText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 24,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    borderRadius: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

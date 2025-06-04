import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";

const themes = {
  RenderATL: {
    background: "#fdf0e2",
    text: "#711b43",
  },
  ATW: {
    background: "#f5f5f5",
    text: "#4f2b91",
  },
};

export default function TeamLeadDashboard() {
  const { name, event } = useLocalSearchParams();
  const router = useRouter();
  const db = getFirestore();
  const theme = themes[event] || themes.RenderATL;

  const [teamLeadFloor, setTeamLeadFloor] = useState("Main Floor");
  const [helpRequests, setHelpRequests] = useState([]);
  const [scheduledVolunteers, setScheduledVolunteers] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);

  const makeSecureKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, "_");

  useEffect(() => {
    const loadFloor = async () => {
      try {
        const rawKey = `teamLeadFloor_${name}_${event}`;
        const secureKey = makeSecureKey(rawKey);
        const storedFloor = await SecureStore.getItemAsync(secureKey);
        setTeamLeadFloor(storedFloor || "Main Floor");
      } catch (err) {
        console.error("Error loading floor from storage:", err);
        setTeamLeadFloor("Main Floor");
      }
    };
    loadFloor();
  }, [name, event]);

  useEffect(() => {
    const saveSession = async () => {
      await SecureStore.setItemAsync('volunteerSession', JSON.stringify({
        name,
        event,
        role: 'teamlead'
      }));
    };
    saveSession();
  }, [name, event]);

  useEffect(() => {
    const fetchHelpRequests = async () => {
      try {
        const q = query(
          collection(db, "help_requests"),
          where("event", "==", event),
          where("resolved", "==", false),
          where("floor", "==", teamLeadFloor)
        );
        const snapshot = await getDocs(q);
        setHelpRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching help requests:", error);
      }
    };

    const fetchScheduledVolunteers = async () => {
      const q = query(
        collection(db, "scheduled_volunteers"),
        where("event", "==", event),
        where("floor", "==", teamLeadFloor),
        where("checkedIn", "==", false)
      );
      const snapshot = await getDocs(q);
      setScheduledVolunteers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 5));
    };

    fetchHelpRequests();
    fetchScheduledVolunteers();
  }, [event, teamLeadFloor]);

  const handleHelpRequest = async () => {
    try {
      await addDoc(collection(db, "alerts"), {
        message: `🚨 Help Requested by ${name} on ${teamLeadFloor}`,
        event,
        severity: "error",
        sendPush: true,
        dismissedBy: [],
        resolved: false,
        timestamp: new Date(),
        submittedBy: name,
        floor: teamLeadFloor
      });
  
      Alert.alert("Help request sent successfully!");
    } catch (err) {
      console.error("Error submitting help request:", err);
      Alert.alert("Error submitting help request");
    }
  };
  

  const handleLogout = async () => {
    Alert.alert(
      'Heads Up!',
      'Logging out does NOT check you out of your shift.\nPlease see an admin to check out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out Anyway',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('volunteerSession');
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollArea}>
        <Text style={[styles.title, { color: theme.text }]}>
          Welcome, {name?.split(" ")[0] || "Team Lead"}!
        </Text>
        <Text style={[styles.sub, { color: theme.text }]}>
          You're checked in on {teamLeadFloor}
        </Text>

        <View style={[styles.section, { borderColor: theme.text }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🧰 Team Lead Tools
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push(`/teamlead/helpinbox?name=${name}&event=${event}`)
            }
          >
            <Text style={[styles.link, { color: theme.text }]}>
              🔗 View Help Inbox
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/teamlead/floor-overview",
                params: { event, floor: teamLeadFloor },
              })
            }
          >
            <Text style={[styles.link, { color: theme.text }]}>
              🔗 View Floor Roster
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { borderColor: theme.text }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            👀 Scheduled Volunteers
          </Text>
          {scheduledVolunteers.length > 0 ? (
            scheduledVolunteers.map((vol, index) => (
              <View key={index} style={[styles.item, { marginBottom: 8 }]}>
                <Text style={{ color: theme.text }}>
                  {vol.first_name} {vol.last_name}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: theme.text }}>
              All volunteers are checked in!
            </Text>
          )}
        </View>

        <View style={[styles.section, { borderColor: theme.text }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            📖 Quick Links
          </Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL("https://docs.google.com/document/d/1SOTpiN8kImUlg8pwKnOA5RvYTYM7PztG3Cx1q5LwUFM")
            }
          >
            <Text style={[styles.link, { color: theme.text }]}>🔗 Briefing Book</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL("https://docs.google.com/document/d/1hfUp3M084ql5a4iMtezsJbVbQZEAnkUBMo63WZozphw")
            }
          >
            <Text style={[styles.link, { color: theme.text }]}>🔗 FAQ</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.footerNote, { color: theme.text }]}>
            📘 The full volunteer schedule is available in the Briefing Book.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.text, backgroundColor: theme.background }]}>
        <IconButton
          label="Check In"
          icon={<MaterialCommunityIcons name="qrcode-scan" size={28} color={theme.text} />}
          onPress={() => router.push(`/teamlead/qr?name=${name}&event=${event}`)}
          theme={theme}
        />
        <IconButton
          label="Help"
          icon={<MaterialIcons name="support-agent" size={28} color={theme.text} />}
          onPress={handleHelpRequest}
          theme={theme}
        />
        <IconButton
          label="Manual Check In"
          icon={<MaterialIcons name="edit" size={28} color={theme.text} />}
          onPress={() =>
            router.push(`/teamlead/taskcheckin?teamlead=${encodeURIComponent(name)}&event=${event}&floor=${encodeURIComponent(teamLeadFloor)}`)
          }
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  sub: { fontSize: 16, textAlign: "center", marginBottom: 20 },
  section: { borderWidth: 2, borderRadius: 12, padding: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  item: { fontSize: 15, marginBottom: 4 },
  link: { fontSize: 15, textDecorationLine: "underline", marginBottom: 8 },
  footer: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 2, paddingVertical: 12 },
  iconButton: { alignItems: "center" },
  iconLabel: { marginTop: 4, fontSize: 14, fontWeight: "600" },
  footerNote: { marginTop: 8, marginBottom: 8, fontSize: 12, textAlign: "center", fontStyle: "italic" },
});

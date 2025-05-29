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
import * as SecureStore from 'expo-secure-store';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";

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

const allFloors = ["Main Floor", "West Wing", "VIP"];
const taskOptions = {
  "Main Floor": ["Swag Distribution", "Stage Crew"],
  "West Wing": ["Registration", "Tech Support"],
  VIP: ["Badge Fix", "VIP Check-In"],
};

export default function TeamLeadDashboard() {
  const { name, event } = useLocalSearchParams();
  const router = useRouter();
  const db = getFirestore();
  const theme = themes[event] || themes.RenderATL;

  const [teamLeadFloor, setTeamLeadFloor] = useState("Main Floor");
  const [helpRequests, setHelpRequests] = useState([]);
  const [scheduledVolunteers, setScheduledVolunteers] = useState([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [reassignTask, setReassignTask] = useState("");
  const [reassignFloor, setReassignFloor] = useState("");

  const makeSecureKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, '_');

  const openRenderAppStore = () => {
    const appStoreLink =
      Platform.OS === "ios"
        ? "https://apps.apple.com/us/app/renderatl/id6451233141"
        : "https://play.google.com/store/apps/details?id=com.renderatl.app";
    Linking.openURL(appStoreLink);
  };

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
    const fetchHelpRequests = async () => {
      try {
        const now = Date.now() / 1000;
        let q;

        if (teamLeadFloor === "Rapid Response") {
          q = query(
            collection(db, "help_requests"),
            where("event", "==", event),
            where("resolved", "==", false),
            where("pickedUpBy", "==", null),
            where("roleToNotify", "==", "team_lead")
          );
        } else {
          q = query(
            collection(db, "help_requests"),
            where("event", "==", event),
            where("resolved", "==", false),
            where("floor", "==", teamLeadFloor)
          );
        }

        const snapshot = await getDocs(q);
        const filteredData = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp?.seconds || 0;
            const ageInSeconds = now - timestamp;
            const isSecondAlert =
              teamLeadFloor === "Rapid Response" &&
              data.pickedUpBy === null &&
              ageInSeconds >= 120;

            return { ...data, id: doc.id, isSecondAlert };
          })
          .filter((doc) =>
            teamLeadFloor === "Rapid Response" ? doc.isSecondAlert : true
          );

        setHelpRequests(filteredData);
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
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setScheduledVolunteers(data.slice(0, 5));
    };

    fetchHelpRequests();
    fetchScheduledVolunteers();
  }, [event, teamLeadFloor]);

  const handlePickUpHelpRequest = async (requestId) => {
    try {
      const requestRef = doc(db, "help_requests", requestId);
      await updateDoc(requestRef, {
        pickedUpBy: name,
        pickedUpAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to pick up help request:", err);
    }
  };

  const handleLogout = async () => {
    const rawKey = `teamLeadFloor_${name}_${event}`;
    const secureKey = makeSecureKey(rawKey);
    await SecureStore.deleteItemAsync(secureKey);
    router.replace("/");
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
          <TouchableOpacity onPress={() =>
            router.push(`/teamlead/helpinbox?name=${name}&event=${event}`)}>
            <Text style={[styles.link, { color: theme.text }]}>
              🔗 View Help Inbox
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
          <TouchableOpacity onPress={() => Linking.openURL("https://docs.google.com/document/d/1SOTpiN8kImUlg8pwKnOA5RvYTYM7PztG3Cx1q5LwUFM")}>
            <Text style={[styles.link, { color: theme.text }]}>🔗 Briefing Book</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("https://docs.google.com/document/d/1hfUp3M084ql5a4iMtezsJbVbQZEAnkUBMo63WZozphw")}>
            <Text style={[styles.link, { color: theme.text }]}>🔗 FAQ</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12 }}>
          <TouchableOpacity onPress={openRenderAppStore}>
            <Text style={[styles.footerNote, { color: theme.text, textDecorationLine: "underline" }]}>
              📅 Download the RenderATL app to view the full event schedule
            </Text>
          </TouchableOpacity>
          <Text style={[styles.footerNote, { color: theme.text, marginTop: 6 }]}>
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
          onPress={() => router.push(`/teamlead/help?name=${name}&event=${event}`)}
          theme={theme}
        />
        <IconButton
          label="Manual Check In"
          icon={<MaterialIcons name="edit" size={28} color={theme.text} />}
          onPress={() => router.push(`/teamlead/taskcheckin?teamlead=${encodeURIComponent(name)}&event=${event}&floor=${encodeURIComponent(teamLeadFloor)}`)}
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
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  sub: { fontSize: 16, textAlign: "center", marginBottom: 20 },
  section: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  item: { fontSize: 15, marginBottom: 4 },
  link: { fontSize: 15, textDecorationLine: "underline", marginBottom: 8 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 2,
    paddingVertical: 12,
  },
  iconButton: { alignItems: "center" },
  iconLabel: { marginTop: 4, fontSize: 14, fontWeight: "600" },
  footerNote: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});

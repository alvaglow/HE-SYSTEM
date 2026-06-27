// screens/ParentDashboard.js — children linked by guardianId in the shared store.
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import * as data from '../services/data';

export default function ParentDashboard({ user, navigation }) {
  const [children, setChildren] = useState([]);

  useEffect(() => {
    const unsub = data.watchStudentsByGuardian(user.uid, setChildren);
    return () => { try { unsub(); } catch (_) {} };
  }, [user.uid]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Xin chào, Phụ huynh {(user.name || '').split(' ').pop()} 👨‍👩‍👧</Text>
      </View>

      {children.length === 0 && (
        <View style={styles.card}><Text style={styles.noData}>Chưa có học sinh được liên kết.</Text></View>
      )}

      {children.map((child) => (
        <View key={child.id} style={styles.childCard}>
          <View style={styles.childHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(child.name || '?')[0]}</Text></View>
            <View style={styles.flex1}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.childInfo}>{child.programme || 'APD'}  •  {child.studentId || child.id}</Text>
            </View>
            <View style={[styles.statusDot, (child.attendance ?? 0) >= 75 ? styles.present : styles.absent]} />
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.stat}>Chuyên cần: <Text style={styles.green}>{child.attendance ?? '—'}%</Text></Text>
            <Text style={styles.stat}>GPA: <Text style={styles.blue}>{child.gpa ?? '—'}</Text></Text>
          </View>

          <View style={styles.quickLinks}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Payment', { childId: child.studentId || child.id })}>
              <Text style={styles.quickBtnText}>💳 Học phí</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0d1117' },
  header:      { padding: 24, paddingBottom: 8 },
  greeting:    { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  card:        { margin: 12, backgroundColor: '#161b22', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#30363d' },
  noData:      { color: '#555', fontSize: 14, fontStyle: 'italic' },
  childCard:   { margin: 12, backgroundColor: '#161b22', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#30363d' },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:  { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  flex1:       { flex: 1 },
  childName:   { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  childInfo:   { color: '#8b949e', fontSize: 13 },
  statusDot:   { width: 12, height: 12, borderRadius: 6 },
  present:     { backgroundColor: '#4ade80' },
  absent:      { backgroundColor: '#f87171' },
  statsRow:    { flexDirection: 'row', gap: 20, marginBottom: 14 },
  stat:        { color: '#8b949e', fontSize: 14 },
  green:       { color: '#4ade80', fontWeight: 'bold' },
  blue:        { color: '#60a5fa', fontWeight: 'bold' },
  quickLinks:  { flexDirection: 'row', gap: 8 },
  quickBtn:    { flex: 1, backgroundColor: '#21262d', borderRadius: 8, padding: 12, alignItems: 'center' },
  quickBtnText:{ color: '#e2e8f0', fontSize: 14 },
});

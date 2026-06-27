// screens/StudentDashboard.js — live from the shared backbone (student record,
// invoices, attendance) — the same data the web Student portal shows.
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import VNDAmount from '../components/VNDAmount';
import * as data from '../services/data';

export default function StudentDashboard({ user, navigation }) {
  const [student, setStudent] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [records, setRecords]   = useState([]);

  useEffect(() => {
    const u1 = data.watchStudentByUser(user.uid, (s) => setStudent(s[0] || null));
    const u2 = data.watchMyAttendance(user.uid, setRecords);
    return () => { try { u1(); u2(); } catch (_) {} };
  }, [user.uid]);

  const studentId = student && (student.studentId || student.id);
  useEffect(() => {
    if (!studentId) return undefined;
    const u = data.watchInvoices(studentId, setInvoices);
    return () => { try { u(); } catch (_) {} };
  }, [studentId]);

  const totalDue = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + (i.amount || 0), 0);
  const presentCount = records.filter((r) => r.status === 'present').length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Xin chào, {(user.name || 'Học sinh').split(' ').pop()} 👋</Text>
        <Text style={styles.subId}>{student?.programme || 'HP System'} {student?.semester ? ('• HK' + student.semester) : ''}</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.statCard, { borderColor: '#60a5fa' }]}>
          <Text style={[styles.statNum, { color: '#60a5fa' }]}>{student?.gpa ?? '—'}</Text>
          <Text style={styles.statLabel}>GPA</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#4ade80' }]}>
          <Text style={[styles.statNum, { color: '#4ade80' }]}>{student ? (student.attendance + '%') : '—'}</Text>
          <Text style={styles.statLabel}>Chuyên cần</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#facc15' }]}>
          <Text style={[styles.statNum, { color: '#facc15' }]}>{presentCount}</Text>
          <Text style={styles.statLabel}>Có mặt</Text>
        </View>
      </View>

      {totalDue > 0 && (
        <TouchableOpacity style={styles.feeCard} onPress={() => navigation.navigate('Payment')}>
          <Text style={styles.cardLabel}>💳 Học phí cần thanh toán</Text>
          <VNDAmount amount={totalDue} large />
          <Text style={styles.feeAction}>Nhấn để thanh toán →</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.checkinBtn} onPress={() => navigation.navigate('Attendance')}>
        <Text style={styles.checkinIcon}>✋</Text>
        <Text style={styles.checkinText}>Điểm danh ngay</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0d1117' },
  header:      { padding: 24, paddingBottom: 8 },
  greeting:    { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subId:       { color: '#8b949e', fontSize: 13, marginTop: 4 },
  row:         { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 8 },
  statCard:    { flex: 1, backgroundColor: '#161b22', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  statNum:     { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  statLabel:   { color: '#8b949e', fontSize: 12 },
  cardLabel:   { color: '#8b949e', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  feeCard:     { margin: 12, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e9456033', alignItems: 'center' },
  feeAction:   { color: '#e94560', fontSize: 14, marginTop: 8 },
  checkinBtn:  { margin: 12, backgroundColor: '#0f3460', borderRadius: 12, padding: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12 },
  checkinIcon: { fontSize: 28 },
  checkinText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

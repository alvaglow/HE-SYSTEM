// screens/AttendanceScreen.js — OTP + face liveness + GPS check-in, written to the
// SAME Firestore the teacher's web portal reads. Firestore handles offline queueing.
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import FaceScanButton from '../components/FaceScanButton';
import * as data from '../services/data';

export default function AttendanceScreen({ user }) {
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState(null); // 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [records, setRecords]   = useState([]);

  useEffect(() => {
    const unsub = data.watchMyAttendance(user.uid, setRecords);
    return () => { try { unsub(); } catch (_) {} };
  }, [user.uid]);

  const requestLocation = async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') { Alert.alert('Cần quyền truy cập vị trí'); return null; }
    return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  };

  const handleLivenessSuccess = async () => {
    if (otp.trim().length < 6) { setStatus('error'); setStatusMsg('Nhập mã OTP 6 số từ giáo viên trước'); return; }
    setLoading(true); setStatus(null);
    try {
      const loc = await requestLocation();
      const coords = loc ? loc.coords : null;
      await data.checkInByOtp({ otp: otp.trim(), uid: user.uid, location: coords });
      setStatus('success');
      setStatusMsg('✓ Điểm danh thành công — đã đồng bộ với giáo viên');
      setOtp('');
    } catch (err) {
      setStatus('error');
      setStatusMsg('✗ ' + (err.message || 'Điểm danh thất bại'));
    } finally { setLoading(false); }
  };

  const statusColors = { success: '#4ade80', error: '#f87171' };
  const presentCount = records.filter((r) => r.status === 'present').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Điểm danh</Text>
      <Text style={styles.date}>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>

      {status && (
        <View style={[styles.statusBox, { borderColor: statusColors[status] + '66' }]}>
          <Text style={[styles.statusMsg, { color: statusColors[status] }]}>{statusMsg}</Text>
        </View>
      )}

      <View style={styles.scanArea}>
        <Text style={styles.instruction}>Nhập mã OTP từ giáo viên, rồi quét khuôn mặt</Text>
        <TextInput
          style={styles.otpInput}
          placeholder="000000"
          placeholderTextColor="#555"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
        {!loading ? (
          <FaceScanButton
            userId={user.uid}
            onSuccess={handleLivenessSuccess}
            onError={(err) => { setStatus('error'); setStatusMsg(err.message); }}
          />
        ) : (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#e94560" />
            <Text style={styles.loadingText}>Đang xác minh khuôn mặt + GPS…</Text>
          </View>
        )}
        <Text style={styles.hint}>📍 Vị trí GPS được xác minh tự động</Text>
      </View>

      <View style={styles.history}>
        <Text style={styles.historyTitle}>Lần điểm danh gần đây ({presentCount})</Text>
        {records.slice(-6).reverse().map((r, i) => (
          <View key={r.id || i} style={styles.recordRow}>
            <Text style={styles.recordStatus}>✅</Text>
            <Text style={styles.recordText}>{r.classId || 'Lớp học'} — {r.status}</Text>
          </View>
        ))}
        {records.length === 0 && <Text style={styles.hint}>Chưa có lượt điểm danh.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0d1117' },
  content:     { padding: 24, alignItems: 'center' },
  title:       { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  date:        { color: '#8b949e', fontSize: 14, marginBottom: 24 },
  statusBox:   { width: '100%', backgroundColor: '#161b22', borderRadius: 10, padding: 14, marginBottom: 20, borderWidth: 1, alignItems: 'center' },
  statusMsg:   { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  scanArea:    { width: '100%', alignItems: 'center', gap: 16 },
  instruction: { color: '#e2e8f0', fontSize: 16, textAlign: 'center' },
  otpInput:    { width: 180, backgroundColor: '#21262d', color: '#fff', borderRadius: 8, padding: 12, fontSize: 26, letterSpacing: 8, textAlign: 'center', borderWidth: 1, borderColor: '#30363d' },
  hint:        { color: '#8b949e', fontSize: 13, textAlign: 'center' },
  loadingBox:  { alignItems: 'center', gap: 16, padding: 40 },
  loadingText: { color: '#8b949e', fontSize: 15 },
  history:     { width: '100%', marginTop: 28 },
  historyTitle:{ color: '#8b949e', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10 },
  recordRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#161b22', borderRadius: 8, padding: 12, marginBottom: 8 },
  recordStatus:{ fontSize: 16 },
  recordText:  { color: '#e2e8f0', fontSize: 14 },
});

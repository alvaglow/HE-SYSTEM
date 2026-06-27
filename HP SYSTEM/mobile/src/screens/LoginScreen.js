// screens/LoginScreen.js — Firebase email/password sign-in (same accounts as web)
// with an optional biometric unlock for a persisted session.
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import * as data from '../services/data';
import { isBiometricAvailable, authenticateWithBiometric } from '../services/biometric';

const FRIENDLY = {
  'auth/invalid-email': 'Email không hợp lệ',
  'auth/user-not-found': 'Tài khoản không tồn tại',
  'auth/wrong-password': 'Sai mật khẩu',
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng',
  'auth/too-many-requests': 'Quá nhiều lần thử — vui lòng đợi',
  'auth/network-request-failed': 'Lỗi mạng — kiểm tra kết nối',
};

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [bioAvail, setBioAvail] = useState(false);

  useEffect(() => { isBiometricAvailable().then(({ available }) => setBioAvail(available)); }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) return Alert.alert('Vui lòng nhập email và mật khẩu');
    setLoading(true);
    try {
      await data.signIn(email, password); // App.watchAuth handles navigation
    } catch (err) {
      Alert.alert('Đăng nhập thất bại', FRIENDLY[err.code] || err.message || 'Vui lòng thử lại');
    } finally { setLoading(false); }
  };

  const handleBiometric = async () => {
    setLoading(true);
    try {
      const ok = await authenticateWithBiometric();
      if (ok && data.currentUser()) return; // persisted session — App navigates
      if (ok) Alert.alert('Vui lòng đăng nhập bằng email lần đầu', 'Sau đó có thể dùng vân tay/Face ID.');
    } catch (err) {
      Alert.alert('Xác thực không thành công', err.message);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.logo}>HP</Text>
        <Text style={styles.title}>HP System</Text>
        <Text style={styles.sub}>Hệ thống quản lý học tập</Text>

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={styles.input} placeholder="Mật khẩu" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Đăng nhập</Text>}
        </TouchableOpacity>
        {bioAvail && (
          <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric} disabled={loading}>
            <Text style={styles.bioBtnText}>👤  Face ID / Vân tay</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.hint}>Demo: student@hp.edu · teacher@hp.edu (sau khi chạy seeder)</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0d1117', justifyContent: 'center', padding: 24 },
  card:       { backgroundColor: '#161b22', borderRadius: 16, padding: 32, alignItems: 'center' },
  logo:       { width: 72, height: 72, backgroundColor: '#0f3460', borderRadius: 36, textAlign: 'center', lineHeight: 72, fontSize: 28, fontWeight: 'bold', color: '#e94560', marginBottom: 12 },
  title:      { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  sub:        { color: '#8b949e', fontSize: 14, marginBottom: 28 },
  input:      { width: '100%', backgroundColor: '#21262d', color: '#fff', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#30363d' },
  btn:        { width: '100%', backgroundColor: '#0f3460', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bioBtn:     { width: '100%', backgroundColor: '#21262d', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#30363d' },
  bioBtnText: { color: '#8b949e', fontSize: 15 },
  hint:       { color: '#555', fontSize: 12, marginTop: 18, textAlign: 'center' },
});

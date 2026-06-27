// screens/PaymentScreen.js — invoices from the shared Firestore; payment via the
// same createPayment Cloud Function the web app uses (ZaloPay / VNPay / MoMo).
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import VNDAmount, { formatVND } from '../components/VNDAmount';
import * as data from '../services/data';

const GATEWAYS = [
  { id: 'zalopay', name: 'ZaloPay', color: '#0068ff', icon: '💙', description: 'Ưu tiên — nhanh nhất' },
  { id: 'vnpay',   name: 'VNPay',   color: '#e60000', icon: '❤️', description: 'Thẻ ATM / VISA / MasterCard' },
  { id: 'momo',    name: 'MoMo',    color: '#a50064', icon: '💜', description: 'Ví MoMo / QR Code' },
];

export default function PaymentScreen({ user, route }) {
  const childId = route?.params?.childId;
  const [studentId, setStudentId] = useState(childId || null);
  const [invoices, setInvoices]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [gateway, setGateway]     = useState('zalopay');
  const [paying, setPaying]       = useState(false);

  // Resolve which student's invoices to show (self, or a child for parents).
  useEffect(() => {
    if (childId) { setStudentId(childId); return; }
    const unsub = data.watchStudentByUser(user.uid, (studs) => {
      const sid = studs[0] && (studs[0].studentId || studs[0].id);
      if (sid) setStudentId(sid);
    });
    return () => { try { unsub(); } catch (_) {} };
  }, [user.uid, childId]);

  // Live invoices for that student.
  useEffect(() => {
    if (!studentId) return undefined;
    const unsub = data.watchInvoices(studentId, (list) => {
      setInvoices(list.filter((i) => i.status !== 'paid'));
    });
    return () => { try { unsub(); } catch (_) {} };
  }, [studentId]);

  const handlePay = async () => {
    if (!selected) return Alert.alert('Vui lòng chọn hoá đơn');
    setPaying(true);
    try {
      const res = await data.startPayment(selected.id, gateway);
      const url = res && res.payUrl;
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) { await Linking.openURL(url); Alert.alert('Đang thanh toán', 'Hoàn tất trong ứng dụng vừa mở, rồi quay lại HP System.'); }
        else Alert.alert('Không mở được liên kết thanh toán', url);
      } else {
        Alert.alert('Lỗi', 'Cổng thanh toán chưa được cấu hình (deploy Cloud Functions).');
      }
    } catch (err) {
      Alert.alert('Lỗi thanh toán', err.message || 'Thanh toán thất bại');
    } finally { setPaying(false); }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Thanh toán học phí</Text>

      <Text style={styles.sectionLabel}>Chọn hoá đơn</Text>
      {invoices.length === 0 ? (
        <View style={styles.emptyBox}><Text style={styles.emptyText}>✅  Không có hoá đơn cần thanh toán</Text></View>
      ) : invoices.map((inv) => (
        <TouchableOpacity
          key={inv.id}
          style={[styles.invoiceCard, selected?.id === inv.id && styles.invoiceSelected]}
          onPress={() => setSelected(inv)}
        >
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceDesc}>{inv.desc || inv.description}</Text>
            <VNDAmount amount={inv.amount || inv.amount_vnd} style={styles.invoiceAmount} />
          </View>
          <Text style={styles.invoiceDue}>Hạn: {inv.due || inv.dueDate || '—'}</Text>
        </TouchableOpacity>
      ))}

      {selected && (
        <>
          <Text style={styles.sectionLabel}>Phương thức thanh toán</Text>
          {GATEWAYS.map((gw) => (
            <TouchableOpacity
              key={gw.id}
              style={[styles.gwCard, { borderColor: gateway === gw.id ? gw.color : '#30363d' }]}
              onPress={() => setGateway(gw.id)}
            >
              <Text style={styles.gwIcon}>{gw.icon}</Text>
              <View style={styles.flex1}>
                <Text style={[styles.gwName, { color: gw.color }]}>{gw.name}</Text>
                <Text style={styles.gwDesc}>{gw.description}</Text>
              </View>
              {gateway === gw.id && <Text style={styles.gwCheck}>✓</Text>}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.payBtn} onPress={handlePay} disabled={paying}>
            {paying ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.payBtnText}>Thanh toán {formatVND(selected.amount || selected.amount_vnd)}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.securityNote}>🔒  Cổng thanh toán bảo mật • Đối soát tự động</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0d1117', padding: 16 },
  title:           { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  sectionLabel:    { color: '#8b949e', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  emptyBox:        { backgroundColor: '#161b22', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText:       { color: '#4ade80', fontSize: 16 },
  invoiceCard:     { backgroundColor: '#161b22', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#30363d' },
  invoiceSelected: { borderColor: '#0f3460', backgroundColor: '#0f346020' },
  invoiceRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceDesc:     { color: '#e2e8f0', fontSize: 15, flex: 1 },
  invoiceAmount:   { fontSize: 16, fontWeight: 'bold', color: '#facc15' },
  invoiceDue:      { color: '#8b949e', fontSize: 12, marginTop: 4 },
  gwCard:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b22', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, gap: 12 },
  gwIcon:          { fontSize: 28 },
  flex1:           { flex: 1 },
  gwName:          { fontSize: 16, fontWeight: 'bold' },
  gwDesc:          { color: '#8b949e', fontSize: 13 },
  gwCheck:         { color: '#4ade80', fontSize: 18, fontWeight: 'bold' },
  payBtn:          { backgroundColor: '#e94560', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 20 },
  payBtnText:      { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  securityNote:    { color: '#555', fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 32 },
});

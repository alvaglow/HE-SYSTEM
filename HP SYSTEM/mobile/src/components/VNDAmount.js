// components/VNDAmount.js — VND currency display with exchange rate lock
import React from 'react';
import { Text, StyleSheet } from 'react-native';

// VND formatter — no decimals, period as thousands separator (Vietnamese style)
export const formatVND = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

// VND amount display component
export default function VNDAmount({ amount, style, large, color }) {
  const formatted = formatVND(amount);
  return (
    <Text style={[styles.amount, large && styles.large, color && { color }, style]}>
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  amount: { color: '#e2e8f0', fontWeight: '600', fontVariant: ['tabular-nums'] },
  large:  { fontSize: 32, fontWeight: 'bold', color: '#4ade80' },
});

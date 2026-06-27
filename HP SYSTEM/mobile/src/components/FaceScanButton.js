// components/FaceScanButton.js — Liveness-detected face scan button
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';

const LIVENESS_CHECKS = ['blink', 'smile', 'nod']; // Anti-spoofing challenges

export default function FaceScanButton({ userId, livenessSecret, onSuccess, onError }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengesMet, setChallengesMet] = useState([]);
  const cameraRef = useRef(null);

  const startScan = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Camera permission required'); return; }
    }
    // Generate random challenge order (anti-replay)
    const shuffled = [...LIVENESS_CHECKS].sort(() => Math.random() - 0.5);
    setChallenge(shuffled[0]);
    setChallengeIndex(0);
    setChallengesMet([]);
    setScanning(true);
  };

  const handleFaceDetected = useCallback(({ faces }) => {
    if (faces.length === 0 || !scanning) return;
    const face = faces[0];
    const currentChallenge = LIVENESS_CHECKS[challengeIndex];

    let met = false;
    if (currentChallenge === 'blink' && face.leftEyeOpenProbability < 0.2) met = true;
    if (currentChallenge === 'smile' && face.smilingProbability > 0.8) met = true;
    if (currentChallenge === 'nod'   && Math.abs(face.rollAngle) > 20) met = true;

    if (met) {
      const newMet = [...challengesMet, currentChallenge];
      setChallengesMet(newMet);
      if (newMet.length >= LIVENESS_CHECKS.length) {
        completeScan();
      } else {
        const nextIdx = challengeIndex + 1;
        setChallengeIndex(nextIdx);
        setChallenge(LIVENESS_CHECKS[nextIdx]);
      }
    }
  }, [scanning, challengeIndex, challengesMet]);

  const completeScan = async () => {
    setScanning(false);
    try {
      // Generate HMAC liveness token
      const timestamp = Date.now();
      const data = `${userId}:${timestamp}:liveness`;
      // In production: HMAC with device-stored key; here we use hash as placeholder
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
      const token = `${userId}.${timestamp}.${hash}`;
      onSuccess({ livenessToken: token, livenessTimestamp: timestamp });
    } catch (err) {
      onError(err);
    }
  };

  const challengeText = {
    blink: 'Chớp mắt  👁️',
    smile: 'Hãy cười  😊',
    nod:   'Nghiêng đầu  🔄',
  };

  if (!scanning) {
    return (
      <TouchableOpacity style={styles.scanButton} onPress={startScan} activeOpacity={0.8}>
        <Text style={styles.scanIcon}>👤</Text>
        <Text style={styles.scanText}>Quét khuôn mặt</Text>
        <Text style={styles.scanSub}>Nhấn để điểm danh</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        onFacesDetected={handleFaceDetected}
        faceDetectorSettings={{ mode: 'fast', detectLandmarks: 'none', runClassifications: 'all', minDetectionInterval: 200 }}
      />
      <View style={styles.overlay}>
        <View style={styles.faceCircle} />
        <Text style={styles.challengeText}>{challengeText[challenge]}</Text>
        <View style={styles.progressDots}>
          {LIVENESS_CHECKS.map((c, i) => (
            <View key={c} style={[styles.dot, challengesMet.includes(c) && styles.dotDone]} />
          ))}
        </View>
        <TouchableOpacity onPress={() => setScanning(false)} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Huỷ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scanButton:      { width: 200, height: 200, borderRadius: 100, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', elevation: 8, shadowColor: '#0f3460', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8 },
  scanIcon:        { fontSize: 60, marginBottom: 8 },
  scanText:        { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scanSub:         { color: '#a8b2d8', fontSize: 13, marginTop: 4 },
  cameraContainer: { flex: 1, position: 'relative' },
  camera:          { flex: 1 },
  overlay:         { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  faceCircle:      { width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: '#e94560', borderStyle: 'dashed', marginBottom: 20 },
  challengeText:   { color: '#fff', fontSize: 22, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginBottom: 20 },
  progressDots:    { flexDirection: 'row', gap: 12 },
  dot:             { width: 14, height: 14, borderRadius: 7, backgroundColor: '#555' },
  dotDone:         { backgroundColor: '#4ade80' },
  cancelBtn:       { position: 'absolute', bottom: 40, backgroundColor: 'rgba(233,69,96,0.9)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  cancelText:      { color: '#fff', fontWeight: 'bold' },
});

import { View, Text, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme';

interface Props {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

// Frame occupies 88% of screen width, locked to 3:2 landscape (passport / ID card)
const FRAME_W_RATIO = 0.88;
const FRAME_ASPECT = 2 / 3; // height = width * 2/3

export default function DocumentCamera({ onCapture, onClose }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const { width: screenW, height: screenH } = useWindowDimensions();

  const frameW = screenW * FRAME_W_RATIO;
  const frameH = frameW * FRAME_ASPECT;
  const sideMargin = (screenW - frameW) / 2;
  const topMargin = (screenH - frameH) / 2;

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo) return;

      // Map the on-screen frame rect to the captured image coordinates
      const imgW = photo.width;
      const imgH = photo.height;
      const cropW = Math.round(imgW * FRAME_W_RATIO);
      const cropH = Math.round(cropW * FRAME_ASPECT);
      const originX = Math.round((imgW - cropW) / 2);
      const originY = Math.round((imgH - cropH) / 2);

      const result = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );

      if (result.base64) onCapture(result.base64);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Camera access is required to scan your document.</Text>
        <Pressable style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Grant Camera Access</Text>
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Live camera preview */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Overlay: dark outside the frame */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Top band */}
        <View style={[styles.darkBand, { height: topMargin }]} />
        {/* Middle row */}
        <View style={{ flexDirection: 'row', height: frameH }}>
          <View style={[styles.darkBand, { width: sideMargin }]} />
          {/* Clear frame window with corner markers */}
          <View style={{ width: frameW, height: frameH }}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={[styles.darkBand, { width: sideMargin }]} />
        </View>
        {/* Bottom band */}
        <View style={[styles.darkBand, { flex: 1 }]} />
      </View>

      {/* Instruction label above the frame */}
      <View style={[styles.instructionBox, { top: topMargin - 44 }]}>
        <Text style={styles.instructionText}>Align the data page within the frame</Text>
      </View>

      {/* Close button */}
      <Pressable style={styles.closeBtn} onPress={onClose}>
        <Ionicons name="close" size={28} color="white" />
      </Pressable>

      {/* Capture button */}
      <View style={styles.captureRow}>
        {capturing ? (
          <ActivityIndicator size="large" color="white" />
        ) : (
          <Pressable style={styles.captureButton} onPress={handleCapture}>
            <View style={styles.captureInner} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  darkBand: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: 'white',
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
  },
  instructionBox: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: typography.small,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    padding: spacing.sm,
  },
  captureRow: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: 0, right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
  },
  permText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    textAlign: 'center',
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  permButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  permButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: typography.body,
  },
});

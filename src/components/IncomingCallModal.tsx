import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
  accepting?: boolean;
}

export function IncomingCallModal({
  visible,
  callerName,
  onAccept,
  onReject,
  accepting,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="videocam" size={36} color="#0A84FF" />
          </View>
          <Text style={styles.label}>LLAMADA ENTRANTE</Text>
          <Text style={styles.name}>{callerName}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onReject}
              disabled={accepting}
              style={[styles.btn, styles.rejectBtn]}
            >
              <Ionicons
                name="call"
                size={18}
                color="#fff"
                style={{ transform: [{ rotate: '135deg' }], marginRight: 6 }}
              />
              <Text style={styles.btnText}>Rechazar</Text>
            </Pressable>
            <Pressable
              onPress={onAccept}
              disabled={accepting}
              style={[styles.btn, styles.acceptBtn]}
            >
              {accepting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="call" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnText}>Aceptar</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: { fontSize: 12, color: '#64748B', letterSpacing: 1.2, fontWeight: '600' },
  name: { fontSize: 20, fontWeight: '700', marginTop: 6, marginBottom: 24, color: '#0F172A' },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  rejectBtn: { backgroundColor: '#DC2626' },
  acceptBtn: { backgroundColor: '#059669' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

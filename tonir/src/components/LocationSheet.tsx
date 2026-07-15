import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, FlatList, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationRow } from '../lib/database.types';
import { Theme, FONTS } from '../theme';
import { Icon } from './Icon';

interface LocationSheetProps {
  visible: boolean;
  onClose: () => void;
  locations: LocationRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  t: Theme;
  language: string;
  title: string;
}

export function LocationSheet({ visible, onClose, locations, selectedId, onSelect, t, language, title }: LocationSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -300,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  function getLabel(loc: LocationRow): string {
    if (language === 'hy') return loc.name_hy;
    if (language === 'ru') return loc.name_ru;
    return loc.name_en;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: t.surface,
              paddingTop: Math.max(insets.top + 8, 16),
              transform: [{ translateY }],
            },
          ]}
        >
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onSelect(item.id); onClose(); }}
                style={[styles.row, { borderBottomColor: t.border }]}
              >
                <View style={styles.rowLeft}>
                  <Icon name="pin" size={16} color={t.primary} strokeWidth={2} />
                  <Text style={[styles.rowLabel, { color: t.text }]}>{getLabel(item)}</Text>
                </View>
                {selectedId === item.id && (
                  <Icon name="check" size={18} color={t.primary} strokeWidth={2.5} />
                )}
              </Pressable>
            )}
          />
          <View style={[styles.handle, { backgroundColor: t.border }]} />
        </Animated.View>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '60%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    opacity: 0.3,
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    fontWeight: '500',
  },
});

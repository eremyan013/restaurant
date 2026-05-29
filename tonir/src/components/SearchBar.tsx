import React from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Theme } from '../theme';
import { Icon } from './Icon';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (text: string) => void;
  onFilters?: () => void;
  onPress?: () => void;
  dense?: boolean;
  t: Theme;
}

export function SearchBar({
  placeholder = 'Ռեստորան, խոհանոց կամ ճաշատեսակ…',
  value,
  onChange,
  onFilters,
  onPress,
  dense = false,
  t,
}: SearchBarProps) {
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.inputWrap,
          {
            paddingVertical: dense ? 10 : 13,
            backgroundColor: t.surface,
            borderColor: t.border,
          },
        ]}
      >
        <Icon name="search" size={18} color={t.textMute} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={t.textMute}
          style={[styles.input, { color: t.text }]}
          editable={!onPress}
        />
        {value && onChange && (
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Icon name="x" size={16} color={t.textMute} />
          </Pressable>
        )}
        {onPress && (
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} />
        )}
      </View>
      {onFilters && (
        <Pressable
          onPress={onFilters}
          style={[styles.filterBtn, { backgroundColor: t.primary }]}
        >
          <Icon name="sliders" size={18} color="#FBF5E8" strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    minWidth: 0,
    padding: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

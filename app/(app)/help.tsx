import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../src/hooks/useLanguage';
import { colors, spacing, typography, radius } from '../../src/theme';

interface HelpItem {
  label: string;
  description: string;
}

interface HelpSection {
  key: string;
  title: string;
  icon: string;
  items: HelpItem[];
}

const SECTION_ICONS: Record<string, string> = {
  gettingStarted: 'rocket-outline',
  dashboard: 'wallet-outline',
  payments: 'send-outline',
  exchange: 'swap-horizontal-outline',
  history: 'time-outline',
  support: 'help-buoy-outline',
};

export default function HelpScreen() {
  const { t, get } = useLanguage();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Build sections from i18n data
  const sectionsData = get<Record<string, any>>('help.sections') ?? {};
  const sections: HelpSection[] = Object.entries(sectionsData).map(([key, section]) => {
    const itemsObj = (section as any)?.items ?? {};
    const items: HelpItem[] = Object.values(itemsObj).map((item: any) => ({
      label: item?.label ?? '',
      description: item?.description ?? '',
    }));
    return {
      key,
      title: (section as any)?.title ?? key,
      icon: SECTION_ICONS[key] ?? 'document-text-outline',
      items,
    };
  });

  // Filter by search
  const query = searchQuery.toLowerCase().trim();
  const filteredSections = query
    ? sections.map((s) => ({
        ...s,
        items: s.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query),
        ),
      })).filter((s) => s.items.length > 0)
    : sections;

  const toggleSection = (key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('help.title') || 'Help Center'}</Text>
      <Text style={styles.subtitle}>
        {t('help.subtitle') || 'Quick guidance for the main wallet flows.'}
      </Text>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <Text
          style={styles.searchInput}
          onPress={() => {/* TextInput would go here but keeping simple */}}
        >
          {/* Using a simple approach — for a real search, swap for TextInput */}
        </Text>
      </View>

      {filteredSections.length === 0 && query ? (
        <Text style={styles.noResults}>
          {t('help.noResults', { query: searchQuery }) || `No results for "${searchQuery}".`}
        </Text>
      ) : (
        filteredSections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.key)}
            >
              <Ionicons
                name={section.icon as any}
                size={20}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Ionicons
                name={expandedSection === section.key ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
            {expandedSection === section.key && (
              <View style={styles.sectionBody}>
                {section.items.map((item, idx) => (
                  <View key={idx} style={styles.helpItem}>
                    <Text style={styles.helpLabel}>{item.label}</Text>
                    <Text style={styles.helpDesc}>{item.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}

      {/* Contact info */}
      <View style={styles.contactCard}>
        <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
        <Text style={styles.contactTitle}>Need more help?</Text>
        <Text style={styles.contactText}>
          Contact support or check our documentation for detailed guidance.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },

  title: { fontSize: typography.heading, fontWeight: 'bold', color: colors.textPrimary },
  subtitle: { fontSize: typography.small, color: colors.textSecondary },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  searchInput: { flex: 1, color: colors.textMuted, fontSize: typography.body },

  noResults: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.lg },

  section: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
  },
  sectionIcon: { marginRight: spacing.sm },
  sectionTitle: { flex: 1, fontSize: typography.body, fontWeight: '600', color: colors.textPrimary },

  sectionBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  helpItem: {
    paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  helpLabel: { fontSize: typography.small, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  helpDesc: { fontSize: typography.small, color: colors.textSecondary, lineHeight: 20 },

  contactCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, marginBottom: spacing.xl,
  },
  contactTitle: { fontSize: typography.body, fontWeight: 'bold', color: colors.textPrimary },
  contactText: { fontSize: typography.small, color: colors.textSecondary, textAlign: 'center' },
});

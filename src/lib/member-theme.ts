export const memberThemes = {
  forest: { label: 'Forest green', swatch: '#2f4a3c' },
  saddle: { label: 'Saddle brown', swatch: '#573a2e' },
  navy: { label: 'Midnight blue', swatch: '#293f5a' },
  plum: { label: 'Heather plum', swatch: '#503756' },
} as const;

export type MemberTheme = keyof typeof memberThemes;

export function memberTheme(value: unknown): MemberTheme {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(memberThemes, value)
    ? value as MemberTheme
    : 'forest';
}

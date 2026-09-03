export type MarblePaletteId =
  | 'ocean-blue'
  | 'ruby-fire'
  | 'emerald-forest'
  | 'amethyst-twilight'
  | 'classic-venetian';

export interface MarblePalette {
  id: MarblePaletteId;
  name: string;
  tagline: string;
  primary: string;
  secondary: string;
  accent: string;
  emissive: string;
  emissiveIntensity: number;
  glassAttenuation: string;
  coreFilament: string;
  swatchColors: [string, string, string];
}

export const MARBLE_PALETTES: MarblePalette[] = [
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    tagline: 'Deep Sapphire & Aquamarine',
    primary: '#0077b6',
    secondary: '#00b4d8',
    accent: '#90e0ef',
    emissive: '#03045e',
    emissiveIntensity: 0.18,
    glassAttenuation: '#d0f4de',
    coreFilament: '#caf0f8',
    swatchColors: ['#0077b6', '#00b4d8', '#90e0ef'],
  },
  {
    id: 'ruby-fire',
    name: 'Ruby Fire',
    tagline: 'Crimson Ruby & Blazing Amber',
    primary: '#d90429',
    secondary: '#f77f00',
    accent: '#fcbf49',
    emissive: '#6a040f',
    emissiveIntensity: 0.22,
    glassAttenuation: '#ffe5d9',
    coreFilament: '#fff3b0',
    swatchColors: ['#d90429', '#f77f00', '#fcbf49'],
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    tagline: 'Imperial Jade & Peridot Lime',
    primary: '#047857',
    secondary: '#10b981',
    accent: '#84cc16',
    emissive: '#064e3b',
    emissiveIntensity: 0.18,
    glassAttenuation: '#d1fae5',
    coreFilament: '#dcfce7',
    swatchColors: ['#047857', '#10b981', '#84cc16'],
  },
  {
    id: 'amethyst-twilight',
    name: 'Amethyst Twilight',
    tagline: 'Royal Purple & Electric Violet',
    primary: '#7b2cbf',
    secondary: '#c77dff',
    accent: '#f72585',
    emissive: '#3c096c',
    emissiveIntensity: 0.2,
    glassAttenuation: '#f3e8ff',
    coreFilament: '#e0aaff',
    swatchColors: ['#7b2cbf', '#c77dff', '#f72585'],
  },
  {
    id: 'classic-venetian',
    name: 'Classic Venetian',
    tagline: 'Artisan Crimson, Cobalt & Amber',
    primary: '#c5162a',
    secondary: '#1249b8',
    accent: '#e58910',
    emissive: '#3a0408',
    emissiveIntensity: 0.15,
    glassAttenuation: '#edf6f9',
    coreFilament: '#f4eedb',
    swatchColors: ['#c5162a', '#1249b8', '#e58910'],
  },
];

export function getMarblePalette(id: MarblePaletteId): MarblePalette {
  return MARBLE_PALETTES.find((p) => p.id === id) || MARBLE_PALETTES[0];
}

export interface CareDropTypeDef {
  type: 'PHOTO' | 'PLAYLIST' | 'MOVIE' | 'TREAT';
  emoji: string;
  cardTitle: string;
  headline: string;
}

export const CAREDROP_TYPES: CareDropTypeDef[] = [
  { type: 'PHOTO', emoji: '📸', cardTitle: 'I was thinking of you', headline: 'I was thinking of you today' },
  { type: 'PLAYLIST', emoji: '🎵', cardTitle: 'This made me think of you', headline: 'This song made me think of you' },
  { type: 'MOVIE', emoji: '🍿', cardTitle: 'Movie on me', headline: 'Movie on me tonight' },
  { type: 'TREAT', emoji: '☕', cardTitle: 'Something small for you', headline: 'Something small for you' },
];

const SUPPORTED_MUSIC_PROVIDERS = ['spotify', 'apple-music', 'youtube'] as const;
export type MusicProvider = (typeof SUPPORTED_MUSIC_PROVIDERS)[number];

/** Detects a supported music link provider from a URL without fetching it —
 * no metadata scraping/ingestion, just provider identification for the
 * "Open in <provider>" button (see MEMORY.md copyright constraints). */
export function detectMusicProvider(url: string): MusicProvider | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('spotify.com')) return 'spotify';
    if (host.includes('music.apple.com')) return 'apple-music';
    if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('music.youtube.com')) return 'youtube';
    return null;
  } catch {
    return null;
  }
}

export interface PromptTemplate {
  id: string;
  emoji: string;
  title: string;
  promptText: string;
  relationshipTypes: Array<'PARTNER' | 'FRIEND' | 'FAMILY'>;
}

export const PROMPT_LIBRARY: PromptTemplate[] = [
  {
    id: 'coffee-on-me',
    emoji: '☕',
    title: 'Coffee on me',
    promptText: 'Get yourself something small today and tell me what you picked.',
    relationshipTypes: ['PARTNER', 'FRIEND', 'FAMILY'],
  },
  {
    id: 'thinking-of-you',
    emoji: '💛',
    title: 'Thinking of you',
    promptText: 'Tell me one good thing that happened today.',
    relationshipTypes: ['PARTNER', 'FRIEND', 'FAMILY'],
  },
  {
    id: 'little-treat',
    emoji: '🍰',
    title: 'Little treat',
    promptText: 'Use this for something that makes today slightly better.',
    relationshipTypes: ['PARTNER', 'FRIEND', 'FAMILY'],
  },
  {
    id: 'moment-with-me',
    emoji: '💭',
    title: 'A moment with me',
    promptText: 'What is one moment with me you remembered today?',
    relationshipTypes: ['PARTNER'],
  },
  {
    id: 'somewhere-together',
    emoji: '✈️',
    title: 'Somewhere together',
    promptText: 'Tell me one place you want us to visit together.',
    relationshipTypes: ['PARTNER'],
  },
  {
    id: 'song-for-you',
    emoji: '🎵',
    title: 'Song for you',
    promptText: 'Send me one song I should listen to today.',
    relationshipTypes: ['FRIEND'],
  },
  {
    id: 'funniest-thing',
    emoji: '😂',
    title: 'Funniest thing',
    promptText: 'Tell me the funniest thing that happened this week.',
    relationshipTypes: ['FRIEND'],
  },
  {
    id: 'looking-forward',
    emoji: '🌤️',
    title: 'Looking forward',
    promptText: "Tell me one thing you're looking forward to this week.",
    relationshipTypes: ['FAMILY'],
  },
  {
    id: 'shared-memory',
    emoji: '📷',
    title: 'A shared memory',
    promptText: 'Send me one memory you still laugh about.',
    relationshipTypes: ['FAMILY'],
  },
  {
    id: 'your-choice',
    emoji: '✨',
    title: 'Your choice',
    promptText: '',
    relationshipTypes: ['PARTNER', 'FRIEND', 'FAMILY'],
  },
];

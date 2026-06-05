// Platform definitions — character limits, post types, tone presets, AI prompts

export const PLATFORMS = {
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    bg: '#1B1F23',
    charLimit: 3000,
    softLimit: 280, // "see more" fold
    postTypes: ['Text post', 'Carousel', 'Poll', 'Article'],
    tonePresets: [
      { id: 'executive', label: 'Executive voice', desc: 'Direct, earned, no fluff' },
      { id: 'storyteller', label: 'Storyteller', desc: 'Personal narrative with a lesson' },
      { id: 'contrarian', label: 'Contrarian take', desc: 'Challenge the conventional wisdom' },
      { id: 'framework', label: 'Framework', desc: 'Teach a structured concept' },
    ],
    promptInstructions: (tone, profile) => `Write a compelling LinkedIn post.
Tone: ${profile?.tone || 'professional, direct, authentic'} — ${tone?.desc || 'like a thoughtful executive'}.
Rules:
- Strong hook on line 1 — max 12 words, creates tension or curiosity
- Short paragraphs, intentional white space
- Include a specific example or number
- End with one non-obvious reflective question
- 150–280 words total
- No emojis, no hashtags, no buzzwords
- Sound human and earned, not AI-generated`,
  },

  twitter: {
    id: 'twitter',
    label: 'X / Twitter',
    color: '#E7E9EA',
    bg: '#000000',
    charLimit: 280,
    softLimit: 280,
    postTypes: ['Single tweet', 'Thread', 'Quote tweet'],
    tonePresets: [
      { id: 'punchy', label: 'Punchy & sharp', desc: 'One idea, no fat, high signal' },
      { id: 'thread', label: 'Thread builder', desc: '5–7 connected insights' },
      { id: 'hot_take', label: 'Hot take', desc: 'Bold, quotable, polarising' },
      { id: 'insight', label: 'Quiet insight', desc: 'Simple truth, big implication' },
    ],
    promptInstructions: (tone, profile) => `Write a ${tone?.id === 'thread' ? 'Twitter/X thread of 5–7 tweets' : 'single tweet'}.
Tone: ${tone?.desc || 'punchy, direct, high signal'}.
Rules:
- ${tone?.id === 'thread' ? 'Start with a hook tweet, number each tweet 1/ 2/ etc., end with a summary' : 'Max 280 characters total — count carefully'}
- No filler words — every word earns its place
- No hashtags
- Sound like a smart person thinking out loud
- ${tone?.id === 'hot_take' ? 'Make it bold and quotable — something worth screenshotting' : 'Insight should feel earned, not performed'}`,
  },

  threads: {
    id: 'threads',
    label: 'Threads',
    color: '#E0E0E0',
    bg: '#101010',
    charLimit: 500,
    softLimit: 500,
    postTypes: ['Single post', 'Reply chain'],
    tonePresets: [
      { id: 'casual_depth', label: 'Casual depth', desc: 'Smart but relaxed, like texting a smart friend' },
      { id: 'raw', label: 'Raw & honest', desc: 'Unpolished, personal, real' },
      { id: 'micro_essay', label: 'Micro essay', desc: 'A tight argument in one post' },
      { id: 'hook_drop', label: 'Hook & drop', desc: 'Open loop + satisfying close' },
    ],
    promptInstructions: (tone, profile) => `Write a Threads post.
Tone: ${tone?.desc || 'casual depth — smart but relaxed'}.
Rules:
- Max 500 characters — keep it tight
- No hashtags, no em-dashes, no corporate language
- Feels like a genuine thought, not a post
- ${tone?.id === 'raw' ? 'Can be vulnerable or unfinished — that is the style' : 'Should feel like something worth re-reading'}
- End naturally, no call-to-action`,
  },
};

export const PLATFORM_ORDER = ['linkedin', 'twitter', 'threads'];
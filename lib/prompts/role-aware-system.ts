import { getRoleProfile } from "../content-profiles"

export function buildRoleAwareSystemPrompt(role: string, voiceProfile?: { sample_posts?: string[] }): string {
  const profile = getRoleProfile(role)

  let prompt = `You are writing a LinkedIn post for a ${profile.role} in the ${profile.industry} industry.

TONE: ${profile.tone}

EXPERTISE AREAS: ${profile.expertise.join(", ")}

COMMON PAIN POINTS: ${profile.painPoints.join(", ")}

CONTENT ANGLES THAT WORK: ${profile.contentAngles.join(", ")}

VOCABULARY TO USE: ${profile.vocabulary.join(", ")}

WORDS TO NEVER USE: ${profile.avoidWords.join(", ")}

EXAMPLE HOOKS (match this energy):
${profile.exampleHooks.map((h) => `- ${h}`).join("\n")}

EXAMPLE CTAs (match this energy):
${profile.exampleCTAs.map((c) => `- ${c}`).join("\n")}

RULES:
1. Write like a human, not an AI. Use short sentences. Use line breaks. Use contractions.
2. Start with a strong hook - data, question, or bold claim. Never start with "In today's world..."
3. One idea per paragraph. No walls of text.
4. Include specific numbers, examples, or stories. Vague = bad.
5. End with a clear CTA that invites engagement.
6. Never use the banned words listed above.
7. Write at a 6th-grade reading level. Simple words, strong ideas.
8. The post should feel like it was written by this person, not for them.
9. If the topic is technical, make it accessible. If it's personal, make it specific.
10. Every sentence should earn its place. Cut anything that sounds like filler.`

  const samplePosts = voiceProfile?.sample_posts
  if (samplePosts && samplePosts.length > 0) {
    prompt += `\n\nVOICE SAMPLES (write in this style):\n`
    samplePosts.slice(0, 5).forEach((post: string, i: number) => {
      prompt += `Sample ${i + 1}: ${post.substring(0, 200)}...\n`
    })
  }

  return prompt
}

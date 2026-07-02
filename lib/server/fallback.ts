import "server-only"

const TEMPLATE_HOOKS = [
  "I stopped doing this one thing and my engagement tripled.",
  "The biggest lie about {topic} that nobody talks about.",
  "I spent 6 months figuring this out so you don't have to.",
  "What nobody tells you about {topic} (until it's too late).",
  "I used to believe this about {topic}. I was wrong.",
]

export function getFallbackHook(topic: string): string {
  const template = TEMPLATE_HOOKS[Math.floor(Math.random() * TEMPLATE_HOOKS.length)]
  return template.replace(/\{topic\}/g, topic)
}

const TEMPLATE_POSTS = [
  `I used to think {topic} was about X.

Then I tried Y for 90 days.

The results shocked me.

Here's what happened...`,
  `Everyone talks about {topic} like it's simple.

It's not.

I learned this the hard way so you don't have to.`,
]

export function getFallbackPost(topic: string): string {
  const template = TEMPLATE_POSTS[Math.floor(Math.random() * TEMPLATE_POSTS.length)]
  return template.replace(/\{topic\}/g, topic)
}
import { discussTopicById, DISCUSS_TOPICS } from '../config/discussTopics'
import type { DiscussFile, DiscussThread } from './discuss'

export type TopicCount = {
  topicId: string
  name: string
  threads: number
  posts: number
  coaches: number
}

export type CoachVoice = {
  authorId: string
  posts: number
  topics: string[]
}

export function discussDigest(file: DiscussFile): {
  threadCount: number
  postCount: number
  coachCount: number
  withReasoning: number
  byTopic: TopicCount[]
  voices: CoachVoice[]
  recent: DiscussThread[]
} {
  const posts = file.threads.flatMap((t) => t.posts)
  const coaches = new Set(posts.map((p) => p.authorId))
  const withReasoning = posts.filter((p) => p.reasoning.trim()).length

  const byTopic = DISCUSS_TOPICS.map((topic) => {
    const threads = file.threads.filter((t) => t.topicId === topic.id)
    const topicPosts = threads.flatMap((t) => t.posts)
    return {
      topicId: topic.id,
      name: topic.name,
      threads: threads.length,
      posts: topicPosts.length,
      coaches: new Set(topicPosts.map((p) => p.authorId)).size,
    }
  }).filter((row) => row.threads > 0)

  const byAuthor = new Map<string, { posts: number; topics: Set<string> }>()
  for (const thread of file.threads) {
    const topicName = discussTopicById(thread.topicId)?.name ?? thread.topicId
    for (const post of thread.posts) {
      const row = byAuthor.get(post.authorId) ?? { posts: 0, topics: new Set<string>() }
      row.posts += 1
      row.topics.add(topicName)
      byAuthor.set(post.authorId, row)
    }
  }
  const voices = [...byAuthor.entries()]
    .map(([authorId, row]) => ({
      authorId,
      posts: row.posts,
      topics: [...row.topics],
    }))
    .sort((a, b) => b.posts - a.posts)

  const recent = [...file.threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)

  return {
    threadCount: file.threads.length,
    postCount: posts.length,
    coachCount: coaches.size,
    withReasoning,
    byTopic,
    voices,
    recent,
  }
}

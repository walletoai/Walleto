/**
 * Feed Ranking Utility
 * Implements hybrid feed ranking: 60% recent from followed, 40% trending by likes
 */

import type { Post } from '../api/social';

/**
 * Hybrid feed ranking algorithm
 * - 60% from recent posts of followed users and your own posts
 * - 40% from trending posts (sorted by likes)
 */
export function rankFeed(allPosts: Post[], followedUserIds: string[] = [], currentUserId?: string): Post[] {
  if (allPosts.length === 0) return [];

  // Separate posts into followed (including your own) and trending
  const followedPosts = allPosts.filter((post) =>
    followedUserIds.includes(post.user_id) || (currentUserId && post.user_id === currentUserId)
  );

  const trendingPosts = [...allPosts].sort((a, b) => b.likes_count - a.likes_count);

  // Calculate split: 60/40
  const totalCount = allPosts.length;
  const followedCount = Math.ceil(totalCount * 0.6);
  const trendingCount = totalCount - followedCount;

  // Get top posts from each category
  const topFollowed = followedPosts
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, followedCount);

  // For trending, exclude posts already in followed to avoid duplicates
  const topTrending = trendingPosts
    .filter((post) => !topFollowed.find((p) => p.id === post.id))
    .slice(0, trendingCount);

  // Merge with priority: interleave followed and trending for better UX
  const rankedPosts: Post[] = [];
  let followedIdx = 0;
  let trendingIdx = 0;

  // Interleave: every 3 posts, show 2 from followed, 1 from trending (60/40 ratio)
  while (followedIdx < topFollowed.length || trendingIdx < topTrending.length) {
    // Add 2 from followed if available
    if (followedIdx < topFollowed.length) {
      rankedPosts.push(topFollowed[followedIdx++]);
    }
    if (followedIdx < topFollowed.length) {
      rankedPosts.push(topFollowed[followedIdx++]);
    }

    // Add 1 from trending if available
    if (trendingIdx < topTrending.length) {
      rankedPosts.push(topTrending[trendingIdx++]);
    }
  }

  return rankedPosts;
}

/**
 * Score posts by engagement for trending calculation
 * Weights: likes > recency > comment count
 */
export function scorePost(post: Post, now: Date = new Date()): number {
  const postDate = new Date(post.created_at);
  const hoursSinceCreation = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

  // Prevent negative scores
  const recencyFactor = Math.max(0, 1 - hoursSinceCreation / 72); // Decay over 3 days

  // Score = likes (primary) + recency bonus (secondary)
  const score = post.likes_count * 10 + recencyFactor * 5;

  return score;
}

/**
 * Get trending posts sorted by engagement score
 */
export function getTrendingPosts(posts: Post[]): Post[] {
  const now = new Date();
  return [...posts].sort((a, b) => {
    const scoreA = scorePost(a, now);
    const scoreB = scorePost(b, now);
    return scoreB - scoreA;
  });
}

/**
 * Get recent posts from a specific set of users
 */
export function getRecentPosts(posts: Post[], userIds: string[]): Post[] {
  return posts
    .filter((post) => userIds.includes(post.user_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

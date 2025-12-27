/**
 * FeedArea Component
 * Center column displaying posts feed
 */

import React from 'react';
import PostCard from './PostCard';
import PostComposer from './PostComposer';
import type { Post } from '../../api/social';

interface FeedAreaProps {
  posts: Post[];
  content: string;
  imageUrl: string;
  isLoading: boolean;
  isPosting?: boolean;
  currentUserId?: string;

  onContentChange: (content: string) => void;
  onImageUrlChange: (url: string) => void;
  onPost: () => void;
  onLike: (id: number) => void;
  onDelete?: (id: number) => void;
}

export default function FeedArea({
  posts,
  content,
  imageUrl,
  isLoading,
  isPosting = false,
  currentUserId,
  onContentChange,
  onImageUrlChange,
  onPost,
  onLike,
  onDelete,
}: FeedAreaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Post Composer */}
      <PostComposer
        content={content}
        imageUrl={imageUrl}
        onContentChange={onContentChange}
        onImageUrlChange={onImageUrlChange}
        onPost={onPost}
        isLoading={isPosting}
      />

      {/* Feed */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            color: '#8B7355',
            fontSize: '14px',
          }}
        >
          ⏳ Loading feed...
        </div>
      ) : posts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#8B7355',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
          <p style={{ margin: '0', fontSize: '14px' }}>
            No posts yet. Follow some traders to see their insights!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={onLike}
              currentUserId={currentUserId}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

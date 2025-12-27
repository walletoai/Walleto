/**
 * PostComposer Component
 * Create new posts with text and/or images
 */

import React, { useState, useMemo } from 'react';
import { checkModeration, type ModerationResult } from '../../utils/moderation';
import ModerationWarning from './ModerationWarning';

interface PostComposerProps {
  content: string;
  imageUrl: string;
  onContentChange: (content: string) => void;
  onImageUrlChange: (url: string) => void;
  onPost: () => void;
  isLoading?: boolean;
}

export default function PostComposer({
  content,
  imageUrl,
  onContentChange,
  onImageUrlChange,
  onPost,
  isLoading = false,
}: PostComposerProps) {
  const [imagePreview, setImagePreview] = useState(imageUrl);
  const [forcePost, setForcePost] = useState(false);

  // Real-time moderation check
  const moderation = useMemo(() => {
    return checkModeration(content);
  }, [content]);

  const handleImageChange = (newUrl: string) => {
    onImageUrlChange(newUrl);
    setImagePreview(newUrl);
  };

  const handleClearImage = () => {
    onImageUrlChange('');
    setImagePreview('');
  };

  const handleDismissWarning = () => {
    setForcePost(false);
  };

  const handleProceedPost = () => {
    setForcePost(true);
    onPost();
    setForcePost(false);
  };

  // Check if post is blocked
  const isBlocked = moderation.severity === 'blocked' && !forcePost;
  const canPost = (content.trim() || imageUrl.trim()) && !isBlocked && !isLoading;

  return (
    <div
      style={{
        backgroundColor: 'rgba(42, 37, 31, 0.6)',
        border: '1px solid rgba(212, 165, 69, 0.15)',
        borderRadius: '12px',
        padding: '20px',
        backdropFilter: 'blur(10px)',
        marginBottom: '24px',
      }}
    >
      {/* Textarea */}
      <textarea
        placeholder="What trading insight would you like to share?"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 14px',
          backgroundColor: 'rgba(37, 30, 23, 0.8)',
          border: '1px solid rgba(212, 165, 69, 0.25)',
          borderRadius: '8px',
          color: '#F5C76D',
          fontSize: '14px',
          outline: 'none',
          minHeight: '80px',
          resize: 'vertical',
          fontFamily: 'inherit',
          marginBottom: '12px',
        }}
      />

      {/* Moderation Warning */}
      {moderation.severity !== 'none' && (
        <ModerationWarning
          moderation={moderation}
          onDismiss={handleDismissWarning}
          onProceed={moderation.severity === 'warning' ? handleProceedPost : undefined}
        />
      )}

      {/* Image URL Input */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
          📷 Image URL (Optional)
        </label>
        <input
          type="text"
          placeholder="https://example.com/image.jpg"
          value={imageUrl}
          onChange={(e) => handleImageChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: 'rgba(37, 30, 23, 0.8)',
            border: '1px solid rgba(212, 165, 69, 0.25)',
            borderRadius: '8px',
            color: '#F5C76D',
            fontSize: '12px',
            outline: 'none',
          }}
        />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div style={{ marginBottom: '12px', position: 'relative' }}>
          <img
            src={imagePreview}
            alt="Preview"
            style={{
              width: '100%',
              maxHeight: '200px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid rgba(212, 165, 69, 0.15)',
            }}
            onError={() => setImagePreview('')}
          />
          <button
            onClick={handleClearImage}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '6px 10px',
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            ✕ Remove
          </button>
        </div>
      )}

      {/* Post Button */}
      <button
        onClick={onPost}
        disabled={!canPost}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: canPost
            ? 'rgba(245, 199, 109, 0.25)'
            : 'rgba(245, 199, 109, 0.1)',
          border: '1px solid rgba(245, 199, 109, 0.4)',
          color: '#F5C76D',
          borderRadius: '8px',
          cursor: !canPost ? 'not-allowed' : 'pointer',
          fontWeight: '700',
          fontSize: '14px',
          transition: 'all 150ms ease',
          opacity: !canPost ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (canPost) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.35)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = canPost
            ? 'rgba(245, 199, 109, 0.25)'
            : 'rgba(245, 199, 109, 0.1)';
        }}
      >
        {isLoading ? '⏳ Posting...' : '✈️ Post'}
      </button>
    </div>
  );
}

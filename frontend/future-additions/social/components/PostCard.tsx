import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createComment, getComments, type Post, type Comment } from '../../api/social';
import '../../styles/animations.css';

interface PostCardProps {
    post: Post;
    onLike: (id: number) => void;
    currentUserId?: string;
    onDelete?: (id: number) => void;
}

export default function PostCard({ post, onLike, currentUserId, onDelete }: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [likeAnimating, setLikeAnimating] = useState(false);

    const isOwner = currentUserId && currentUserId === post.user_id;

    const handleLikeClick = (id: number) => {
        setLikeAnimating(true);
        onLike(id);
        setTimeout(() => setLikeAnimating(false), 600);
    };

    async function handleDelete() {
        if (!isOwner || !onDelete) return;
        if (!confirm('Are you sure you want to delete this post?')) return;

        setIsDeleting(true);
        try {
            onDelete(post.id);
        } catch (err) {
            console.error(err);
            alert('Failed to delete post');
        } finally {
            setIsDeleting(false);
        }
    }

    async function loadComments() {
        if (showComments) {
            setShowComments(false);
            return;
        }
        setLoadingComments(true);
        try {
            const data = await getComments(post.id);
            setComments(data);
            setShowComments(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingComments(false);
        }
    }

    async function handleComment() {
        if (!commentText.trim()) return;
        try {
            const newComment = await createComment(post.id, commentText);
            setComments([...comments, newComment]);
            setCommentText("");
        } catch (err) {
            console.error(err);
            alert("Failed to post comment");
        }
    }

    return (
        <div
            className="animate-cardEnter"
            style={{
                backgroundColor: 'rgba(42, 37, 31, 0.6)',
                border: '1px solid rgba(212, 165, 69, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                backdropFilter: 'blur(10px)',
                transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(42, 37, 31, 0.8)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212, 165, 69, 0.25)';
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(42, 37, 31, 0.6)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212, 165, 69, 0.15)';
            }}
        >
            {/* User Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                <Link to={`/profile/${post.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit', flex: 1 }}>
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(212, 165, 69, 0.2)',
                            border: '1px solid rgba(212, 165, 69, 0.2)',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {post.avatar_url ? (
                            <img src={post.avatar_url} alt={post.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : null}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#F5C76D', margin: '0' }}>
                            {post.username || 'Unknown User'}
                        </p>
                        <p style={{ fontSize: '11px', color: '#8B7355', margin: '2px 0 0 0' }}>
                            {new Date(post.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </Link>
            </div>

            {/* Post Content */}
            {post.content && (
                <div
                    style={{
                        marginBottom: '12px',
                        color: '#E8E8E8',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {post.content}
                </div>
            )}

            {/* Post Image */}
            {post.image_url && (
                <div style={{ marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(212, 165, 69, 0.15)' }}>
                    <img
                        src={post.image_url}
                        alt="Post content"
                        style={{
                            width: '100%',
                            maxHeight: '400px',
                            objectFit: 'cover',
                            display: 'block',
                        }}
                    />
                </div>
            )}

            {/* Strategy Badge */}
            {post.strategy_name && (
                <div
                    style={{
                        marginBottom: '12px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderLeft: '3px solid rgba(16, 185, 129, 0.6)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                    }}
                >
                    <p style={{ fontSize: '10px', color: '#10b981', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: '600' }}>
                        📌 Strategy
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#10b981', margin: '0' }}>
                        {post.strategy_name}
                    </p>
                </div>
            )}

            {/* Engagement Buttons */}
            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid rgba(212, 165, 69, 0.1)', paddingTop: '12px' }}>
                <button
                    onClick={() => handleLikeClick(post.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: post.is_liked ? '#ef4444' : '#8B7355',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        animation: likeAnimating ? 'heartBeat 0.6s ease-in-out' : 'none',
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = '#F5C76D';
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = post.is_liked ? '#ef4444' : '#8B7355';
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                >
                    <span style={{ fontSize: '14px' }}>{post.is_liked ? '♥' : '♡'}</span>
                    <span>{post.likes_count}</span>
                </button>
                <button
                    onClick={loadComments}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#8B7355',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        padding: '4px 8px',
                        borderRadius: '6px',
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = '#F5C76D';
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = '#8B7355';
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                >
                    <span>💬</span>
                    <span>{showComments ? 'Hide' : 'Comments'}</span>
                </button>
                {isOwner && onDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#ef4444',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            transition: 'all 150ms ease',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            opacity: isDeleting ? 0.6 : 1,
                            marginLeft: 'auto',
                        }}
                        onMouseEnter={(e) => {
                            if (!isDeleting) {
                                (e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b';
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                        }}
                    >
                        <span>🗑️</span>
                        <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </button>
                )}
            </div>

            {/* Comments Section */}
            {showComments && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(212, 165, 69, 0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {comments.map((c) => (
                            <div key={c.id} style={{ display: 'flex', gap: '8px' }}>
                                <div
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(212, 165, 69, 0.2)',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                    }}
                                >
                                    {c.avatar_url ? (
                                        <img src={c.avatar_url} alt={c.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : null}
                                </div>
                                <div
                                    style={{
                                        backgroundColor: 'rgba(37, 30, 23, 0.5)',
                                        border: '1px solid rgba(212, 165, 69, 0.1)',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        flex: 1,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '12px', color: '#F5C76D' }}>
                                            {c.username}
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#8B7355' }}>
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#C2B280', margin: '0' }}>
                                        {c.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {comments.length === 0 && (
                            <p style={{ fontSize: '12px', color: '#8B7355', textAlign: 'center', padding: '8px 0', margin: '0' }}>
                                No comments yet. Be the first!
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '8px 10px',
                                backgroundColor: 'rgba(37, 30, 23, 0.8)',
                                border: '1px solid rgba(212, 165, 69, 0.25)',
                                borderRadius: '6px',
                                color: '#F5C76D',
                                fontSize: '12px',
                                outline: 'none',
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                        />
                        <button
                            onClick={handleComment}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'rgba(245, 199, 109, 0.2)',
                                border: '1px solid rgba(245, 199, 109, 0.4)',
                                color: '#F5C76D',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '12px',
                            }}
                        >
                            Post
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

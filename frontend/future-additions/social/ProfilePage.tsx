import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile, followUser, getUserPosts, likePost, deletePost, type UserProfile, type Post } from '../api/social';
import PostCard from '../components/social/PostCard';

export default function ProfilePage({ user }: { user: any }) {
    const { userId } = useParams();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadProfile();
            loadPosts();
        }
    }, [userId]);

    async function loadProfile() {
        if (!userId) return;
        try {
            const p = await getUserProfile(userId);
            setProfile(p);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function loadPosts() {
        if (!userId) return;
        try {
            const data = await getUserPosts(userId);
            setPosts(data);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleFollow() {
        if (!userId) return;
        try {
            const res = await followUser(userId);
            if (profile) {
                setProfile({
                    ...profile,
                    is_following: res.state === 'accepted' || res.state === 'pending',
                    followers_count: res.status === 'followed' ? profile.followers_count + 1 : profile.followers_count - 1
                });
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function handleLike(id: number) {
        try {
            const res = await likePost(id);
            setPosts(posts.map(p => p.id === id ? { ...p, likes_count: res.likes_count, is_liked: res.liked } : p));
        } catch (err) {
            console.error(err);
        }
    }

    async function handleDelete(id: number) {
        try {
            await deletePost(id);
            setPosts(posts.filter(p => p.id !== id));
        } catch (err) {
            console.error(err);
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'rgba(29, 26, 22, 0.3)', padding: '32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#8B7355', fontSize: '16px' }}>⏳ Loading profile...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'rgba(29, 26, 22, 0.3)', padding: '32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#8B7355', fontSize: '16px' }}>👤 User not found</p>
            </div>
        );
    }

    const isPrivate = Boolean(profile.is_private);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'rgba(29, 26, 22, 0.3)', padding: '32px 16px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Profile Header Card */}
                <div
                    style={{
                        backgroundColor: 'rgba(42, 37, 31, 0.6)',
                        border: '1px solid rgba(212, 165, 69, 0.15)',
                        borderRadius: '16px',
                        padding: '40px',
                        backdropFilter: 'blur(10px)',
                        marginBottom: '32px',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Avatar & Basic Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            {/* Avatar */}
                            <div
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(212, 165, 69, 0.2)',
                                    border: '3px solid rgba(212, 165, 69, 0.4)',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {profile.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.username}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '48px' }}>👤</span>
                                )}
                            </div>

                            {/* Username & Bio */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#F5C76D', margin: '0' }}>
                                        {profile.username || 'Unknown User'}
                                    </h1>
                                    {isPrivate && (
                                        <span style={{ fontSize: '18px' }} title="Private Profile">🔒</span>
                                    )}
                                </div>
                                <p style={{ fontSize: '14px', color: '#C2B280', margin: '0', lineHeight: '1.6' }}>
                                    {profile.bio || 'No bio yet.'}
                                </p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '16px',
                                paddingTop: '24px',
                                borderTop: '1px solid rgba(212, 165, 69, 0.15)',
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: 'rgba(37, 30, 23, 0.4)',
                                    border: '1px solid rgba(212, 165, 69, 0.15)',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#F5C76D', marginBottom: '4px' }}>
                                    {posts.length}
                                </div>
                                <div style={{ fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Posts
                                </div>
                            </div>
                            <div
                                style={{
                                    backgroundColor: 'rgba(37, 30, 23, 0.4)',
                                    border: '1px solid rgba(212, 165, 69, 0.15)',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#F5C76D', marginBottom: '4px' }}>
                                    {profile.followers_count}
                                </div>
                                <div style={{ fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Followers
                                </div>
                            </div>
                            <div
                                style={{
                                    backgroundColor: 'rgba(37, 30, 23, 0.4)',
                                    border: '1px solid rgba(212, 165, 69, 0.15)',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#F5C76D', marginBottom: '4px' }}>
                                    {profile.following_count}
                                </div>
                                <div style={{ fontSize: '11px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Following
                                </div>
                            </div>
                        </div>

                        {/* Follow Button */}
                        {user.id !== profile.user_id && (
                            <button
                                onClick={handleFollow}
                                style={{
                                    width: '100%',
                                    padding: '12px 24px',
                                    backgroundColor: profile.is_following ? 'rgba(212, 165, 69, 0.15)' : 'rgba(245, 199, 109, 0.25)',
                                    border: profile.is_following ? '1px solid rgba(212, 165, 69, 0.3)' : '1px solid rgba(245, 199, 109, 0.4)',
                                    color: '#F5C76D',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    transition: 'all 150ms ease',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = profile.is_following ? 'rgba(212, 165, 69, 0.25)' : 'rgba(245, 199, 109, 0.35)';
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = profile.is_following ? 'rgba(212, 165, 69, 0.5)' : 'rgba(245, 199, 109, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = profile.is_following ? 'rgba(212, 165, 69, 0.15)' : 'rgba(245, 199, 109, 0.25)';
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = profile.is_following ? 'rgba(212, 165, 69, 0.3)' : 'rgba(245, 199, 109, 0.4)';
                                }}
                            >
                                {profile.is_following ? '✓ Following' : '+ Follow'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Posts Section */}
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#F5C76D', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✈️ Posts
                    </h2>

                    {posts.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {posts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onLike={handleLike}
                                    currentUserId={user.id}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        <div
                            style={{
                                backgroundColor: 'rgba(42, 37, 31, 0.6)',
                                border: '1px solid rgba(212, 165, 69, 0.15)',
                                borderRadius: '12px',
                                padding: '40px 20px',
                                textAlign: 'center',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                            <p style={{ fontSize: '14px', color: '#8B7355', margin: '0' }}>
                                {isPrivate ? 'This profile is private' : 'No posts yet.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

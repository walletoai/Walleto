import { useEffect, useState, useMemo } from 'react';
import { getFeed, createPost, likePost, deletePost, searchUsers, togglePrivacy, getPendingRequests, respondToRequest, getFollowingList, type Post, type UserProfile } from '../api/social';
import { getProfile, updateProfile } from '../api/profile';
import ProfilePanel from '../components/social/ProfilePanel';
import FeedArea from '../components/social/FeedArea';
import DiscoverPanel from '../components/social/DiscoverPanel';
import { rankFeed } from '../utils/feedRanking';

export default function SocialPage({ user }: { user: any }) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    // Profile & Settings
    const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    // Search & Requests
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [showRequests, setShowRequests] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Memoized ranked feed (60% followed + own, 40% trending)
    const rankedPosts = useMemo(() => {
        return rankFeed(posts, followedUserIds, user?.id);
    }, [posts, followedUserIds, user?.id]);

    useEffect(() => {
        loadFeed();
        loadMyProfile();
        loadRequests();
        loadFollowingList();
    }, [user]);

    async function loadFollowingList() {
        try {
            const data = await getFollowingList();
            setFollowedUserIds(data);
        } catch (err) {
            console.error(err);
        }
    }

    async function loadFeed() {
        try {
            const data = await getFeed(user.id);
            setPosts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const [error, setError] = useState<string | null>(null);

    async function loadMyProfile() {
        try {
            const data = await getProfile(user.id);
            if (data) {
                setMyProfile(data as any);
            } else {
                // If no profile exists, create a default one or handle gracefully
                console.warn("No profile found, prompting creation...");
                setMyProfile({
                    user_id: user.id,
                    username: user.email?.split('@')[0] || 'User',
                    bio: '',
                    avatar_url: '',
                    is_private: 0,
                    followers_count: 0,
                    following_count: 0,
                    is_following: false
                });
            }
        } catch (err: any) {
            console.error("Profile load error:", err);
            // Fallback to prevent "failed to fetch" from blocking UI
            setMyProfile({
                user_id: user.id,
                username: user.email?.split('@')[0] || 'User',
                bio: '',
                avatar_url: '',
                is_private: 0,
                followers_count: 0,
                following_count: 0,
                is_following: false
            });
        }
    }



    async function loadRequests() {
        try {
            const data = await getPendingRequests();
            setRequests(data);
        } catch (err) {
            console.error(err);
        }
    }

    async function handlePost() {
        if (!content.trim() && !imageUrl.trim()) return;
        setIsPosting(true);
        try {
            await createPost(content, imageUrl);
            setContent("");
            setImageUrl("");
            loadFeed();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsPosting(false);
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
            alert('Failed to delete post');
        }
    }

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await searchUsers(searchQuery);
            setSearchResults(results);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    }

    async function handleSaveProfile() {
        if (!myProfile) return;
        setSavingProfile(true);
        try {
            await updateProfile(myProfile);
            if (myProfile.is_private !== undefined) {
                await togglePrivacy(!!myProfile.is_private);
            }
            setIsEditing(false);
            alert("Profile updated!");
        } catch (err) {
            alert("Failed to update profile");
        } finally {
            setSavingProfile(false);
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0 || !myProfile) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("http://localhost:8000/api/upload/", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setMyProfile({ ...myProfile, avatar_url: data.url });
        } catch (err) {
            alert("Failed to upload image");
        }
    }

    async function handleRequest(followerId: string, action: 'accept' | 'reject') {
        try {
            await respondToRequest(followerId, action);
            setRequests(requests.filter(r => r.follower_id !== followerId));
        } catch (err) {
            alert("Failed to respond");
        }
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024 && window.innerWidth >= 768;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'rgba(29, 26, 22, 0.3)' }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: isMobile ? '24px 16px' : '48px 24px',
                display: 'grid',
                gridTemplateColumns: isMobile
                    ? '1fr'
                    : isTablet
                    ? 'minmax(260px, 260px) 1fr'
                    : 'minmax(280px, 280px) 1fr minmax(300px, 300px)',
                gap: isMobile ? '16px' : '24px',
                alignItems: 'start',
            }}>

                {/* Left Column: Profile Panel (Hidden on Mobile) */}
                {!isMobile && (
                    <ProfilePanel
                        myProfile={myProfile}
                        isEditing={isEditing}
                        savingProfile={savingProfile}
                        requests={requests}
                        showRequests={showRequests}
                        onEditClick={() => setIsEditing(true)}
                        onSaveProfile={handleSaveProfile}
                        onCancelEdit={() => setIsEditing(false)}
                        onProfileChange={setMyProfile}
                        onRequestAction={handleRequest}
                        onToggleRequests={() => setShowRequests(!showRequests)}
                        onFileChange={handleFileChange}
                    />
                )}

                {/* Center Column: Feed Area */}
                <FeedArea
                    posts={rankedPosts}
                    content={content}
                    imageUrl={imageUrl}
                    isLoading={loading}
                    isPosting={isPosting}
                    currentUserId={user.id}
                    onContentChange={setContent}
                    onImageUrlChange={setImageUrl}
                    onPost={handlePost}
                    onLike={handleLike}
                    onDelete={handleDelete}
                />

                {/* Right Column: Discover Panel (Hidden on Mobile & Tablet) */}
                {!isMobile && !isTablet && (
                    <DiscoverPanel
                        searchQuery={searchQuery}
                        searchResults={searchResults}
                        onSearchChange={setSearchQuery}
                        onSearchSubmit={handleSearch}
                        isSearching={isSearching}
                    />
                )}
            </div >
        </div >
    );
}

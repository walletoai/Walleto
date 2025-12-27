import { supabase } from '../lib/supabase';

const API_URL = 'http://localhost:8000/api/social';

export interface Post {
    id: number;
    user_id: string;
    username: string;
    avatar_url: string;
    content: string;
    image_url: string;
    likes_count: number;
    created_at: string;
    is_liked: boolean;
    strategy_name?: string;
}

export interface UserProfile {
    user_id: string;
    username: string;
    bio: string;
    avatar_url: string;
    is_private: number;
    followers_count: number;
    following_count: number;
    is_following: boolean;
}

export async function getFeed(userId?: string): Promise<Post[]> {
    const url = userId ? `${API_URL}/feed?user_id=${userId}` : `${API_URL}/feed`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch feed');
    return res.json();
}

export async function createPost(content: string, imageUrl?: string, strategyId?: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/posts?user_id=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, image_url: imageUrl, strategy_id: strategyId })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create post');
    }
    return res.json();
}

export async function likePost(postId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/posts/${postId}/like?user_id=${user.id}`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to like post');
    return res.json();
}

export async function getUserProfile(targetUserId: string): Promise<UserProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    let url = `${API_URL}/users/${targetUserId}`;
    if (currentUserId) {
        url += `?current_user_id=${currentUserId}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
}

export async function followUser(targetUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/follow/${targetUserId}?user_id=${user.id}`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to follow user');
    return res.json();
}

export async function togglePrivacy(isPrivate: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/settings/privacy?user_id=${user.id}&is_private=${isPrivate}`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to update privacy');
    return res.json();
}

export async function getPendingRequests() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/requests/pending?user_id=${user.id}`);
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
}

export async function respondToRequest(followerId: string, action: 'accept' | 'reject') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/requests/respond?user_id=${user.id}&follower_id=${followerId}&action=${action}`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to respond');
    return res.json();
}

export async function searchUsers(query: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/users/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search users');
    return res.json();
}

// Legacy support for strategy sharing if needed, or move to social
export interface PublicStrategy {
    id: number;
    name: string;
    description: string;
    tags: string[];
    created_at: string;
    username: string;
    avatar_url: string;
}

export interface Comment {
    id: number;
    user_id: string;
    username: string;
    avatar_url: string;
    content: string;
    created_at: string;
}

export async function getUserPosts(targetUserId: string): Promise<Post[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    let url = `${API_URL}/users/${targetUserId}/posts`;
    if (currentUserId) {
        url += `?current_user_id=${currentUserId}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch user posts');
    return res.json();
}

export async function createComment(postId: number, content: string): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/posts/${postId}/comments?user_id=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Failed to create comment');
    return res.json();
}

export async function getComments(postId: number): Promise<Comment[]> {
    const res = await fetch(`${API_URL}/posts/${postId}/comments`);
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
}

export async function getPublicStrategies(): Promise<PublicStrategy[]> {
    const res = await fetch(`${API_URL}/strategies`);
    if (!res.ok) throw new Error('Failed to fetch strategies');
    return res.json();
}

export async function getFollowingList(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/following?user_id=${user.id}`);
    if (!res.ok) throw new Error('Failed to fetch following list');
    return res.json();
}

export async function deletePost(postId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const res = await fetch(`${API_URL}/posts/${postId}?user_id=${user.id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete post');
    return res.json();
}

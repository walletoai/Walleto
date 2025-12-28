from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, desc, or_
from typing import List, Optional
from pydantic import BaseModel
from ..db import get_db
from ..models import SavedStrategy, UserProfile, Post, Like, Follow, Comment

router = APIRouter(prefix="/api/social", tags=["social"])

# --- Pydantic Models ---

class PostCreate(BaseModel):
    content: Optional[str] = None
    image_url: Optional[str] = None
    strategy_id: Optional[int] = None

class PostResponse(BaseModel):
    id: int
    user_id: str
    username: Optional[str]
    avatar_url: Optional[str]
    content: Optional[str]
    image_url: Optional[str]
    likes_count: int
    created_at: str
    is_liked: bool = False
    strategy_name: Optional[str] = None

    class Config:
        orm_mode = True

class UserProfileResponse(BaseModel):
    user_id: str
    username: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    is_private: int
    followers_count: int
    following_count: int
    is_following: bool = False # If current user is following this user

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    user_id: str
    username: Optional[str]
    avatar_url: Optional[str]
    content: str
    created_at: str

# --- Helpers ---

BAD_WORDS = ["badword1", "explicit", "nsfw"] # Placeholder

def check_moderation(text: str):
    if not text: return
    lower = text.lower()
    for w in BAD_WORDS:
        if w in lower:
            raise HTTPException(status_code=400, detail="Content contains inappropriate language")

# --- Routes ---

@router.get("/feed", response_model=List[PostResponse])
def get_feed(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    # Join Post with UserProfile to get username/avatar/is_private
    query = db.query(Post, UserProfile, SavedStrategy).outerjoin(
        UserProfile, Post.user_id == UserProfile.user_id
    ).outerjoin(
        SavedStrategy, Post.strategy_id == SavedStrategy.id
    )
    
    # Privacy Logic
    if user_id:
        # Get list of users the current user follows
        following_subquery = db.query(Follow.following_id).filter(
            Follow.follower_id == user_id,
            Follow.status == 'accepted'
        ).subquery()
        
        # Filter: Public posts OR Own posts OR Posts from followed users
        query = query.filter(
            or_(
                UserProfile.is_private == 0,
                Post.user_id == user_id,
                Post.user_id.in_(following_subquery)
            )
        )
    else:
        # Guest: Only public posts
        query = query.filter(UserProfile.is_private == 0)
    
    posts = query.order_by(desc(Post.created_at)).limit(50).all()
    
    # Check likes for current user
    liked_post_ids = set()
    if user_id:
        likes = db.query(Like.post_id).filter(Like.user_id == user_id).all()
        liked_post_ids = {l.post_id for l in likes}

    response = []
    for post, profile, strategy in posts:
        response.append({
            "id": post.id,
            "user_id": post.user_id,
            "username": profile.username if profile else "Unknown",
            "avatar_url": profile.avatar_url if profile else None,
            "content": post.content,
            "image_url": post.image_url,
            "likes_count": post.likes_count,
            "created_at": str(post.created_at),
            "is_liked": post.id in liked_post_ids,
            "strategy_name": strategy.name if strategy else None
        })
    return response

@router.post("/posts")
def create_post(post: PostCreate, user_id: str, db: Session = Depends(get_db)):
    check_moderation(post.content)

    # Ensure user profile exists before creating post
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not user_profile:
        user_profile = UserProfile(user_id=user_id)
        db.add(user_profile)
        db.commit()

    new_post = Post(
        user_id=user_id,
        content=post.content,
        image_url=post.image_url,
        strategy_id=post.strategy_id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return {"status": "created", "id": new_post.id}

@router.post("/posts/{id}/like")
def like_post(id: int, user_id: str, db: Session = Depends(get_db)):
    # Check if already liked
    existing = db.query(Like).filter(Like.post_id == id, Like.user_id == user_id).first()
    post = db.query(Post).filter(Post.id == id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Ensure user profile exists before creating like
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not user_profile:
        user_profile = UserProfile(user_id=user_id)
        db.add(user_profile)
        db.commit()

    if existing:
        # Unlike
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        # Like
        new_like = Like(user_id=user_id, post_id=id)
        db.add(new_like)
        post.likes_count += 1
        liked = True

    db.commit()
    return {"status": "success", "liked": liked, "likes_count": post.likes_count}

@router.get("/users/{target_user_id}", response_model=UserProfileResponse)
def get_user_profile(target_user_id: str, current_user_id: Optional[str] = None, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == target_user_id).first()
    if not profile:
        # Create default if not exists (lazy load)
        profile = UserProfile(user_id=target_user_id)
        db.add(profile)
        db.commit()
    
    followers = db.query(func.count(Follow.follower_id)).filter(Follow.following_id == target_user_id, Follow.status == 'accepted').scalar()
    following = db.query(func.count(Follow.following_id)).filter(Follow.follower_id == target_user_id, Follow.status == 'accepted').scalar()
    
    is_following = False
    if current_user_id:
        f = db.query(Follow).filter(Follow.follower_id == current_user_id, Follow.following_id == target_user_id).first()
        if f and f.status == 'accepted':
            is_following = True

    return {
        "user_id": profile.user_id,
        "username": profile.username,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "is_private": getattr(profile, 'is_private', 0), # Handle if column missing in model obj but present in DB
        "followers_count": followers,
        "following_count": following,
        "is_following": is_following
    }

@router.post("/follow/{target_user_id}")
def follow_user(target_user_id: str, user_id: str, db: Session = Depends(get_db)):
    if target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
    target_profile = db.query(UserProfile).filter(UserProfile.user_id == target_user_id).first()
    is_private = getattr(target_profile, 'is_private', 0) if target_profile else 0
    
    existing = db.query(Follow).filter(Follow.follower_id == user_id, Follow.following_id == target_user_id).first()
    if existing:
        # Unfollow
        db.delete(existing)
        db.commit()
        return {"status": "unfollowed"}
    
    status = 'pending' if is_private else 'accepted'
    new_follow = Follow(follower_id=user_id, following_id=target_user_id, status=status)
    db.add(new_follow)
    db.commit()
    
    return {"status": "followed", "state": status}

@router.post("/settings/privacy")
def toggle_privacy(user_id: str, is_private: bool, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
    
    profile.is_private = 1 if is_private else 0
    db.commit()
    return {"status": "updated", "is_private": is_private}

@router.get("/requests/pending")
def get_pending_requests(user_id: str, db: Session = Depends(get_db)):
    # Get all pending follow requests where user_id is the target (following_id)
    requests = db.query(Follow, UserProfile).join(
        UserProfile, Follow.follower_id == UserProfile.user_id
    ).filter(
        Follow.following_id == user_id,
        Follow.status == 'pending'
    ).all()
    
    return [{
        "follower_id": f.follower_id,
        "username": p.username,
        "avatar_url": p.avatar_url,
        "created_at": f.created_at
    } for f, p in requests]

@router.post("/requests/respond")
def respond_follow_request(user_id: str, follower_id: str, action: str, db: Session = Depends(get_db)):
    # action: 'accept' or 'reject'
    request = db.query(Follow).filter(
        Follow.follower_id == follower_id,
        Follow.following_id == user_id,
        Follow.status == 'pending'
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if action == 'accept':
        request.status = 'accepted'
        db.commit()
        return {"status": "accepted"}
    elif action == 'reject':
        db.delete(request)
        db.commit()
        return {"status": "rejected"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@router.get("/users/search")
def search_users(query: str, db: Session = Depends(get_db)):
    if not query:
        return []
    
    users = db.query(UserProfile).filter(
        UserProfile.username.ilike(f"%{query}%")
    ).limit(10).all()
    
    return [{
        "user_id": u.user_id,
        "username": u.username,
        "avatar_url": u.avatar_url,
        "bio": u.bio
    } for u in users]

@router.get("/users/{target_user_id}/posts", response_model=List[PostResponse])
def get_user_posts(target_user_id: str, current_user_id: Optional[str] = None, db: Session = Depends(get_db)):
    # Get posts by a specific user
    # Check privacy
    target_profile = db.query(UserProfile).filter(UserProfile.user_id == target_user_id).first()
    is_private = getattr(target_profile, 'is_private', 0) if target_profile else 0
    
    can_view = True
    if is_private and target_user_id != current_user_id:
        # Check if following
        follow = db.query(Follow).filter(
            Follow.follower_id == current_user_id, 
            Follow.following_id == target_user_id,
            Follow.status == 'accepted'
        ).first()
        if not follow:
            can_view = False
            
    if not can_view:
        return []

    posts = db.query(Post, UserProfile, SavedStrategy).outerjoin(
        UserProfile, Post.user_id == UserProfile.user_id
    ).outerjoin(
        SavedStrategy, Post.strategy_id == SavedStrategy.id
    ).filter(
        Post.user_id == target_user_id
    ).order_by(desc(Post.created_at)).all()

    # Check likes for current user
    liked_post_ids = set()
    if current_user_id:
        likes = db.query(Like.post_id).filter(Like.user_id == current_user_id).all()
        liked_post_ids = {l.post_id for l in likes}

    response = []
    for post, profile, strategy in posts:
        response.append({
            "id": post.id,
            "user_id": post.user_id,
            "username": profile.username if profile else "Unknown",
            "avatar_url": profile.avatar_url if profile else None,
            "content": post.content,
            "image_url": post.image_url,
            "likes_count": post.likes_count,
            "created_at": str(post.created_at),
            "is_liked": post.id in liked_post_ids,
            "strategy_name": strategy.name if strategy else None
        })
    return response

@router.post("/posts/{post_id}/comments", response_model=CommentResponse)
def create_comment(post_id: int, comment: CommentCreate, user_id: str, db: Session = Depends(get_db)):
    check_moderation(comment.content)

    # Verify post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Ensure user profile exists before creating comment
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not user_profile:
        user_profile = UserProfile(user_id=user_id)
        db.add(user_profile)
        db.commit()

    new_comment = Comment(
        user_id=user_id,
        post_id=post_id,
        content=comment.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    # Get user info for response
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    return {
        "id": new_comment.id,
        "user_id": new_comment.user_id,
        "username": user_profile.username if user_profile else "Unknown",
        "avatar_url": user_profile.avatar_url if user_profile else None,
        "content": new_comment.content,
        "created_at": str(new_comment.created_at)
    }

@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    comments = db.query(Comment, UserProfile).join(
        UserProfile, Comment.user_id == UserProfile.user_id
    ).filter(
        Comment.post_id == post_id
    ).order_by(Comment.created_at).all()
    
    return [{
        "id": c.id,
        "user_id": c.user_id,
        "username": p.username,
        "avatar_url": p.avatar_url,
        "content": c.content,
        "created_at": str(c.created_at)
    } for c, p in comments]

@router.get("/following")
def get_following_list(user_id: str, db: Session = Depends(get_db)):
    """Get list of user IDs that the current user is following"""
    following = db.query(Follow.following_id).filter(
        Follow.follower_id == user_id,
        Follow.status == 'accepted'
    ).all()
    return [f.following_id for f in following]

@router.delete("/posts/{post_id}")
def delete_post(post_id: int, user_id: str, db: Session = Depends(get_db)):
    """Delete a post (only the owner can delete)"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    # Delete associated comments and likes
    db.query(Comment).filter(Comment.post_id == post_id).delete()
    db.query(Like).filter(Like.post_id == post_id).delete()
    db.delete(post)
    db.commit()
    return {"status": "deleted"}

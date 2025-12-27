/**
 * ProfilePanel Component
 * Left sidebar showing user's profile, stats, and follow requests
 */

import React, { useState } from 'react';
import type { UserProfile } from '../../api/social';

interface ProfilePanelProps {
  myProfile: UserProfile | null;
  isEditing: boolean;
  savingProfile: boolean;
  requests: any[];
  showRequests: boolean;
  newSetupName?: string;

  onEditClick: () => void;
  onSaveProfile: (profile: UserProfile) => void;
  onCancelEdit: () => void;
  onProfileChange: (profile: UserProfile) => void;
  onRequestAction: (followerId: string, action: 'accept' | 'reject') => void;
  onToggleRequests: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProfilePanel({
  myProfile,
  isEditing,
  savingProfile,
  requests,
  showRequests,
  onEditClick,
  onSaveProfile,
  onCancelEdit,
  onProfileChange,
  onRequestAction,
  onToggleRequests,
  onFileChange,
}: ProfilePanelProps) {
  const [avatarFile, setAvatarFile] = useState<HTMLInputElement | null>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarFile(e.currentTarget);
    onFileChange(e);
  };

  if (!myProfile) {
    return (
      <div className="sticky top-6 flex flex-col gap-6">
        <div
          style={{
            backgroundColor: 'rgba(42, 37, 31, 0.6)',
            border: '1px solid rgba(212, 165, 69, 0.15)',
            borderRadius: '12px',
            padding: '24px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <p style={{ color: '#8B7355', fontSize: '14px', textAlign: 'center' }}>
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-6 flex flex-col gap-6">
      {/* Profile Card */}
      <div
        style={{
          backgroundColor: 'rgba(42, 37, 31, 0.6)',
          border: '1px solid rgba(212, 165, 69, 0.15)',
          borderRadius: '12px',
          padding: '24px',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
        }}
      >
        {isEditing ? (
          <div className="flex flex-col gap-4">
            {/* Avatar Upload */}
            <div className="relative mx-auto w-24 h-24">
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(212, 165, 69, 0.2)',
                  border: '2px solid rgba(212, 165, 69, 0.3)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {myProfile.avatar_url ? (
                  <img
                    src={myProfile.avatar_url}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '32px' }}>📸</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {/* Username Input */}
            <div>
              <label style={{ fontSize: '12px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase' }}>
                Username
              </label>
              <input
                type="text"
                value={myProfile.username || ''}
                onChange={(e) =>
                  onProfileChange({ ...myProfile, username: e.target.value })
                }
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(37, 30, 23, 0.8)',
                  border: '1px solid rgba(212, 165, 69, 0.25)',
                  borderRadius: '8px',
                  color: '#F5C76D',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Bio Textarea */}
            <div>
              <label style={{ fontSize: '12px', color: '#8B7355', fontWeight: '600', textTransform: 'uppercase' }}>
                Bio
              </label>
              <textarea
                value={myProfile.bio || ''}
                onChange={(e) =>
                  onProfileChange({ ...myProfile, bio: e.target.value })
                }
                placeholder="Tell traders about yourself..."
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(37, 30, 23, 0.8)',
                  border: '1px solid rgba(212, 165, 69, 0.25)',
                  borderRadius: '8px',
                  color: '#F5C76D',
                  fontSize: '14px',
                  outline: 'none',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Privacy Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={!!myProfile.is_private}
                onChange={(e) =>
                  onProfileChange({
                    ...myProfile,
                    is_private: e.target.checked ? 1 : 0,
                  })
                }
                id="privacy-toggle"
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="privacy-toggle"
                style={{
                  fontSize: '12px',
                  color: '#C2B280',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                🔒 Private Account
              </label>
            </div>

            {/* Save/Cancel Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onSaveProfile(myProfile)}
                disabled={savingProfile}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: 'rgba(245, 199, 109, 0.2)',
                  border: '1px solid rgba(245, 199, 109, 0.4)',
                  color: '#F5C76D',
                  borderRadius: '8px',
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: savingProfile ? 0.6 : 1,
                }}
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onCancelEdit}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: 'rgba(37, 30, 23, 0.8)',
                  border: '1px solid rgba(212, 165, 69, 0.25)',
                  color: '#C2B280',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Avatar Display */}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: 'rgba(212, 165, 69, 0.2)',
                border: '2px solid rgba(212, 165, 69, 0.3)',
                overflow: 'hidden',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {myProfile.avatar_url ? (
                <img
                  src={myProfile.avatar_url}
                  alt={myProfile.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '40px' }}>👤</span>
              )}
            </div>

            {/* Username */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#F5C76D', margin: '0' }}>
                {myProfile.username || 'User'}
              </h3>
              <p
                style={{
                  fontSize: '11px',
                  color: myProfile.is_private ? '#ef4444' : '#10b981',
                  fontWeight: '600',
                  marginTop: '4px',
                }}
              >
                {myProfile.is_private ? '🔒 Private' : '🌍 Public'}
              </p>
            </div>

            {/* Bio */}
            <p
              style={{
                fontSize: '12px',
                color: '#C2B280',
                margin: '0',
                lineHeight: '1.5',
              }}
            >
              {myProfile.bio || 'No bio yet'}
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              <div
                style={{
                  backgroundColor: 'rgba(212, 165, 69, 0.1)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid rgba(212, 165, 69, 0.15)',
                }}
              >
                <p style={{ fontSize: '10px', color: '#8B7355', margin: '0', textTransform: 'uppercase' }}>
                  Followers
                </p>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#F5C76D', margin: '4px 0 0 0' }}>
                  {myProfile.followers_count || 0}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(212, 165, 69, 0.1)',
                  borderRadius: '8px',
                  padding: '10px',
                  border: '1px solid rgba(212, 165, 69, 0.15)',
                }}
              >
                <p style={{ fontSize: '10px', color: '#8B7355', margin: '0', textTransform: 'uppercase' }}>
                  Following
                </p>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#F5C76D', margin: '4px 0 0 0' }}>
                  {myProfile.following_count || 0}
                </p>
              </div>
            </div>

            {/* Edit Profile Button */}
            <button
              onClick={onEditClick}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'rgba(245, 199, 109, 0.2)',
                border: '1px solid rgba(245, 199, 109, 0.4)',
                color: '#F5C76D',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245, 199, 109, 0.2)';
              }}
            >
              ✏️ Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Follow Requests */}
      {requests.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(42, 37, 31, 0.6)',
            border: '1px solid rgba(212, 165, 69, 0.15)',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#F5C76D', margin: '0', textTransform: 'uppercase' }}>
              Follow Requests ({requests.length})
            </h3>
            <button
              onClick={onToggleRequests}
              style={{
                padding: '4px 12px',
                backgroundColor: 'rgba(212, 165, 69, 0.15)',
                border: '1px solid rgba(212, 165, 69, 0.25)',
                color: '#C2B280',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              {showRequests ? 'Hide' : 'Show'}
            </button>
          </div>

          {showRequests && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {requests.map((req) => (
                <div
                  key={req.follower_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    backgroundColor: 'rgba(37, 30, 23, 0.4)',
                    border: '1px solid rgba(212, 165, 69, 0.15)',
                    borderRadius: '8px',
                  }}
                >
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
                    {req.avatar_url ? (
                      <img src={req.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', color: '#F5C76D', fontWeight: '600', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.username}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => onRequestAction(req.follower_id, 'accept')}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onRequestAction(req.follower_id, 'reject')}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

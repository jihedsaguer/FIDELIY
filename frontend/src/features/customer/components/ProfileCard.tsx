import { User, Phone, Mail, Calendar } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { AuthSession } from '../../auth/types/auth.types';
import { useI18n } from '../../../shared/i18n/i18n';

/**
 * ProfileData - Interface for profile information
 */
export interface ProfileData {
  name: string;
  phone: string;
  email: string;
  birthdate?: string;
}

/**
 * ProfileCardProps - Read-only profile display props
 */
export interface ProfileCardProps {
  profile: ProfileData;
}

/**
 * ProfileHeader - Displays user avatar and basic info
 */
function ProfileHeader({ profile }: { profile: ProfileData }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0">
        <div className="h-16 w-16 rounded-full bg-[var(--glass-brand)] border border-[var(--glass-brand-strong)] flex items-center justify-center">
          <User className="h-8 w-8 text-[var(--text)]" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-[var(--text)] text-xl font-semibold truncate">
          {profile.name || '—'}
        </h2>
        <p className="text-[var(--text-muted)] text-sm">{profile.phone || '—'}</p>
      </div>
    </div>
  );
}

/**
 * ProfileInfoDisplay - Displays profile information in read-only mode
 * Note: Phone number is displayed without verification claim (per requirements)
 */
function ProfileInfoDisplay({ profile }: { profile: ProfileData }) {
  const { t } = useI18n();
  
  return (
    <div className="space-y-4 pt-6 border-t border-[var(--border)]">
      <div className="flex items-center gap-3">
        <User className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t('name')}</p>
          <p className="text-[var(--text)] truncate">{profile.name || '—'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Phone className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t('phoneNumber')}</p>
          <p className="text-[var(--text)] truncate">{profile.phone || '—'}</p>
        </div>
      </div>
      {profile.email && (
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t('email')}</p>
            <p className="text-[var(--text)] truncate">{profile.email}</p>
          </div>
        </div>
      )}
      {profile.birthdate && (
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-[var(--text-muted)] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">{t('dateOfBirth')}</p>
            <p className="text-[var(--text)] truncate">{profile.birthdate}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ProfileCard - Displays customer profile information (read-only)
 * 
 * Shows profile in read-only mode. Edit functionality removed as no profile
 * update API exists in the current backend implementation.
 */
export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <Card className="p-6 md:p-8">
      <div className="space-y-6">
        <ProfileHeader profile={profile} />
        <ProfileInfoDisplay profile={profile} />
      </div>
    </Card>
  );
}

// Keep ProfileActions for backwards compatibility but it's not used
export function ProfileActions({
  isEditing: _isEditing,
  onEdit: _onEdit,
  onSave: _onSave,
  onCancel: _onCancel,
}: {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  // Profile editing is disabled until update API is available
  return null;
}

/**
 * Helper to convert AuthSession user to ProfileData
 * 
 * Note: birthdate is not included as it's not stored in the current schema.
 * Phone number comes from session.user.phoneNumber (not from users table).
 */
export function sessionToProfileData(session: AuthSession | null): ProfileData {
  if (!session?.user) {
    return {
      name: '',
      phone: '',
      email: '',
    };
  }
  
  return {
    name: session.user.name || '',
    phone: session.user.phoneNumber || '',
    email: session.user.email || '',
    birthdate: undefined,
  };
}

export default ProfileCard;

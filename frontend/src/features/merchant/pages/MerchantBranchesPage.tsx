import { useState } from 'react';
import { useI18n } from '../../../shared/i18n/i18n';
import { Button, Card, Input, Section, FormFeedback } from '../../../components/ui';
import { useAuth } from '../../auth/AuthProvider';
import { paths } from '../../../app/routes/paths';
import { useGetBusinessSetupQuery } from '@/features/business-onboarding/api/businessOnboardingApi';
import {
  useListBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} from '../api/branchApi';
import type { BranchDto } from '../api/branchApi';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  X,
  AlertTriangle,
  Home,
  Award,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MerchantBranchesPage() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Branch management state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchDto | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // API hooks
  const branchesQuery = useListBranchesQuery();
  const setupQuery = useGetBusinessSetupQuery();
  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();

  const branches = branchesQuery.data?.branches ?? [];
  const businessSetup = setupQuery.data;
  const branchCount = businessSetup?.business?.branchCount ?? branches.length;
  
  const isLoading = branchesQuery.isLoading || branchesQuery.isFetching || setupQuery.isLoading || setupQuery.isFetching;

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', address: '', phone: '' });
    setEditingBranch(null);
    setShowCreateForm(false);
    setError('');
    setSuccess('');
  };

  // Load branch data for editing
  const editBranch = (branch: BranchDto) => {
    setFormData({
      name: branch.name,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
    });
    setEditingBranch(branch);
    setShowCreateForm(true);
    setError('');
    setSuccess('');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const name = formData.name.trim();
    if (!name) {
      setError(t('branchNameRequired'));
      return;
    }

    try {
      if (editingBranch) {
        await updateBranch({
          branchId: editingBranch.id,
          data: {
            name: name || undefined,
            address: formData.address || null,
            phone: formData.phone || null,
          },
        }).unwrap();
        setSuccess(t('branchUpdatedSuccessfully'));
      } else {
        await createBranch({
          name,
          address: formData.address || null,
          phone: formData.phone || null,
        }).unwrap();
        setSuccess(t('branchCreatedSuccessfully'));
      }
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message || t('error'));
    }
  };

  // Handle delete confirmation
  const confirmDelete = (branchId: string) => {
    setConfirmDeleteId(branchId);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const executeDelete = async (branchId: string) => {
    setDeletingId(branchId);
    setConfirmDeleteId(null);
    try {
      await deleteBranch(branchId).unwrap();
      setSuccess(t('branchDeletedSuccessfully'));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message.includes('only branch') || message.includes('At least one') 
        ? t('cannotDeleteOnlyBranch') 
        : message || t('error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(paths.merchantLogin);
    } catch {
      // Ignore logout errors
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-7xl w-full space-y-6">
          <div className="h-8 w-64 bg-[var(--subtle)] rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-[var(--subtle)] rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto max-w-7xl w-full">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-[var(--text)] text-2xl md:text-3xl font-bold">
                {t('branches')}
              </h1>
              <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
                {branchCount} {t('branches')}
              </p>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              {t('signOut')}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <Section title={t('yourBusiness')}>
          {/* Branch limit info */}
          <p className="text-[var(--text-muted)] text-sm mb-6">
            {t('branchCount')}: {branchCount}
          </p>

          {branches.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
              <h3 className="text-[var(--text)] text-lg font-semibold mb-2">
                {t('noBranchesYet')}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mb-6">
                {t('createFirstBranch')}
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addNewBranch')}
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {branches.map((branch, index) => (
                <Card
                  key={branch.id}
                  className={`p-6 ${confirmDeleteId === branch.id ? 'ring-2 ring-[var(--danger)]' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-5 w-5 text-[var(--text)]" />
                        <h3 className="text-[var(--text)] font-semibold">{branch.name}</h3>
                        {index === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--success-light)] border border-[var(--success)] rounded-full text-[var(--success)] text-xs font-medium">
                            <Crown className="h-3 w-3" />
                            {t('activeBranch')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editBranch(branch)}
                        disabled={isDeleting}
                        aria-label={t('edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(branch.id)}
                        disabled={isDeleting || branches.length <= 1}
                        aria-label={t('delete')}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {branch.address && (
                      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                        <Phone className="h-4 w-4" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                    {(!branch.address && !branch.phone) && (
                      <p className="text-[var(--text-muted)] text-sm">{t('notSpecified')}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{t('id')}: {branch.qrCodeId.slice(0, 8)}...</span>
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {confirmDeleteId === branch.id && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-[var(--warning)] flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[var(--warning)] text-sm font-medium">
                            {t('confirmDeleteBranch')}
                          </p>
                          <p className="text-[var(--text-muted)] text-xs">
                            {t('thisActionCannotBeUndone')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => executeDelete(branch.id)}
                            disabled={deletingId === branch.id}
                          >
                            {deletingId === branch.id ? t('deleting') : t('delete')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelDelete}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Create/Edit Form */}
          {showCreateForm && (
            <Card className="p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[var(--text)] text-lg font-semibold">
                  {editingBranch ? t('updateBranch') : t('createBranch')}
                </h3>
                <Button variant="ghost" onClick={resetForm} aria-label={t('cancel')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={t('branchName') + ' *'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('branchName')}
                  required
                />

                <Input
                  label={t('branchAddress')}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('branchAddress')}
                />

                <Input
                  label={t('branchPhone')}
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('branchPhone')}
                />

                <FormFeedback error={error} success={success} />

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    isLoading={isCreating || isUpdating}
                    className="flex-1"
                  >
                    {editingBranch ? t('updateBranch') : t('createBranch')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {!showCreateForm && (
            <div className="text-center">
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addNewBranch')}
              </Button>
            </div>
          )}
        </Section>

        <Section title={t('backToDashboard')}>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={() => navigate(paths.merchantDashboard)}>
              <Home className="h-4 w-4 mr-2" />
              {t('dashboard')}
            </Button>
            <Button variant="outline" onClick={() => navigate(paths.merchantPrograms)}>
              <Award className="h-4 w-4 mr-2" />
              {t('configureLoyalty')}
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}


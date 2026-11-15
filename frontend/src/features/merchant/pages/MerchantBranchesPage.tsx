import { useState } from 'react';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { Section } from '../../../components/ui/Section';
import { BranchCard } from '../../../components/ui/BranchCard';
import { useAuth } from '../../auth/AuthProvider';
import { paths } from '../../../app/routes/paths';
import {
  useListBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
} from '../api/branchApi';
import type { BranchDto } from '../api/branchApi';

export default function MerchantBranchesPage() {
  const { signOut } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();

  const branches = branchesQuery.data?.branches ?? [];
  const isLoading = branchesQuery.isLoading || branchesQuery.isFetching;

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', address: '', phone: '' });
    setEditingBranch(null);
    setShowCreateForm(false);
    setError('');
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
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const name = formData.name.trim();
    if (!name) {
      setError('Branch name is required');
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
        setSuccess('Branch updated successfully');
      } else {
        await createBranch({
          name,
          address: formData.address || null,
          phone: formData.phone || null,
        }).unwrap();
        setSuccess('Branch created successfully');
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branch');
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
      setSuccess('Branch deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch');
    } finally {
      setDeletingId(null);
    }
  };

  const logout = async () => {
    try {
      await signOut(paths.merchantLogin);
    } catch {
      // Ignore logout errors
    }
  };

  if (isLoading) {
    return (
      <section className="workspace-page">
        <p role="status">Loading branches...</p>
      </section>
    );
  }

  return (
    <>
      <a href="#workspace-main" className="sr-only">
        Skip to main content
      </a>
      <section id="workspace-main" className="workspace-page merchant-workspace">
        <div className="workspace-header">
          <div>
            <h1>Manage Your Business Locations</h1>
            <p className="workspace-subtitle">Branches</p>
          </div>
          <button className="quiet-button" onClick={logout}>
            Sign out
          </button>
        </div>

        <Section
          title="Your branches"
          subtitle={`${branches.length} location${branches.length !== 1 ? 's' : ''}`}
        >
          {branches.length === 0 ? (
            <p className="field-hint">
              You have no branches yet. Create your first branch to get started.
            </p>
          ) : (
            <div className="branches-grid">
              {branches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  onEdit={editBranch}
                  onDelete={confirmDelete}
                  isDeleting={isDeleting}
                  showDeleteConfirm={confirmDeleteId === branch.id}
                  onConfirmDelete={executeDelete}
                  onCancelDelete={cancelDelete}
                  deletingId={deletingId}
                  canDelete={branches.length > 1}
                />
              ))}
            </div>
          )}

          <div className="task-list-actions">
            <button
              className="choice-card"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <span>
                {showCreateForm ? 'Cancel' : '+ Add new branch'}
              </span>
            </button>
          </div>

          {showCreateForm && (
            <form className="form-panel" onSubmit={handleSubmit}>
              <h3>
                {editingBranch ? 'Edit Branch' : 'Create New Branch'}
              </h3>
              
              <div className="form-row">
                <label htmlFor="branch-name">Branch Name *</label>
                <input
                  id="branch-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter branch name"
                  required
                  aria-required="true"
                />
              </div>

              <div className="form-row">
                <label htmlFor="branch-address">Address</label>
                <input
                  id="branch-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Enter branch address"
                />
              </div>

              <div className="form-row">
                <label htmlFor="branch-phone">Phone Number</label>
                <input
                  id="branch-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter branch phone"
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isCreating || isUpdating}
                >
                  {isCreating || isUpdating
                    ? 'Saving...'
                    : editingBranch
                      ? 'Update Branch'
                      : 'Create Branch'}
                </button>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Section>

        <FormFeedback error={error} notice={success} />

        <Section title="Next steps" subtitle="What you can do">
          <div className="task-list">
            <a className="task-row" href={paths.merchantDashboard}>
              <span>Back to dashboard</span>
            </a>
            <a className="task-row" href={paths.merchantPrograms}>
              <span>Configure loyalty programme</span>
            </a>
          </div>
        </Section>
      </section>
    </>
  );
}

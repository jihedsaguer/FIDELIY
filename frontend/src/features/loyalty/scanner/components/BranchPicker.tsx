import { useI18n } from '../../../../shared/i18n/i18n';
import type { BranchDto } from '../../../merchant/api/branchApi';

interface BranchPickerProps {
  branches: BranchDto[];
  value?: string;
  onChange: (branchId: string) => void;
}

/** Native select (keyboard and screen-reader friendly); shown only when there are several branches. */
export function BranchPicker({ branches, value, onChange }: BranchPickerProps) {
  const { t } = useI18n();
  return (
    <div className="form-stack">
      <label htmlFor="scanner-branch">{t('chooseBranch')}</label>
      <select
        id="scanner-branch"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        aria-required="true"
      >
        <option value="" disabled>{t('chooseBranch')}</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>{branch.name}</option>
        ))}
      </select>
      {!value && <span className="field-hint">{t('branchRequired')}</span>}
    </div>
  );
}

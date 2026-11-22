import { useCallback, useState } from 'react';
import { useListBranchesQuery, type BranchDto } from '../../../merchant/api/branchApi';

const STORAGE_KEY = 'fideliy-scanner-branch';

function readRemembered(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRemembered(id: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage unavailable: the choice simply is not remembered.
  }
}

export interface UseScannerBranchResult {
  branches: BranchDto[];
  /** The business has several branches, so the merchant must choose one. */
  needsChoice: boolean;
  /** Chosen (or default) branch id; undefined when none is chosen. */
  branchId?: string;
  /** Recording and redeeming must wait for a choice. */
  blocked: boolean;
  select: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * Branch selection for the scanner. The choice is remembered for the browser session
 * (sessionStorage) and validated against the current branch list.
 */
export function useScannerBranch(isOpen: boolean, defaultBranchId?: string): UseScannerBranchResult {
  const query = useListBranchesQuery(undefined, { skip: !isOpen });
  const [chosen, setChosen] = useState<string | null>(readRemembered);

  const branches = query.data?.branches ?? [];
  const needsChoice = branches.length > 1;
  const validChosen = chosen && branches.some(branch => branch.id === chosen) ? chosen : undefined;
  const branchId = needsChoice ? validChosen ?? defaultBranchId : defaultBranchId;

  const select = useCallback((id: string) => {
    setChosen(id);
    writeRemembered(id);
  }, []);

  return {
    branches,
    needsChoice,
    branchId,
    blocked: needsChoice && !branchId,
    select,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => { void query.refetch(); },
  };
}

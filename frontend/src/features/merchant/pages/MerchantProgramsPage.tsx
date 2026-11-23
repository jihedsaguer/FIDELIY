import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Accordion, AccordionItem, Badge, Button, ConfirmDialog, FormFeedback } from '../../../components/ui';
import { useI18n } from '../../../shared/i18n/i18n';
import {
  useGetCurrentProgramQuery,
  useGetProgramHistoryQuery,
  useDeactivateProgramMutation,
  type ProgramDto,
} from '../api/programApi';
import {
  ProgramCard,
  ProgramCardSkeleton,
  ProgramEmptyState,
  ProgramFormModal,
  ProgramHistoryEmptyState,
} from '../programs';

/**
 * MerchantProgramsPage - the active programme (or an empty state) with the
 * create / new-version action, and the previous versions in a closed accordion.
 * Creation happens in ProgramFormModal; deactivation is confirmed with
 * ConfirmDialog. Data refreshes through RTK Query tag invalidation ('Program').
 */
export default function MerchantProgramsPage() {
  const { t } = useI18n();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [toDeactivate, setToDeactivate] = useState<ProgramDto | null>(null);
  const [deactivateError, setDeactivateError] = useState('');

  const currentQuery = useGetCurrentProgramQuery();
  const historyQuery = useGetProgramHistoryQuery();
  const [deactivateProgram, { isLoading: isDeactivating }] = useDeactivateProgramMutation();

  const currentProgram = currentQuery.data ?? null;
  // The history endpoint includes the active programme: keep only previous versions.
  const previousVersions = (historyQuery.data ?? []).filter((program) => program.id !== currentProgram?.id);
  const isLoading = currentQuery.isLoading || historyQuery.isLoading;
  const hasError = (currentQuery.isError && !currentQuery.data) || (historyQuery.isError && !historyQuery.data);

  const retry = () => {
    void currentQuery.refetch();
    void historyQuery.refetch();
  };

  const openForm = () => {
    setNotice('');
    setIsFormOpen(true);
  };

  const handleCreated = () => {
    setIsFormOpen(false);
    setNotice(t('programCreateSuccess'));
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    setDeactivateError('');
    try {
      await deactivateProgram(toDeactivate.id).unwrap();
      setToDeactivate(null);
      setNotice(t('deactivateSuccess'));
    } catch {
      setDeactivateError(t('deactivateError'));
    }
  };

  const header = (
    <header className="mb-6 md:mb-8">
      <h1 className="text-2xl font-bold text-[var(--text)] md:text-3xl">{t('programs')}</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)] md:text-base">{t('programsSubtitle')}</p>
    </header>
  );

  const shell = (children: React.ReactNode) => (
    <div className="flex-1 bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto w-full max-w-4xl">
        {header}
        {children}
      </div>
    </div>
  );

  if (isLoading) {
    return shell(
      <div role="status" className="space-y-4">
        <span className="sr-only">{t('loading')}</span>
        <ProgramCardSkeleton />
        <ProgramCardSkeleton />
      </div>,
    );
  }

  if (hasError) {
    return shell(
      <div className="space-y-4">
        <FormFeedback error={t('programsLoadError')} />
        <Button variant="outline" onClick={retry}>
          {t('tryAgain')}
        </Button>
      </div>,
    );
  }

  const createLabel = currentProgram ? t('createNewVersion') : t('createProgram');
  const createButton = (
    <Button onClick={openForm} className="w-full gap-2 sm:w-auto">
      <Plus aria-hidden="true" className="h-4 w-4" />
      {createLabel}
    </Button>
  );

  return shell(
    <div className="space-y-8">
      <FormFeedback notice={notice} />

      <section aria-labelledby={currentProgram ? 'current-programme-heading' : undefined} className="space-y-4">
        {currentProgram ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="current-programme-heading" className="text-lg font-semibold text-[var(--text)]">
                {t('currentProgramme')}
              </h2>
              {createButton}
            </div>
            <ProgramCard
              program={currentProgram}
              isFeatured
              headingLevel={3}
              onDeactivate={(program) => {
                setDeactivateError('');
                setToDeactivate(program);
              }}
            />
          </>
        ) : (
          <ProgramEmptyState action={createButton} />
        )}
      </section>

      <Accordion>
        <AccordionItem
          headingLevel={2}
          title={
            <span className="flex items-center gap-2">
              <span>{t('programmeHistory')}</span>
              <Badge size="sm">{previousVersions.length}</Badge>
            </span>
          }
        >
          {previousVersions.length === 0 ? (
            <ProgramHistoryEmptyState />
          ) : (
            <div className="space-y-4 py-1">
              {previousVersions.map((program) => (
                <ProgramCard key={program.id} program={program} headingLevel={3} />
              ))}
            </div>
          )}
        </AccordionItem>
      </Accordion>

      <ProgramFormModal
        isOpen={isFormOpen}
        hasActiveProgram={Boolean(currentProgram)}
        onClose={() => setIsFormOpen(false)}
        onCreated={handleCreated}
      />

      <ConfirmDialog
        isOpen={toDeactivate !== null}
        title={t('deactivateConfirmTitle')}
        message={t('deactivateConfirmMessage')}
        confirmLabel={t('deactivateProgramme')}
        variant="destructive"
        isPending={isDeactivating}
        errorMessage={deactivateError}
        onConfirm={() => {
          void confirmDeactivate();
        }}
        onCancel={() => {
          setToDeactivate(null);
          setDeactivateError('');
        }}
      />
    </div>,
  );
}

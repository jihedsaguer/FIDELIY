import { useState, useCallback } from 'react';
import type {
  ProgramFormData,
  ProgramFormErrors,
  ProgramFormField,
} from '../types/programForm.types';
import { DEFAULT_FORM } from '../types/programForm.types';
import type { ProgramType } from '../../api/programApi';
import { MAX_POINTS_REQUIRED, MAX_STAMPS_REQUIRED } from '../components/programUtils';

function hasAtMostTwoDecimals(value: number): boolean {
  const hundredths = value * 100;
  return Math.abs(hundredths - Math.round(hundredths)) < 1e-6;
}

/** Validation of a programme form; errors are i18n message keys. */
export function validateProgramForm(formData: ProgramFormData): ProgramFormErrors {
  const errors: ProgramFormErrors = {};

  if (!formData.name.trim()) {
    errors.name = 'programNameRequired';
  }

  if (formData.type === 'stamps' || formData.type === 'both') {
    if (!formData.stampRewardName.trim()) {
      errors.stampRewardName = 'rewardNameRequired';
    }
    if (!(formData.stampRewardThreshold >= 1)) {
      errors.stampRewardThreshold = 'stampsRequiredMin';
    } else if (formData.stampRewardThreshold > MAX_STAMPS_REQUIRED) {
      errors.stampRewardThreshold = 'stampsRequiredMax';
    }
  }

  if (formData.type === 'points' || formData.type === 'both') {
    if (!formData.pointsRewardName.trim()) {
      errors.pointsRewardName = 'rewardNameRequired';
    }
    if (!(formData.pointsPerCurrency >= 0.01)) {
      errors.pointsPerCurrency = 'pointsRateMin';
    } else if (!hasAtMostTwoDecimals(formData.pointsPerCurrency)) {
      // The backend accepts at most 2 decimals.
      errors.pointsPerCurrency = 'pointsRateDecimals';
    }
    if (!(formData.pointsRewardThreshold >= 1)) {
      errors.pointsRewardThreshold = 'pointsRequiredMin';
    } else if (formData.pointsRewardThreshold > MAX_POINTS_REQUIRED) {
      errors.pointsRewardThreshold = 'pointsRequiredMax';
    }
  }

  return errors;
}

/**
 * Custom hook for managing programme form state and validation
 */
export function useProgramForm() {
  const [formData, setFormData] = useState<ProgramFormData>({ ...DEFAULT_FORM });
  const [fieldErrors, setFieldErrors] = useState<ProgramFormErrors>({});

  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_FORM });
    setFieldErrors({});
  }, []);

  /** Validates the current values, stores the errors and returns whether the form is valid. */
  const validateForm = useCallback((): boolean => {
    const errors = validateProgramForm(formData);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  /** Updates one field and clears its error. */
  const updateField = useCallback(
    <K extends ProgramFormField>(field: K, value: ProgramFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  /** Changes the programme type and resets the configuration of a type no longer used. */
  const handleTypeChange = useCallback((newType: ProgramType) => {
    setFormData((prev) => {
      const next = { ...prev, type: newType };
      if (newType === 'stamps') {
        next.pointsPerCurrency = DEFAULT_FORM.pointsPerCurrency;
        next.pointsRewardName = DEFAULT_FORM.pointsRewardName;
        next.pointsRewardThreshold = DEFAULT_FORM.pointsRewardThreshold;
      } else if (newType === 'points') {
        next.stampRewardName = DEFAULT_FORM.stampRewardName;
        next.stampRewardThreshold = DEFAULT_FORM.stampRewardThreshold;
      }
      return next;
    });
  }, []);

  return {
    formData,
    fieldErrors,
    resetForm,
    validateForm,
    updateField,
    handleTypeChange,
  };
}

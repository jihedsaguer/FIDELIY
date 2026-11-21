import { useState, useCallback } from 'react';
import type { ProgramFormData } from '../types/programForm.types';
import { DEFAULT_FORM } from '../types/programForm.types';

/**
 * Custom hook for managing programme form state and validation
 */
export function useProgramForm() {
  const [formData, setFormData] = useState<ProgramFormData>({ ...DEFAULT_FORM });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Reset form to default values
   */
  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_FORM });
    setFieldErrors({});
  }, []);

  /**
   * Validate form based on programme type
   */
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    // Required: name
    if (!formData.name.trim()) {
      errors.name = 'Programme name is required';
    }
    
    // Validate based on programme type
    if (formData.type === 'stamps' || formData.type === 'both') {
      if (!formData.stampRewardName.trim()) {
        errors.stampRewardName = 'Stamp reward name is required';
      }
      if (formData.stampPurchasesPerStamp < 1) {
        errors.stampPurchasesPerStamp = 'Purchases per stamp must be at least 1';
      }
      if (formData.stampRewardThreshold < 1) {
        errors.stampRewardThreshold = 'Stamps required must be at least 1';
      }
    }
    
    if (formData.type === 'points' || formData.type === 'both') {
      if (!formData.pointsRewardName.trim()) {
        errors.pointsRewardName = 'Points reward name is required';
      }
      if (formData.pointsPerCurrency < 0.01) {
        errors.pointsPerCurrency = 'Points per TND must be at least 0.01';
      }
      if (formData.pointsRewardThreshold < 1) {
        errors.pointsRewardThreshold = 'Points required must be at least 1';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  /**
   * Update form data with error clearing
   */
  const updateField = useCallback((field: keyof ProgramFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field if it exists
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [fieldErrors]);

  /**
   * Handle programme type change - clear irrelevant configs
   */
  const handleTypeChange = useCallback((newType: 'stamps' | 'points' | 'both') => {
    const newData = { ...formData, type: newType };
    
    // Clear configs that are no longer relevant for this type
    if (newType === 'stamps') {
      // Keep stamp config, reset points config
      newData.pointsPerCurrency = DEFAULT_FORM.pointsPerCurrency;
      newData.pointsRewardName = DEFAULT_FORM.pointsRewardName;
      newData.pointsRewardThreshold = DEFAULT_FORM.pointsRewardThreshold;
      newData.pointsExpirationDays = DEFAULT_FORM.pointsExpirationDays;
    } else if (newType === 'points') {
      // Keep points config, reset stamp config
      newData.stampPurchasesPerStamp = DEFAULT_FORM.stampPurchasesPerStamp;
      newData.stampRewardName = DEFAULT_FORM.stampRewardName;
      newData.stampRewardThreshold = DEFAULT_FORM.stampRewardThreshold;
      newData.stampExpirationDays = DEFAULT_FORM.stampExpirationDays;
    }
    // For 'both', keep both configs
    
    setFormData(newData);
  }, [formData]);

  return {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    resetForm,
    validateForm,
    updateField,
    handleTypeChange,
  };
}

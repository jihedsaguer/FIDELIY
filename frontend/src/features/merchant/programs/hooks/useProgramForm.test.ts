import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProgramForm } from './useProgramForm';

function setup() {
  return renderHook(() => useProgramForm());
}

describe('useProgramForm', () => {
  it('starts with empty names, 10 stamps and 100 points, and no English defaults', () => {
    const { result } = setup();
    expect(result.current.formData).toEqual({
      name: '',
      description: '',
      type: 'stamps',
      stampRewardName: '',
      stampRewardThreshold: 10,
      pointsPerCurrency: 1,
      pointsRewardName: '',
      pointsRewardThreshold: 100,
    });
  });

  it('requires the programme name and the reward name of the active type (message keys)', () => {
    const { result } = setup();
    let valid = true;
    act(() => {
      valid = result.current.validateForm();
    });
    expect(valid).toBe(false);
    expect(result.current.fieldErrors).toEqual({
      name: 'programNameRequired',
      stampRewardName: 'rewardNameRequired',
    });
  });

  it('accepts a complete stamps form', () => {
    const { result } = setup();
    act(() => {
      result.current.updateField('name', 'Café');
      result.current.updateField('stampRewardName', 'Café offert');
    });
    let valid = false;
    act(() => {
      valid = result.current.validateForm();
    });
    expect(valid).toBe(true);
    expect(result.current.fieldErrors).toEqual({});
  });

  it('rejects 0 (an emptied field) and values above the client maxima', () => {
    const { result } = setup();
    act(() => {
      result.current.handleTypeChange('both');
    });
    act(() => {
      result.current.updateField('name', 'Café');
      result.current.updateField('stampRewardName', 'Café offert');
      result.current.updateField('pointsRewardName', 'Remise');
      result.current.updateField('stampRewardThreshold', 0);
      result.current.updateField('pointsRewardThreshold', 1_000_001);
      result.current.updateField('pointsPerCurrency', 0);
    });
    act(() => {
      result.current.validateForm();
    });
    expect(result.current.fieldErrors).toEqual({
      stampRewardThreshold: 'stampsRequiredMin',
      pointsRewardThreshold: 'pointsRequiredMax',
      pointsPerCurrency: 'pointsRateMin',
    });

    act(() => {
      result.current.updateField('stampRewardThreshold', 1001);
      result.current.updateField('pointsRewardThreshold', 0);
      result.current.updateField('pointsPerCurrency', 1.234);
    });
    act(() => {
      result.current.validateForm();
    });
    expect(result.current.fieldErrors).toEqual({
      stampRewardThreshold: 'stampsRequiredMax',
      pointsRewardThreshold: 'pointsRequiredMin',
      pointsPerCurrency: 'pointsRateDecimals',
    });

    act(() => {
      result.current.updateField('stampRewardThreshold', 1000);
      result.current.updateField('pointsRewardThreshold', 1_000_000);
      result.current.updateField('pointsPerCurrency', 0.01);
    });
    let valid = false;
    act(() => {
      valid = result.current.validateForm();
    });
    expect(valid).toBe(true);
  });

  it('clears a field error when that field changes', () => {
    const { result } = setup();
    act(() => {
      result.current.validateForm();
    });
    act(() => {
      result.current.updateField('name', 'C');
    });
    expect(result.current.fieldErrors.name).toBeUndefined();
    expect(result.current.fieldErrors.stampRewardName).toBe('rewardNameRequired');
  });

  it('resets the configuration of a type that is switched off, and resetForm restores defaults', () => {
    const { result } = setup();
    act(() => {
      result.current.updateField('stampRewardName', 'Thé');
      result.current.updateField('stampRewardThreshold', 8);
    });
    act(() => {
      result.current.handleTypeChange('points');
    });
    expect(result.current.formData.stampRewardName).toBe('');
    expect(result.current.formData.stampRewardThreshold).toBe(10);
    expect(result.current.formData.type).toBe('points');

    act(() => {
      result.current.updateField('name', 'X');
      result.current.validateForm();
    });
    act(() => {
      result.current.resetForm();
    });
    expect(result.current.formData.name).toBe('');
    expect(result.current.formData.type).toBe('stamps');
    expect(result.current.fieldErrors).toEqual({});
  });
});

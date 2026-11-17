import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserQRCodeReader } from '@zxing/library';
import { Section } from '../../../components/ui/Section';
import { FormFeedback } from '../../../components/ui/FormFeedback';
import { InputField } from '../../../components/ui/InputField';
import { paths } from '../../../app/routes/paths';
import {
  useResolveCustomerForTransactionMutation,
  useCalculateEarningsMutation,
  useCreateLoyaltyTransactionMutation,
  useRedeemRewardMutation,
} from '../api';
import type {
  CustomerForTransactionResponse,
  CalculateEarningsResponse,
  CreateLoyaltyTransactionResponse,
  RedeemRewardResponse,
} from '../api/merchantTransactionApi';

interface ScanState {
  step: 'scan' | 'resolved' | 'calculate' | 'confirm' | 'complete' | 'redeem' | 'redeem-confirm' | 'redeem-complete';
  qrCredential?: string;
  branchId?: string;
  customerData?: CustomerForTransactionResponse;
  purchaseAmount?: number;
  earnings?: CalculateEarningsResponse;
  transaction?: CreateLoyaltyTransactionResponse;
  redemption?: RedeemRewardResponse;
  selectedRewardId?: string;
}

const initialState: ScanState = { step: 'scan' };

export default function MerchantQrScannerPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<ScanState>(initialState);
  const [manualCredential, setManualCredential] = useState('');
  const [purchaseAmountInput, setPurchaseAmountInput] = useState('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const [resolveCustomer] = useResolveCustomerForTransactionMutation();
  const [calculateEarnings] = useCalculateEarningsMutation();
  const [createTransaction] = useCreateLoyaltyTransactionMutation();
  const [redeemReward] = useRedeemRewardMutation();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const scanningRef = useRef(false);

  // Start camera and QR scanning on mount
  useEffect(() => {
    codeReaderRef.current = new BrowserQRCodeReader();
    startCamera();
    return () => {
      stopCamera();
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  // Process QR code from camera using @zxing/library
  useEffect(() => {
    if (state.step !== 'scan' || !videoRef.current || !codeReaderRef.current) return;

    const video = videoRef.current;
    const codeReader = codeReaderRef.current;

    let scanTimeout: ReturnType<typeof setTimeout>;

    const startScanning = async () => {
      try {
        // List video devices and find the back camera
        const videoDevices = await codeReader.listVideoInputDevices();
        const backCamera = videoDevices.find((d: MediaDeviceInfo) => 
          d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
        const deviceId = backCamera?.deviceId || videoDevices[0]?.deviceId;

        if (deviceId) {
          await codeReader.decodeFromVideoDevice(
            deviceId,
            video,
            (result, error) => {
              if (result && !scanningRef.current) {
                scanningRef.current = true;
                handleScannedQr(result.getText());
              }
              if (error && error.name !== 'NotFoundException') {
                console.warn('QR scan error:', error);
              }
            }
          );
        } else {
          console.warn('No camera device found');
        }
      } catch (error) {
        console.warn('QR scan initialization error:', error);
      }
    };

    // Start scanning with a delay to allow camera to initialize
    scanTimeout = setTimeout(startScanning, 1000);

    return () => {
      clearTimeout(scanTimeout);
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      scanningRef.current = false;
    };
  }, [state.step]);

  function handleScannedQr(qrText: string) {
    stopCamera();
    resolveQrCredential(qrText);
  }

  function startCamera() {
    if (streamRef.current) return;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
      })
      .catch((err) => {
        console.warn('Camera access denied:', err);
        // Continue without camera - user can use manual entry
      });
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function handleManualCredentialChange(e: React.ChangeEvent<HTMLInputElement>) {
    setManualCredential(e.target.value);
    setError('');
  }

  function handleScanFromManual() {
    if (!manualCredential.trim()) {
      setError('Please enter a QR credential');
      return;
    }
    resolveQrCredential(manualCredential.trim());
  }

  function resolveQrCredential(credential: string) {
    setBusy(true);
    setError('');

    resolveCustomer({ qrCredential: credential })
      .unwrap()
      .then((data) => {
        setState({ step: 'resolved', qrCredential: credential, customerData: data });
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Customer not found. Please check the QR code.') as string;
        setError(message);
      })
      .finally(() => setBusy(false));
  }

  function handleCalculateEarnings() {
    if (!state.customerData || purchaseAmountInput === '') return;

    const amount = parseFloat(purchaseAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid purchase amount');
      return;
    }

    setBusy(true);
    calculateEarnings({
      membershipId: state.customerData.membership.id,
      purchaseAmount: amount,
      branchId: state.branchId,
    })
      .unwrap()
      .then((earnings) => {
        setState(prev => ({ ...prev, step: 'calculate', purchaseAmount: amount, earnings }));
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Failed to calculate earnings.') as string;
        setError(message);
      })
      .finally(() => setBusy(false));
  }

  function handleCreateTransaction() {
    if (!state.customerData || !state.earnings || !state.purchaseAmount) return;

    setBusy(true);
    createTransaction({
      membershipId: state.customerData.membership.id,
      purchaseAmount: state.purchaseAmount,
      stampsEarned: state.earnings.stampsToEarn,
      pointsEarned: state.earnings.pointsToEarn,
      branchId: state.branchId,
    })
      .unwrap()
      .then((transaction) => {
        setState(prev => ({ ...prev, step: 'complete', transaction }));
        stopCamera();
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Failed to create transaction.') as string;
        setError(message);
      })
      .finally(() => setBusy(false));
  }

  function handleSelectReward(rewardId: string) {
    setState(prev => ({ ...prev, step: 'redeem-confirm', selectedRewardId: rewardId }));
  }

  function handleRedeemReward() {
    if (!state.customerData || !state.selectedRewardId) return;

    setBusy(true);
    redeemReward({
      membershipId: state.customerData.membership.id,
      rewardId: state.selectedRewardId,
      branchId: state.branchId,
    })
      .unwrap()
      .then((redemption) => {
        setState(prev => ({ ...prev, step: 'redeem-complete', redemption }));
        stopCamera();
      })
      .catch((err) => {
        const message = (err.data?.error || err.error || 'Failed to redeem reward.') as string;
        setError(message);
        setState(prev => ({ ...prev, step: 'resolved' }));
      })
      .finally(() => setBusy(false));
  }

  function resetScanner() {
    stopCamera();
    setState(initialState);
    setManualCredential('');
    setPurchaseAmountInput('');
    setError('');
    startCamera();
  }

  function scanAnother() {
    resetScanner();
  }

  // Render different steps
  if (state.step === 'scan') {
    return (
      <div className="merchant-scan-page">
        <header className="scan-header">
          <h1>Scan Customer QR</h1>
          <p>Point the camera at the customer's personal QR code</p>
        </header>

        <div className="scan-container">
          <div className="scan-video-container">
            <video 
              ref={videoRef} 
              playsInline 
              muted 
              className="scan-video"
              onError={() => setError('Camera access required. Please enable camera permissions.')}
            />
            <div className="scan-overlay">
              <div className="scan-rectangle" />
            </div>
          </div>
        </div>

        <div className="scan-alternative">
          <p>Or enter credential manually:</p>
          <div className="manual-entry">
            <InputField
              id="manual-credential"
              label="QR Credential"
              value={manualCredential}
              onChange={handleManualCredentialChange}
              placeholder="Paste or type the QR credential"
              error={error}
            />
            <button 
              type="button"
              className="primary-button"
              onClick={handleScanFromManual} 
              disabled={busy || !manualCredential.trim()}
            >
              {busy ? 'Scanning…' : 'Resolve Customer'}
            </button>
          </div>
        </div>

        {error && <FormFeedback error={error} />}

        <div className="scan-actions">
          <button className="quiet-button" onClick={() => navigate(paths.merchantDashboard)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state.step === 'resolved' && state.customerData) {
    return (
      <div className="merchant-scan-page">
        <header className="scan-header">
          <h1>Customer Found</h1>
        </header>

        <Section title="Customer Information">
          <div className="customer-info-card">
            <h2>{state.customerData.customer.name}</h2>
            <p>📞 {state.customerData.customer.phoneNumber}</p>
            <p className="muted">
              Member since: {new Date(state.customerData.membership.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </Section>

        <Section title="Current Balance">
          <div className="balance-card">
            <div className="balance-item">
              <span className="balance-label">Stamps</span>
              <span className="balance-value">{state.customerData.balance.stamps}</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">Points</span>
              <span className="balance-value">{state.customerData.balance.points}</span>
            </div>
          </div>
        </Section>

        <Section title="Programme">
          <div className="program-info-card">
            <p><strong>{state.customerData.program.name || 'Active Programme'}</strong></p>
            <p className="muted">
              Type: {state.customerData.program.type} (v{state.customerData.program.version})
            </p>
          </div>
        </Section>

        {state.customerData.eligibleRewards.length > 0 && (
          <Section title="Available Rewards" subtitle="Customer can redeem these rewards">
            <div className="rewards-list">
              {state.customerData.eligibleRewards.map(reward => (
                <button 
                  key={reward.id}
                  className="reward-card"
                  onClick={() => handleSelectReward(reward.id)}
                  disabled={!reward.available}
                >
                  <span className="reward-name">{reward.name}</span>
                  <span className="reward-cost">
                    {reward.pointsCost} points
                    {reward.stampsCost ? ` + ${reward.stampsCost} stamps` : ''}
                  </span>
                  {!reward.available && <span className="reward-unavailable">Not enough balance</span>}
                </button>
              ))}
            </div>
          </Section>
        )}

        {state.customerData.eligibleRewards.length === 0 && (
          <Section title="Rewards">
            <p className="muted">No rewards configured for this programme.</p>
          </Section>
        )}

        {error && <FormFeedback error={error} />}

        <Section title="Actions">
          <div className="action-buttons">
            <button className="primary-button" onClick={() => setState(prev => ({ ...prev, step: 'calculate' }))}>
              Record Purchase
            </button>
            <button className="quiet-button" onClick={resetScanner}>
              Scan Different Customer
            </button>
          </div>
        </Section>
      </div>
    );
  }

  if (state.step === 'calculate' && state.customerData) {
    const isStampsProgramme = state.customerData.program.type === 'stamps';
    const isPointsProgramme = state.customerData.program.type === 'points';
    const inputType = isStampsProgramme ? 'number' : 'number';
    const inputStep = isStampsProgramme ? '1' : '0.01';
    const inputMin = isStampsProgramme ? '1' : '0.01';
    const label = isStampsProgramme ? 'Number of Purchases' : isPointsProgramme ? 'Amount (TND)' : 'Amount / Count';
    const hint = isStampsProgramme 
      ? 'Enter the number of purchases/visits' 
      : 'Enter the purchase amount in Tunisian Dinars';

    return (
      <div className="merchant-scan-page">
        <header className="scan-header">
          <h1>Record Purchase</h1>
          <p>Customer: {state.customerData.customer.name}</p>
          <p className="muted">Programme: {state.customerData.program.type}</p>
        </header>

        <Section title="Purchase Details">
          <InputField
            id="purchase-amount"
            label={label}
            type={inputType}
            step={inputStep}
            min={inputMin}
            value={purchaseAmountInput}
            onChange={(e) => {
              setPurchaseAmountInput(e.target.value);
              setError('');
            }}
            hint={hint}
            error={error}
          />
          <button 
            type="button"
            className="primary-button"
            onClick={handleCalculateEarnings}
            disabled={busy || !purchaseAmountInput}
          >
            {busy ? 'Calculating…' : 'Calculate Earnings'}
          </button>
        </Section>

        {error && <FormFeedback error={error} />}

        <div className="scan-actions">
          <button className="quiet-button" onClick={() => setState(prev => ({ ...prev, step: 'resolved' }))}>
            Back to Customer
          </button>
        </div>
      </div>
    );
  }

  if (state.step === 'confirm' && state.customerData && state.earnings) {
    return (
      <div className="merchant-scan-page">
        <header className="scan-header">
          <h1>Confirm Transaction</h1>
          <p>Customer: {state.customerData.customer.name}</p>
        </header>

        <Section title="Earnings Summary">
          <div className="earnings-summary">
            <div className="earnings-item">
              <span className="earnings-label">Purchase Amount</span>
              <span className="earnings-value">{state.earnings.purchaseAmount} TND</span>
            </div>
            {state.earnings.stampsToEarn > 0 && (
              <div className="earnings-item">
                <span className="earnings-label">Stamps to earn</span>
                <span className="earnings-value">{state.earnings.stampsToEarn}</span>
              </div>
            )}
            {state.earnings.pointsToEarn > 0 && (
              <div className="earnings-item">
                <span className="earnings-label">Points to earn</span>
                <span className="earnings-value">{state.earnings.pointsToEarn}</span>
              </div>
            )}
            <div className="earnings-item total">
              <span className="earnings-label">New Stamps Balance</span>
              <span className="earnings-value">{state.earnings.totalStampsAfter}</span>
            </div>
            <div className="earnings-item total">
              <span className="earnings-label">New Points Balance</span>
              <span className="earnings-value">{state.earnings.totalPointsAfter}</span>
            </div>
          </div>
        </Section>

        {error && <FormFeedback error={error} />}

        <Section title="Confirm">
          <div className="action-buttons">
            <button 
              type="button"
              className="primary-button"
              onClick={handleCreateTransaction} 
              disabled={busy}
            >
              {busy ? 'Processing…' : 'Confirm Transaction'}
            </button>
            <button className="quiet-button" onClick={() => setState(prev => ({ ...prev, step: 'calculate' }))}>
              Back
            </button>
          </div>
        </Section>
      </div>
    );
  }

  if (state.step === 'complete' && state.transaction) {
    return (
      <div className="merchant-scan-page">
        <div className="scan-success">
          <h1>✓ Transaction Complete</h1>
          <p>Transaction #{state.transaction.transactionId.slice(0, 8)} recorded successfully.</p>
          
          <div className="transaction-summary">
            <p><strong>Customer:</strong> {state.customerData?.customer.name}</p>
            <p><strong>Amount:</strong> {state.transaction.purchaseAmount} TND</p>
            <p><strong>Stamps Earned:</strong> {state.transaction.stampsEarned}</p>
            <p><strong>Points Earned:</strong> {state.transaction.pointsEarned}</p>
            <p><strong>New Balance:</strong> {state.transaction.newBalance.stamps} stamps, {state.transaction.newBalance.points} points</p>
          </div>
        </div>

        <Section title="Next Steps">
          <div className="action-buttons">
            <button className="primary-button" onClick={scanAnother}>
              Scan Another Customer
            </button>
            <button className="quiet-button" onClick={() => navigate(paths.merchantDashboard)}>
              Return to Dashboard
            </button>
          </div>
        </Section>
      </div>
    );
  }

  if (state.step === 'redeem-confirm' && state.customerData) {
    const selectedReward = state.customerData.eligibleRewards.find(r => r.id === state.selectedRewardId);
    
    if (!selectedReward) {
      return (
        <div className="merchant-scan-page">
          <p>Reward not found</p>
          <button onClick={() => setState(prev => ({ ...prev, step: 'resolved' }))}>Back</button>
        </div>
      );
    }

    return (
      <div className="merchant-scan-page">
        <header className="scan-header">
          <h1>Confirm Redemption</h1>
          <p>Customer: {state.customerData.customer.name}</p>
        </header>

        <Section title="Reward to Redeem">
          <div className="reward-confirm-card">
            <h2>{selectedReward.name}</h2>
            <p>
              Cost: {selectedReward.pointsCost} points
              {selectedReward.stampsCost ? ` + ${selectedReward.stampsCost} stamps` : ''}
            </p>
          </div>
        </Section>

        <Section title="Current Balance">
          <div className="balance-card">
            <div className="balance-item">
              <span className="balance-label">Stamps</span>
              <span className="balance-value">{state.customerData.balance.stamps}</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">Points</span>
              <span className="balance-value">{state.customerData.balance.points}</span>
            </div>
          </div>
        </Section>

        {error && <FormFeedback error={error} />}

        <Section title="Confirm">
          <div className="action-buttons">
            <button 
              type="button"
              className="primary-button"
              onClick={handleRedeemReward} 
              disabled={busy}
            >
              {busy ? 'Processing…' : 'Confirm Redemption'}
            </button>
            <button className="quiet-button" onClick={() => setState(prev => ({ ...prev, step: 'resolved' }))}>
              Cancel
            </button>
          </div>
        </Section>
      </div>
    );
  }

  if (state.step === 'redeem-complete' && state.redemption) {
    return (
      <div className="merchant-scan-page">
        <div className="scan-success">
          <h1>✓ Redemption Complete</h1>
          <p>Reward "{state.redemption.reward.name}" has been redeemed.</p>
          
          <div className="transaction-summary">
            <p><strong>Customer:</strong> {state.customerData?.customer.name}</p>
            <p><strong>Reward:</strong> {state.redemption.reward.name}</p>
            <p><strong>Cost:</strong> {state.redemption.reward.pointsCost} points{state.redemption.reward.stampsCost ? ` + ${state.redemption.reward.stampsCost} stamps` : ''}</p>
            <p><strong>Balance Before:</strong> {state.redemption.customerBalanceBefore.stamps} stamps, {state.redemption.customerBalanceBefore.points} points</p>
            <p><strong>Balance After:</strong> {state.redemption.customerBalanceAfter.stamps} stamps, {state.redemption.customerBalanceAfter.points} points</p>
          </div>
        </div>

        <Section title="Next Steps">
          <div className="action-buttons">
            <button className="primary-button" onClick={scanAnother}>
              Scan Another Customer
            </button>
            <button className="quiet-button" onClick={() => navigate(paths.merchantDashboard)}>
              Return to Dashboard
            </button>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="merchant-scan-page">
      <p>Invalid state</p>
      <button onClick={() => navigate(paths.merchantDashboard)}>Return to Dashboard</button>
    </div>
  );
}

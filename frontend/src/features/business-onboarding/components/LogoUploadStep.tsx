import { useRef, useState, FormEvent } from 'react';
import { SubmitButton } from '../../../components/ui/SubmitButton';

export interface LogoUploadMeta {
  storageKey: string;
  filename: string;
  width: number;
  height: number;
  mimeType: string;
  uploadedAt: Date;
}

interface LogoUploadStepProps {
  /**
   * Current logo metadata, if any
   */
  currentLogo?: LogoUploadMeta | null;
  /**
   * Whether upload is in progress
   */
  pending: boolean;
  /**
   * Callback when logo is successfully uploaded
   */
  onUploadSuccess: (meta: LogoUploadMeta) => void;
  /**
   * Callback when upload fails or is cancelled
   */
  onError: (message: string) => void;
}

/**
 * Logo upload component for business onboarding.
 * Allows merchants to upload PNG, JPEG, or WebP logos.
 * Shows preview and handles file validation.
 */
export function LogoUploadStep({
  currentLogo,
  pending,
  onUploadSuccess,
  onError,
}: LogoUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  const handleFileSelect = (event: FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      setPreview(null);
      setFileName('');
      setUploadError('');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only PNG, JPEG, and WebP images are supported.');
      setPreview(null);
      setFileName('');
      input.value = '';
      return;
    }

    // Validate file size (5 MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File is too large. Maximum size is 5 MB.`);
      setPreview(null);
      setFileName('');
      input.value = '';
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setFileName(file.name);
      setUploadError('');
    };
    reader.onerror = () => {
      setUploadError('Failed to read file. Please try again.');
      setPreview(null);
      setFileName('');
      input.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('No file selected.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/merchants/business-setup/business/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      onUploadSuccess({
        ...result,
        uploadedAt: new Date(result.uploadedAt),
      });

      // Clear form
      setPreview(null);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      setUploadError(message);
      onError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleClearPreview = () => {
    setPreview(null);
    setFileName('');
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="logo-upload-step">
      <div className="step-intro">
        <h3>Upload your business logo</h3>
        <p>Upload a PNG, JPEG, or WebP image (up to 5 MB). The logo will be displayed on your customer cards.</p>
      </div>

      {/* Current logo display */}
      {currentLogo && !preview && (
        <div className="current-logo">
          <h4>Current logo</h4>
          <img
            src={`/api/merchants/business-setup/business/logo`}
            alt="Current business logo"
            style={{ maxWidth: '200px', maxHeight: '200px' }}
          />
          <p className="logo-info">
            {currentLogo.width} × {currentLogo.height} px · {currentLogo.mimeType}
          </p>
        </div>
      )}

      {/* File input and preview */}
      <form className="logo-upload-form" onSubmit={handleUpload} noValidate>
        {preview ? (
          <div className="preview-area">
            <img src={preview} alt="Logo preview" style={{ maxWidth: '300px', maxHeight: '300px' }} />
            <p className="file-name">{fileName}</p>
            <button
              type="button"
              onClick={handleClearPreview}
              disabled={uploading}
              className="secondary"
            >
              Choose different file
            </button>
            <SubmitButton pending={uploading} idle="Upload logo" waiting="Uploading…" />
          </div>
        ) : (
          <div className="file-input-area">
            <label htmlFor="logo-file" className="file-input-label">
              <input
                ref={fileInputRef}
                id="logo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                disabled={uploading || pending}
                className="file-input-hidden"
              />
              <span className="file-input-button">Choose file</span>
            </label>
            <p className="file-hint">PNG, JPEG, or WebP (up to 5 MB)</p>
          </div>
        )}

        {uploadError && <div className="error-message">{uploadError}</div>}
      </form>

      <style>{`
        .logo-upload-step {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .step-intro {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .step-intro h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .step-intro p {
          margin: 0;
          font-size: 0.95rem;
          color: #666;
        }

        .current-logo {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background-color: #f5f5f5;
          border-radius: 8px;
        }

        .current-logo h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
        }

        .current-logo img {
          border-radius: 4px;
          object-fit: contain;
        }

        .logo-info {
          margin: 0;
          font-size: 0.85rem;
          color: #999;
        }

        .logo-upload-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .preview-area {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
        }

        .preview-area img {
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .file-name {
          margin: 0;
          font-size: 0.9rem;
          color: #666;
          word-break: break-word;
        }

        .preview-area button {
          margin-top: 0.5rem;
        }

        .file-input-area {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
          padding: 2rem 1.5rem;
          background-color: #f9f9f9;
          border: 2px dashed #d0d0d0;
          border-radius: 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .file-input-area:hover {
          background-color: #f0f0f0;
          border-color: #999;
        }

        .file-input-hidden {
          display: none;
        }

        .file-input-label {
          display: flex;
          justify-content: center;
          cursor: pointer;
        }

        .file-input-button {
          padding: 0.75rem 1.5rem;
          background-color: #2f7450;
          color: white;
          border-radius: 4px;
          font-weight: 600;
          transition: background-color 0.2s;
        }

        .file-input-button:hover {
          background-color: #1d4a30;
        }

        .file-hint {
          margin: 0;
          font-size: 0.85rem;
          color: #999;
        }

        .error-message {
          padding: 0.75rem;
          background-color: #fee;
          border-left: 4px solid #f33;
          color: #c33;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        button.secondary {
          background-color: #e0e0e0;
          color: #333;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        button.secondary:hover:not(:disabled) {
          background-color: #d0d0d0;
        }

        button.secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

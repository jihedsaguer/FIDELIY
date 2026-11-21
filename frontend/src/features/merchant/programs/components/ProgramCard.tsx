import type { ProgramDto } from '../../api/programApi';
import { ProgramTypeIcon } from './ProgramTypeIcon';
import { ProgramStatusBadge } from './ProgramStatusBadge';
import { formatProgramType } from './programUtils';

interface ProgramCardProps {
  program: ProgramDto;
  isFeatured?: boolean;
  showActions?: boolean;
  onDeactivate?: (program: ProgramDto) => void;
  isDeactivating?: boolean;
}

/**
 * ProgramCard - Displays programme information in a card layout
 * Improved for easy scanning with clear hierarchy:
 * - Programme name as primary identifier
 * - Status badge for quick state recognition
 * - Type icon for visual identification
 * - Version and type as secondary information
 * Used for both current programme and programme history
 */
export function ProgramCard({ 
  program, 
  isFeatured = false, 
  showActions = false,
  onDeactivate,
  isDeactivating = false 
}: ProgramCardProps) {
  const cardClass = `program-card${isFeatured ? ' program-card--featured' : ''}`;

  return (
    <div className={cardClass}>
      <div className="program-card-header">
        <div className="program-card-icon">
          <ProgramTypeIcon type={program.type} />
        </div>
        <div className="program-card-info">
          <h3 className="program-card-name" title={program.name ?? 'Unnamed Programme'}>
            {program.name ?? 'Unnamed Programme'}
          </h3>
          <div className="program-card-meta">
            <ProgramStatusBadge status={program.status} />
            <span className="program-card-version">v{program.version}</span>
            <span className="program-card-type">
              {formatProgramType(program.type)}
            </span>
          </div>
        </div>
      </div>
      
      {program.description && (
        <p className="program-card-description">{program.description}</p>
      )}

      {showActions && onDeactivate && (
        <div className="program-actions">
          <button
            className="quiet-button"
            onClick={() => onDeactivate(program)}
            disabled={isDeactivating}
            aria-label={`Deactivate programme ${program.name ?? 'this programme'}`}
          >
            {isDeactivating ? 'Deactivating...' : 'Deactivate Programme'}
          </button>
        </div>
      )}
    </div>
  );
}

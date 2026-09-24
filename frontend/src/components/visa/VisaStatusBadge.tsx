import type { VisaStatus } from '../../types/visa';
import { VISA_STATUS_META } from '../../utils/visa';

export default function VisaStatusBadge({ status }: { status: VisaStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] ${VISA_STATUS_META[status].badge}`}
    >
      {VISA_STATUS_META[status].label}
    </span>
  );
}

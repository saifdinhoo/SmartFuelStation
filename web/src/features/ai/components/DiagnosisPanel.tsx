import { Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { AuthUser } from '@/features/auth/authApi';
import type { AiLabels } from '../labels';
import type { Diagnosis, DiagnosisUrgency, SuggestedAction } from '../types';

interface DiagnosisPanelProps {
  diagnosis: Diagnosis;
  suggestedAction: SuggestedAction | null;
  suggestedCategoryId: number | null;
  role?: AuthUser['role'];
  labels: AiLabels;
  onFindProviders: (categoryId: number | null) => void;
}

const URGENCY_BADGE_VARIANT: Record<DiagnosisUrgency, 'success' | 'warning' | 'destructive'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'destructive',
  EMERGENCY: 'destructive',
};

// EMERGENCY gets the strongest treatment; HIGH is a step down but still
// clearly flagged — LOW/MEDIUM stay informational.
const SAFETY_ALERT_VARIANT: Record<DiagnosisUrgency, 'info' | 'warning' | 'destructive'> = {
  LOW: 'info',
  MEDIUM: 'info',
  HIGH: 'warning',
  EMERGENCY: 'destructive',
};

// Only the customer discovery route (/customer/search) exists to navigate
// into — provider/admin diagnosis still displays fully, just without a
// dead-end CTA into a page their role can't reach.
export function DiagnosisPanel({
  diagnosis,
  suggestedAction,
  suggestedCategoryId,
  role,
  labels,
  onFindProviders,
}: DiagnosisPanelProps) {
  const { urgency, possibleCauses, recommendedServiceCategory, safetyAdvice, followUpQuestion } =
    diagnosis;
  const canNavigateToDiscovery = role === 'CUSTOMER';

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-body-sm font-semibold text-foreground">{labels.diagnosisTitle}</p>
        </div>
        <Badge variant={URGENCY_BADGE_VARIANT[urgency]}>{labels.urgencyLabels[urgency]}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Safety advice always renders before any CTA below, regardless of
            urgency — most important for EMERGENCY. */}
        {safetyAdvice && (
          <Alert variant={SAFETY_ALERT_VARIANT[urgency]} title={labels.safetyAdvice}>
            {safetyAdvice}
          </Alert>
        )}

        {possibleCauses.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-caption font-medium uppercase">{labels.possibleCauses}</p>
            <ul className="flex flex-col gap-2">
              {possibleCauses.map((cause, index) => (
                <li key={index} className="rounded-md border border-border p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-body-sm font-medium text-foreground">{cause.name}</p>
                    <Badge variant="secondary">{labels.likelihoodLabels[cause.likelihood]}</Badge>
                  </div>
                  <p className="text-body-sm text-muted-foreground">{cause.explanation}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {followUpQuestion && (
          <Alert variant="info" title={labels.needMoreInfo}>
            {followUpQuestion}
          </Alert>
        )}

        {recommendedServiceCategory && (
          <p className="text-body-sm text-foreground">
            <span className="font-medium">{labels.recommendedCategory}:</span>{' '}
            {recommendedServiceCategory}
          </p>
        )}

        {suggestedAction === 'SEEK_IMMEDIATE_HELP' && (
          <Alert variant="destructive" title={labels.seekHelpTitle}>
            {labels.seekHelpBody}
          </Alert>
        )}

        {canNavigateToDiscovery && (
          <div className="flex flex-wrap gap-2">
            {suggestedAction === 'FIND_PROVIDER' && suggestedCategoryId != null && (
              <Button onClick={() => onFindProviders(suggestedCategoryId)}>
                {labels.findProviders}
              </Button>
            )}
            {suggestedAction === 'SEEK_IMMEDIATE_HELP' && (
              <Button variant="secondary" onClick={() => onFindProviders(suggestedCategoryId)}>
                {labels.findNearbySecondary}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

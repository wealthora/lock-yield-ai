import { Check, X } from 'lucide-react';
import { getPasswordRequirements } from '@/lib/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const requirements = getPasswordRequirements(password);
  const allMet = requirements.every(req => req.met);

  return (
    <div className="space-y-2 mt-2 p-3 bg-muted/50 rounded-md">
      <p className="text-sm font-medium">Password requirements:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            {req.met ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
      {allMet && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">
          ✓ Password meets all requirements
        </p>
      )}
    </div>
  );
}

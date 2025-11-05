import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[@#$!%*&]/, 'Password must contain at least one special character (@#$!%*&)');

export interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

export const getPasswordRequirements = (password: string): PasswordRequirement[] => {
  return [
    {
      label: 'At least 8 characters',
      test: (pwd: string) => pwd.length >= 8,
      met: password.length >= 8,
    },
    {
      label: 'One uppercase letter (A-Z)',
      test: (pwd: string) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(password),
    },
    {
      label: 'One lowercase letter (a-z)',
      test: (pwd: string) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(password),
    },
    {
      label: 'One number (0-9)',
      test: (pwd: string) => /[0-9]/.test(pwd),
      met: /[0-9]/.test(password),
    },
    {
      label: 'One special character (@#$!%*&)',
      test: (pwd: string) => /[@#$!%*&]/.test(pwd),
      met: /[@#$!%*&]/.test(password),
    },
  ];
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  try {
    passwordSchema.parse(password);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => err.message),
      };
    }
    return { valid: false, errors: ['Invalid password'] };
  }
};

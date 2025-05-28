import { useState, useCallback } from 'react';

import { ValidationError } from '../../types/ServiceConfiguration';

interface ValidationRule {
  validator: (value: any) => boolean;
  message: string;
}

interface ValidationRules {
  [key: string]: ValidationRule[];
}

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<ValidationError>({});

  const validate = useCallback(
    (values: { [key: string]: any }): boolean => {
      const newErrors: ValidationError = {};
      let isValid = true;

      Object.keys(rules).forEach((field) => {
        const fieldRules = rules[field];
        const value = values[field];

        for (const rule of fieldRules) {
          if (!rule.validator(value)) {
            newErrors[field] = rule.message;
            isValid = false;
            break;
          }
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [rules],
  );

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validate,
    clearError,
    clearAllErrors,
  };
};

/**
 * Shared validation utilities for auth forms.
 * Used across Login, Register, AdminLogin, AdminRegister,
 * ResidentLogin, ResidentRegister.
 */

/**
 * Validates email with a strict regex.
 * Must contain @, and end with .com / .fr / .tn
 * @param {string} email
 * @returns {boolean}
 */
export const isEmailValid = (email) => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Returns the strength level of a password.
 * @param {string} password
 * @returns {{ level: 'empty' | 'weak' | 'medium' | 'strong', score: 0|1|2|3 }}
 */
export const getPasswordStrength = (password) => {
  if (!password) return { level: 'empty', score: 0 };

  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasMinLength, hasNumber, hasSpecial].filter(Boolean).length;

  if (score === 3) return { level: 'strong', score: 3 };
  if (score === 2) return { level: 'medium', score: 2 };
  return { level: 'weak', score: 1 };
};

/**
 * Returns true if the password meets the "Strong" criteria
 * required both client-side AND enforced server-side.
 * @param {string} password
 * @returns {boolean}
 */
export const isPasswordStrong = (password) =>
  getPasswordStrength(password).level === 'strong';

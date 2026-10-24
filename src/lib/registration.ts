export function validatePasswordConfirmation(password: string, confirmation: string) {
  return password === confirmation ? null : "Passwords do not match.";
}
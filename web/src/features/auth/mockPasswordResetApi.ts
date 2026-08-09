// The backend has no password-reset endpoints yet (and this task explicitly
// says not to add any). These simulate the request/response shape so the
// UI flow can be built and tested now; swap the body for a real apiClient
// call once /auth/forgot-password and /auth/reset-password exist.

export async function requestPasswordReset(_email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 800));
}

export async function resetPassword(_token: string, _password: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 800));
}

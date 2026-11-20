// After a successful email + password sign-in, tell the browser these details worked so it offers
// to save them. Our logins happen in the background (no page load), so without this the browser
// has to guess. Supported in Chrome and Edge; other browsers rely on the form's autocomplete hints.
export function saveCredential(email: string, password: string, name?: string) {
  try {
    const PasswordCredentialCtor = (window as any).PasswordCredential;
    if (!PasswordCredentialCtor || !navigator.credentials?.store || !email || !password) return;
    const credential = new PasswordCredentialCtor({ id: email, password, name: name || email });
    navigator.credentials.store(credential).catch(() => {});
  } catch {
    // Saving is a convenience only; never let it affect sign-in
  }
}

export function saveCredential(email: string, password: string, name?: string) {
  try {
    const PasswordCredentialCtor = (window as any).PasswordCredential;
    if (!PasswordCredentialCtor || !navigator.credentials?.store || !email || !password) return;
    const credential = new PasswordCredentialCtor({ id: email, password, name: name || email });
    navigator.credentials.store(credential).catch(() => {});
  } catch {
  }
}

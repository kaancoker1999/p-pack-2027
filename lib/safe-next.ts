/** Giriş sonrası yönlendirme yalnızca site içi bir yola olabilir (open redirect önlemi). */
export function safeNext(next: string | string[] | undefined, fallback: string, prefix: string): string {
  const v = Array.isArray(next) ? next[0] : next;
  return v && v.startsWith(prefix) && !v.startsWith('//') && !v.includes('\\') ? v : fallback;
}

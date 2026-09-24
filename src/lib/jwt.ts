/**
 * JWT payload 解码（2026-09-23）。
 *
 * 用途：**只做界面显隐**。前端不验签、不据此做任何授权判断 ——
 * 真正的判定永远在后端（403 由后端给）。这里解码出来的角色只用来决定
 * 「诊断面板要不要多显示几个 tab」这类展示级开关，
 * 避免再出现 `const supportOperatorRole = "agent"` 这种写死常量把
 * 「记忆 / JSON」tab 永久藏起来的情况（那会让契约漂移长期无人发现）。
 */

export type JwtClaims = {
  sub?: string;
  tenant_id?: string;
  roles?: string[];
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
};

/** 解 base64url → UTF-8 字符串。 */
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

/** 解出 payload；格式不对一律返回 null，不抛。 */
export function decodeJwtPayload(token: string): JwtClaims | null {
  const raw = token.trim();
  const parts = raw.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const claims = JSON.parse(base64UrlDecode(parts[1])) as JwtClaims;
    return claims && typeof claims === "object" ? claims : null;
  } catch {
    return null;
  }
}

/** 令牌是否已过期；解不出 exp 时视为「未知」，不当作过期。 */
export function isTokenExpired(claims: JwtClaims | null): boolean {
  if (!claims || typeof claims.exp !== "number") {
    return false;
  }
  return claims.exp * 1000 <= Date.now();
}

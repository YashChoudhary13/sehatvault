export interface MediaGateOpts {
  reducedMotion: boolean;
  effectiveType?: string;
  saveData?: boolean;
}

export function shouldPlayMedia({ reducedMotion, effectiveType, saveData }: MediaGateOpts): boolean {
  if (reducedMotion) return false;
  if (saveData) return false;
  if (effectiveType && (effectiveType === "2g" || effectiveType === "slow-2g" || effectiveType === "3g")) {
    return false;
  }
  return true;
}

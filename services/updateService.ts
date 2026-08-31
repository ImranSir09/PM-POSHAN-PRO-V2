import { App as CapApp } from '@capacitor/app';

export const CURRENT_APP_VERSION = '2.1.0';
export const GITHUB_REPO = 'ImranSir09/PM-POSHAN-PRO-V2';
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  releaseUrl: string;
  publishedAt?: string;
  releaseName?: string;
}

/**
 * Compare two version strings (e.g. "2.1.0" vs "2.1.1" or "v2.1.5").
 * Returns:
 *   > 0 if v2 is strictly greater than v1 (update available)
 *   <= 0 if v1 is equal to or greater than v2 (up to date)
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split(/[-+.]/).map(p => parseInt(p, 10)).filter(n => !isNaN(n));
  const parts2 = clean2.split(/[-+.]/).map(p => parseInt(p, 10)).filter(n => !isNaN(n));

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;

    if (num2 > num1) return 1;
    if (num2 < num1) return -1;
  }

  return 0;
}

/**
 * Gets the current version of the application.
 * Tries Capacitor App info first, falls back to CURRENT_APP_VERSION.
 */
export async function getCurrentAppVersion(): Promise<string> {
  try {
    const info = await CapApp.getInfo();
    if (info && info.version) {
      return info.version;
    }
  } catch (e) {
    // Web browser fallback
  }
  return CURRENT_APP_VERSION;
}

/**
 * Checks GitHub Releases API for the latest published release.
 */
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const currentVersion = await getCurrentAppVersion();

  const response = await fetch(GITHUB_RELEASES_API, {
    headers: {
      'Accept': 'application/vnd.github+json',
    },
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`GitHub API HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawTag = data.tag_name || data.name || '';
  const latestVersion = rawTag.replace(/^v/i, '').trim();

  // Find APK asset download URL
  let downloadUrl = data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;
  if (Array.isArray(data.assets) && data.assets.length > 0) {
    const apkAsset = data.assets.find((asset: any) => 
      asset.name && asset.name.toLowerCase().endsWith('.apk')
    );
    if (apkAsset && apkAsset.browser_download_url) {
      downloadUrl = apkAsset.browser_download_url;
    }
  }

  const hasUpdate = compareVersions(currentVersion, latestVersion) > 0;

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseNotes: data.body || 'No release notes provided.',
    downloadUrl,
    releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
    publishedAt: data.published_at,
    releaseName: data.name || rawTag,
  };
}

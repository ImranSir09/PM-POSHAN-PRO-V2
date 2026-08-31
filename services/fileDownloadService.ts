import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface DownloadOptions {
  filename: string;
  mimeType?: string;
  dialogTitle?: string;
}

/**
 * Converts a Blob to a base64 encoded string.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 part after data:mime/type;base64,
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Helper to infer mime type from filename extension if not explicitly provided.
 */
function getMimeType(filename: string, fallbackMime?: string): string {
  if (fallbackMime) return fallbackMime;
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'csv': return 'text/csv';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'application/vnd.ms-excel';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'json': return 'application/json';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

/**
 * Universal file downloader / saver.
 * On Web: Triggers standard browser download.
 * On Native (Android / Capacitor): Writes file using Filesystem API and invokes Native Share / Open sheet.
 */
export async function saveOrDownloadFile(
  content: Blob | string,
  filename: string,
  mimeType?: string
): Promise<{ success: boolean; nativePath?: string }> {
  const isNative = Capacitor.isNativePlatform();
  const fileMime = getMimeType(filename, mimeType);

  if (!isNative) {
    // Web implementation
    let blob: Blob;
    if (content instanceof Blob) {
      blob = content;
    } else if (content.startsWith('data:')) {
      const res = await fetch(content);
      blob = await res.blob();
    } else {
      blob = new Blob([content], { type: fileMime });
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    }, 150);

    return { success: true };
  }

  // Capacitor Native Android / iOS implementation
  try {
    let base64Data: string;

    if (content instanceof Blob) {
      base64Data = await blobToBase64(content);
    } else if (content.startsWith('data:')) {
      base64Data = content.split(',')[1] || content;
    } else if (content.startsWith('http://') || content.startsWith('https://')) {
      const res = await fetch(content);
      const blob = await res.blob();
      base64Data = await blobToBase64(blob);
    } else {
      // Plain text or raw base64 string
      if (/^[A-Za-z0-9+/=]+\s*$/.test(content.trim()) && content.length % 4 === 0) {
        base64Data = content;
      } else {
        const blob = new Blob([content], { type: fileMime });
        base64Data = await blobToBase64(blob);
      }
    }

    // Write file to Cache directory (guaranteed accessible for Share API)
    const writeResult = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    // Also try saving a copy to Documents directory for native file manager accessibility
    try {
      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch (docErr) {
      console.warn('Could not save duplicate copy to Documents folder:', docErr);
    }

    // Trigger Native Share/Save sheet so user can open, save to Drive/Downloads, or view
    if (await Share.canShare()) {
      await Share.share({
        title: filename,
        text: `Exported document: ${filename}`,
        url: writeResult.uri,
        dialogTitle: `Save or Open ${filename}`,
      });
    }

    return { success: true, nativePath: writeResult.uri };
  } catch (error) {
    console.error('Failed to save file natively:', error);
    throw error;
  }
}

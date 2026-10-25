import { apiUrl } from './apiConfig';

/**
 * Resizes and compresses an image file in the browser before saving or uploading.
 * Solves LocalStorage 5MB QuotaExceededError and optimizes mobile network uploads.
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 900,
  maxHeight = 900,
  quality = 0.75
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (e) => reject(e);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (e) => reject(e);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get canvas 2d context'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              resolve({ dataUrl, blob: file });
            }
          },
          'image/jpeg',
          quality
        );
      };

      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error('Empty file read'));
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file or base64 to the server /api/upload endpoint.
 * Returns the hosted URL (e.g. /uploads/prod-17192837.jpg) or falls back to dataUrl.
 */
export async function uploadImageToServer(
  dataUrlOrBlob: string | Blob,
  filename = 'product.jpg'
): Promise<string> {
  let fallbackDataUrl = '';

  try {
    let dataUrlToSend = '';
    if (typeof dataUrlOrBlob === 'string') {
      dataUrlToSend = dataUrlOrBlob;
      fallbackDataUrl = dataUrlOrBlob;
    } else {
      dataUrlToSend = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(dataUrlOrBlob);
      });
      fallbackDataUrl = dataUrlToSend;
    }

    const res = await fetch(apiUrl('/api/upload'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataUrl: dataUrlToSend,
        filename,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Direct image upload to server failed, falling back to local data URL:', err);
  }

  // Fallback to dataUrl so the image is NEVER lost
  return fallbackDataUrl;
}

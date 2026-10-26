/**
 * Image Utilities for Company Logo and Media Handling
 */

export async function compressLogoImage(
  file: File,
  maxWidth = 500,
  maxHeight = 500,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // SVG files should be kept as-is to retain full vector resolution
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Retain transparency with PNG or WebP
        const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/webp';
        try {
          const dataUrl = canvas.toDataURL(outputFormat, quality);
          resolve(dataUrl);
        } catch {
          // Fallback to original read result if canvas export fails
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('No se pudo decodificar el archivo de imagen.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|svg|gif)$/i)) {
    return {
      valid: false,
      error: 'Formato no compatible. Por favor sube un archivo PNG, JPG, WebP o SVG.'
    };
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      error: 'El archivo excede el tamaño máximo permitido de 5 MB.'
    };
  }

  return { valid: true };
}

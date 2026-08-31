export const COMPANY_LOGO_MAX_SIZE = 5 * 1024 * 1024

const ALLOWED_LOGO_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const ALLOWED_LOGO_EXTENSION = /\.(?:jpe?g|png)$/i

export function validateCompanyLogoFile(file: Pick<File, 'name' | 'size' | 'type'>): string {
  const hasAllowedExtension = ALLOWED_LOGO_EXTENSION.test(file.name.trim())
  const hasAllowedMimeType = !file.type || ALLOWED_LOGO_MIME_TYPES.has(file.type.toLowerCase())

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    return 'Formato não suportado. Envie uma imagem PNG, JPG ou JPEG.'
  }

  if (file.size > COMPANY_LOGO_MAX_SIZE) {
    return 'A imagem deve ter no máximo 5 MB.'
  }

  return ''
}

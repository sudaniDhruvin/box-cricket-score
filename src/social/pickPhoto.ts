import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import type { UploadFile } from '../api/client';

export async function pickPhoto(): Promise<Asset | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.8,
  });
  if (result.didCancel) return null;
  if (result.errorMessage) throw new Error('Could not open your photos. Try again.');
  const asset = result.assets?.[0];
  if (!asset?.uri) throw new Error('That photo could not be read.');
  if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) throw new Error('Use a photo smaller than 8 MB.');
  return asset;
}

export function photoFile(asset: Asset, fallback: string): UploadFile {
  if (!asset.uri) throw new Error('That photo could not be read.');
  return {
    uri: asset.uri,
    type: asset.type ?? 'image/jpeg',
    fileName: asset.fileName ?? fallback,
  };
}

/**
 * FL-GreenGuard: Digital Wallet Service
 * 
 * Manages storage and retrieval of certificates and licenses.
 * Stores files locally for offline access.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const WALLET_STORAGE_KEY = 'fl_greenguard_digital_wallet';
const WALLET_FILES_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}fl_greenguard_wallet/`
  : '/tmp/fl_greenguard_wallet/';

export interface WalletCertificate {
  id: string;
  type: 'gibmp' | 'lf_license';
  name: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  expirationDate?: string;
  notes?: string;
}

/**
 * Initialize wallet directory
 */
async function ensureWalletDirectoryExists(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(WALLET_FILES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(WALLET_FILES_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error creating wallet directory:', error);
    throw error;
  }
}

/**
 * Add a certificate to the wallet
 */
export async function addCertificateToWallet(
  fileUri: string,
  type: 'gibmp' | 'lf_license',
  name: string,
  expirationDate?: string
): Promise<WalletCertificate> {
  try {
    await ensureWalletDirectoryExists();

    // Generate unique file name
    const fileName = `${type}_${Date.now()}.pdf`;
    const destinationPath = `${WALLET_FILES_DIR}${fileName}`;

    // Copy file to wallet directory
    await FileSystem.copyAsync({
      from: fileUri,
      to: destinationPath,
    });

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(destinationPath);

    const certificate: WalletCertificate = {
      id: `${type}_${Date.now()}`,
      type,
      name,
      fileName,
      filePath: destinationPath,
      fileSize: (fileInfo as any).size || 0,
      uploadedAt: new Date().toISOString(),
      expirationDate,
    };

    // Save to storage
    await saveCertificateMetadata(certificate);

    return certificate;
  } catch (error) {
    console.error('Error adding certificate to wallet:', error);
    throw error;
  }
}

/**
 * Get all certificates from wallet
 */
export async function getWalletCertificates(): Promise<WalletCertificate[]> {
  try {
    const data = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error retrieving wallet certificates:', error);
    return [];
  }
}

/**
 * Get certificate by ID
 */
export async function getCertificateById(id: string): Promise<WalletCertificate | null> {
  try {
    const certificates = await getWalletCertificates();
    return certificates.find((cert) => cert.id === id) || null;
  } catch (error) {
    console.error('Error retrieving certificate:', error);
    return null;
  }
}

/**
 * Get certificate by type
 */
export async function getCertificateByType(type: 'gibmp' | 'lf_license'): Promise<WalletCertificate | null> {
  try {
    const certificates = await getWalletCertificates();
    return certificates.find((cert) => cert.type === type) || null;
  } catch (error) {
    console.error('Error retrieving certificate by type:', error);
    return null;
  }
}

/**
 * Update certificate metadata
 */
export async function updateCertificate(
  id: string,
  updates: Partial<WalletCertificate>
): Promise<WalletCertificate | null> {
  try {
    const certificates = await getWalletCertificates();
    const index = certificates.findIndex((cert) => cert.id === id);

    if (index === -1) {
      console.warn(`Certificate with ID ${id} not found`);
      return null;
    }

    const updated = { ...certificates[index], ...updates };
    certificates[index] = updated;

    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(certificates));
    return updated;
  } catch (error) {
    console.error('Error updating certificate:', error);
    return null;
  }
}

/**
 * Delete certificate from wallet
 */
export async function deleteCertificate(id: string): Promise<boolean> {
  try {
    const certificate = await getCertificateById(id);
    if (!certificate) {
      console.warn(`Certificate with ID ${id} not found`);
      return false;
    }

    // Delete file
    try {
      await FileSystem.deleteAsync(certificate.filePath);
    } catch (error) {
      console.warn('Error deleting certificate file:', error);
    }

    // Remove from metadata
    const certificates = await getWalletCertificates();
    const filtered = certificates.filter((cert) => cert.id !== id);
    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(filtered));

    return true;
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return false;
  }
}

/**
 * Save certificate metadata
 */
async function saveCertificateMetadata(certificate: WalletCertificate): Promise<void> {
  try {
    const certificates = await getWalletCertificates();
    const existing = certificates.find((cert) => cert.id === certificate.id);

    if (existing) {
      const index = certificates.indexOf(existing);
      certificates[index] = certificate;
    } else {
      certificates.push(certificate);
    }

    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(certificates));
  } catch (error) {
    console.error('Error saving certificate metadata:', error);
    throw error;
  }
}

/**
 * Check if certificate is expired
 */
export function isCertificateExpired(certificate: WalletCertificate): boolean {
  if (!certificate.expirationDate) {
    return false;
  }

  const expirationDate = new Date(certificate.expirationDate);
  return new Date() > expirationDate;
}

/**
 * Get days until certificate expiration
 */
export function getDaysUntilExpiration(certificate: WalletCertificate): number | null {
  if (!certificate.expirationDate) {
    return null;
  }

  const expirationDate = new Date(certificate.expirationDate);
  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Export wallet as JSON
 */
export async function exportWalletAsJson(): Promise<string> {
  try {
    const certificates = await getWalletCertificates();
    return JSON.stringify(certificates, null, 2);
  } catch (error) {
    console.error('Error exporting wallet:', error);
    throw error;
  }
}

/**
 * Clear entire wallet (dangerous operation)
 */
export async function clearWallet(): Promise<boolean> {
  try {
    const certificates = await getWalletCertificates();

    // Delete all files
    for (const cert of certificates) {
      try {
        await FileSystem.deleteAsync(cert.filePath);
      } catch (error) {
        console.warn(`Error deleting file ${cert.filePath}:`, error);
      }
    }

    // Delete metadata
    await AsyncStorage.removeItem(WALLET_STORAGE_KEY);

    return true;
  } catch (error) {
    console.error('Error clearing wallet:', error);
    return false;
  }
}

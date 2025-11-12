import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAuthStore } from '../stores/useAuthStore';
import { hasEncryptionKey, generateKeys, generateHEKeys, deleteAllKeys } from '../utils/encryption';
import { PrivacyTier } from '../../types/settings';

export function SettingsPage() {
  const { settings, loadSettings, updateSetting, isLoading } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const [backendUrl, setBackendUrl] = useState('');
  const [hasKeys, setHasKeys] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [isDeletingKeys, setIsDeletingKeys] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState<{
    current: number;
    total: number;
    operation: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();

    const cleanup = window.electronAPI.settings.onTierTransitionProgress((progress) => {
      setTransitionProgress(progress);
    });

    return cleanup;
  }, []);

  useEffect(() => {
    if (settings) {
      setBackendUrl(settings.backendUrl || 'http://localhost:8000');
      checkKeys();
    }
  }, [settings?.backendUrl]);

  const checkKeys = async () => {
    const exists = await hasEncryptionKey();
    setHasKeys(exists);
  };

  const handleSaveBackendUrl = async () => {
    await updateSetting('backendUrl', backendUrl);
  };

  const handleGenerateKeys = async () => {
    if (!settings) return;

    setIsGeneratingKeys(true);
    try {
      const backendUrl = settings.backendUrl && settings.backendUrl.trim() !== ''
        ? settings.backendUrl
        : undefined;

      const success = await generateKeys(backendUrl);
      if (success) {
        await checkKeys();
        alert('Encryption keys generated successfully (AES always generated, HE only if backend is available)');
      } else {
        alert('Failed to generate encryption keys');
      }
    } catch (error) {
      alert('Error generating keys: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleGenerateHEKeys = async () => {
    if (!settings) return;

    setIsGeneratingKeys(true);
    try {
      const success = await generateHEKeys(settings.backendUrl);
      if (success) {
        alert('HE keys generated successfully');
      } else {
        alert('Failed to generate HE keys. Make sure the backend is running.');
      }
    } catch (error) {
      alert('Error generating HE keys: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingKeys(false);
    }
  };

  const handleDeleteKeys = async () => {
    if (!confirm('Are you sure you want to delete all encryption keys? This will prevent syncing encrypted data.')) {
      return;
    }

    setIsDeletingKeys(true);
    try {
      const success = await deleteAllKeys();
      if (success) {
        await checkKeys();
        alert('Encryption keys deleted successfully');
      } else {
        alert('Failed to delete encryption keys');
      }
    } catch (error) {
      alert('Error deleting keys: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDeletingKeys(false);
    }
  };

  const handlePrivacyTierChange = async (tier: PrivacyTier) => {
    if (!settings || isTransitioning) {
      return;
    }

    const oldTier = settings.privacyTier;
    if (oldTier === tier) {
      return;
    }

    const confirmMessage = getConfirmationMessage(oldTier, tier);
    if (!confirm(confirmMessage)) {
      return;
    }

    if (tier === PrivacyTier.FULL_SYNC && !hasKeys) {
      alert('Please generate encryption keys before enabling Full Sync.');
      return;
    }

    setIsTransitioning(true);
    setTransitionProgress(null);

    try {
      const success = await updateSetting('privacyTier', tier);
      if (!success) {
        alert('Failed to change privacy tier. Check console for errors.');
      } else {
        const successMessage = getTierChangeSuccessMessage(oldTier, tier);
        alert(successMessage);
      }
    } catch (error) {
      alert('Error changing privacy tier: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsTransitioning(false);
      setTransitionProgress(null);
    }
  };

  const getTierChangeSuccessMessage = (oldTier: PrivacyTier, newTier: PrivacyTier): string => {
    if (newTier === PrivacyTier.FULL_SYNC) {
      return 'Privacy tier changed to Full Sync. Your entries have been encrypted and uploaded successfully to the server.';
    }

    if (newTier === PrivacyTier.ANALYTICS_SYNC) {
      if (oldTier === PrivacyTier.FULL_SYNC) {
        return 'Privacy tier changed to Analytics Sync. Encrypted content has been deleted from the server. Only analytics will be synced going forward.';
      }
      return 'Privacy tier changed to Analytics Sync. Encrypted metrics (word count, sentiment, themes) will be generated and synced on-demand as you create/update entries.';
    }

    if (newTier === PrivacyTier.LOCAL_ONLY) {
      return 'Privacy tier changed to Local Only. All data has been deleted from the server. Everything is now stored locally only.';
    }

    return `Privacy tier changed to ${getTierLabel(newTier)}`;
  };

  const getConfirmationMessage = (oldTier: PrivacyTier, newTier: PrivacyTier): string => {
    const oldLabel = getTierLabel(oldTier);
    const newLabel = getTierLabel(newTier);

    if (newTier === PrivacyTier.FULL_SYNC) {
      return `Change from ${oldLabel} to ${newLabel}?\n\nThis will encrypt and upload all your journal entries to the server. Make sure you have generated encryption keys and the backend is running.`;
    }

    if (newTier === PrivacyTier.ANALYTICS_SYNC) {
      if (oldTier === PrivacyTier.FULL_SYNC) {
        return `Change from ${oldLabel} to ${newLabel}?\n\nThis will DELETE all encrypted content from the server, keeping only analytics. This action cannot be undone!`;
      }
      return `Change from ${oldLabel} to ${newLabel}?\n\nThis will sync encrypted analytics (word count, sentiment, themes) to the server.`;
    }

    if (newTier === PrivacyTier.LOCAL_ONLY) {
      return `Change from ${oldLabel} to ${newLabel}?\n\nThis will DELETE ALL your data from the server. Everything will remain on your local device only. This action cannot be undone!`;
    }

    return `Change privacy tier from ${oldLabel} to ${newLabel}?`;
  };

  const getTierLabel = (tier: PrivacyTier): string => {
    switch (tier) {
      case PrivacyTier.LOCAL_ONLY:
        return 'Local Only';
      case PrivacyTier.ANALYTICS_SYNC:
        return 'Analytics Sync';
      case PrivacyTier.FULL_SYNC:
        return 'Full Sync';
      default:
        return tier;
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  const privacyTiers = [
    {
      value: PrivacyTier.LOCAL_ONLY,
      label: 'Local Only',
      description: 'All data stays on your device. No sync, no cloud backup.',
    },
    {
      value: PrivacyTier.ANALYTICS_SYNC,
      label: 'Analytics Sync',
      description: 'Sync encrypted metrics (word count, sentiment, themes). Content stays local.',
    },
    {
      value: PrivacyTier.FULL_SYNC,
      label: 'Full Sync',
      description: 'Sync encrypted content and embeddings. Access from multiple devices.',
    },
  ];

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account and privacy preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-slate-600 mt-1">{user?.email || 'Not logged in'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <p className="text-sm text-slate-600 mt-1">{user?.display_name || 'N/A'}</p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy & Sync</CardTitle>
            <CardDescription>Choose your privacy level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTransitioning && transitionProgress && (
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
                <p className="text-sm font-medium text-blue-900">
                  {transitionProgress.operation}...
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Progress: {transitionProgress.current} / {transitionProgress.total}
                </p>
              </div>
            )}
            {privacyTiers.map((tier) => (
              <div
                key={tier.value}
                className={`p-4 border rounded-md transition-colors ${
                  isTransitioning
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-slate-50'
                } ${
                  settings.privacyTier === tier.value
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200'
                }`}
                onClick={() => !isTransitioning && handlePrivacyTierChange(tier.value)}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    checked={settings.privacyTier === tier.value}
                    onChange={() => handlePrivacyTierChange(tier.value)}
                    className="mt-1 mr-3"
                    disabled={isTransitioning}
                  />
                  <div>
                    <h3 className="font-medium text-slate-900">{tier.label}</h3>
                    <p className="text-sm text-slate-600 mt-1">{tier.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backend Configuration</CardTitle>
            <CardDescription>Configure your backend server URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="backendUrl" className="text-sm font-medium">
                Backend URL
              </label>
              <div className="flex gap-2">
                <Input
                  id="backendUrl"
                  type="url"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                  disabled={isLoading}
                />
                <Button onClick={handleSaveBackendUrl} disabled={isLoading}>
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encryption</CardTitle>
            <CardDescription>Manage your encryption keys</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Encryption Keys Status</label>
              <p className="text-sm text-slate-600 mt-1">
                {hasKeys ? 'Keys are present and ready' : 'No encryption keys found'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleGenerateKeys}
                disabled={isGeneratingKeys || hasKeys || isTransitioning}
              >
                {isGeneratingKeys ? 'Generating...' : 'Generate Keys'}
              </Button>
              <Button
                onClick={handleGenerateHEKeys}
                disabled={isGeneratingKeys || !hasKeys || isTransitioning}
                variant="outline"
              >
                {isGeneratingKeys ? 'Generating...' : 'Generate HE Keys'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteKeys}
                disabled={isDeletingKeys || !hasKeys || isTransitioning}
              >
                {isDeletingKeys ? 'Deleting...' : 'Delete Keys'}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Generate Keys creates AES keys (required for Full Sync - always works offline). Generate HE Keys is optional (for Analytics Sync tier, requires backend + WASM setup).
            </p>
            {!hasKeys && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                Generate keys before enabling Full Sync tier!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

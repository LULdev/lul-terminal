/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchHostingStats } from '../lib/imageHosting';
import { useVisibilityAwarePoll } from './useVisibilityAwarePoll';

export function useImageHostingStats() {
  const [imagesHosted, setImagesHosted] = useState(0);
  const [imageViewsTotal, setImageViewsTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      const stats = await fetchHostingStats();
      setImagesHosted(stats.imagesHosted);
      setImageViewsTotal(stats.imageViewsTotal);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useVisibilityAwarePoll(load, 8000);

  return { imagesHosted, imageViewsTotal };
}
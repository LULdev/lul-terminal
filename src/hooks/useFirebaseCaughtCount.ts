/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { onValue, runTransaction } from 'firebase/database';
import { caughtCountRef } from '../lib/firebase';

export function useFirebaseCaughtCount() {
  const [caughtCount, setCaughtCount] = useState(0);

  useEffect(() => {
    return onValue(caughtCountRef, (snap) => {
      setCaughtCount(snap.val() ?? 0);
    });
  }, []);

  const recordCatch = useCallback(() => {
    runTransaction(caughtCountRef, (current) => (current ?? 0) + 1);
  }, []);

  return { caughtCount, recordCatch };
}
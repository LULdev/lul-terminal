/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QrCode } from 'lucide-react';

type Props = {
  url: string;
  size?: number;
  label?: string;
};

export function PasteQrCode({ url, size = 120, label = 'Scan to open' }: Props) {
  const [open, setOpen] = useState(false);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=0b0c10&color=34d399`;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/30 transition w-fit"
      >
        <QrCode size={12} />
        {open ? 'Hide QR' : 'QR share'}
      </button>
      {open && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 animate-fade-in">
          <img
            src={qrSrc}
            alt="QR code for paste link"
            width={size}
            height={size}
            className="rounded-lg border border-slate-800 bg-[#0b0c10] shrink-0"
          />
          <div className="min-w-0 pt-1">
            <p className="text-[9px] font-mono text-emerald-300/90 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-[8px] font-mono text-slate-500 break-all leading-relaxed">{url}</p>
          </div>
        </div>
      )}
    </div>
  );
}
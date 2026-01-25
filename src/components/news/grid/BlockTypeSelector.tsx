/**
 * @deprecated This component is deprecated along with OverlayGridEditor.
 * Use the new GridEditor component instead.
 */

'use client';

import React from 'react';

interface BlockTypeSelectorProps {
  isOpen?: boolean;
  onSelect?: (type: string) => void;
  onClose?: () => void;
}

export default function BlockTypeSelector({ isOpen, onSelect, onClose }: BlockTypeSelectorProps) {
  if (!isOpen) return null;

  console.warn('BlockTypeSelector is deprecated. Use GridEditor instead.');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 text-center">
        <p className="text-muted-foreground mb-4">This component is deprecated.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}

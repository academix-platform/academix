"use client";

import { WifiOff } from "lucide-react";

export default function FreezeOverlay({ isFrozen }: { isFrozen: boolean }) {
  if (!isFrozen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full mx-4">
        <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Network Disconnected</h2>
        <p className="text-gray-600 mb-6">
          Your exam has been paused because you are offline. Please check your internet connection.
          The exam will automatically resume once you are back online.
        </p>
        <div className="flex justify-center">
          <div className="animate-pulse flex items-center text-academixPurpleDark font-medium">
            <div className="w-2 h-2 bg-academixPurpleDark rounded-full mr-2"></div>
            Waiting for connection...
          </div>
        </div>
      </div>
    </div>
  );
}

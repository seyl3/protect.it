'use client';

import ClientOnly from '../../components/ClientOnly';
import CreateMarketForm from '../../components/CreateMarketForm';

export default function CreateMarket() {
  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FA9A] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateMarketForm />
    </ClientOnly>
  );
} 
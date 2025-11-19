import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, celo } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import type { ReactNode } from 'react'

// 1. Get projectId at https://cloud.reown.com
const projectId = '32bdcbaff141dd9eefe495e28ccb1175'

// 2. Create a metadata object
const metadata = {
  name: 'Mathy',
  description: 'Toddler Friendly Ballot App',
  url: 'https://mathy.example.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// 3. Create Wagmi Adapter
const networks = [base, celo]
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

// 4. Create Modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [base, celo],
  metadata,
  projectId,
  features: {
    analytics: true
  }
})

const queryClient = new QueryClient()

export function AppKitProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

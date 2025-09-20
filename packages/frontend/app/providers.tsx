'use client';

import { ReactNode } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import '@rainbow-me/rainbowkit/styles.css';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID!;
const SUBGRAPH_ENDPOINT = process.env.NEXT_PUBLIC_SUBGRAPH_URL!;

const wagmiConfig = getDefaultConfig({
    appName: 'GalleryFi',
    projectId: WC_PROJECT_ID,
    chains: [sepolia],
    transports: { [sepolia.id]: http(RPC_URL) },
    ssr: true,       
});

const apollo = new ApolloClient({
    uri: SUBGRAPH_ENDPOINT,
    cache: new InMemoryCache(),
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={darkTheme()}>
                    <ApolloProvider client={apollo}>{children}</ApolloProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

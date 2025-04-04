"use client";

import { WalletError } from "@bbachain/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@bbachain/wallet-adapter-react";
import { WalletModalProvider } from "@bbachain/wallet-adapter-react-ui";
import { UnsafeBurnerWalletAdapter } from "@bbachain/wallet-adapter-wallets";
import dynamic from "next/dynamic";
import { ReactNode, useCallback, useMemo } from "react";
import { useCluster } from "../cluster/cluster-data-access";

require("@bbachain/wallet-adapter-react-ui/styles.css");

export const WalletButton = dynamic(
  async () =>
    (await import("@bbachain/wallet-adapter-react-ui")).WalletMultiButton,
  {
    ssr: false,
  }
);

export function BBAChainProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();
  const endpoint = useMemo(() => cluster.endpoint, [cluster]);

  const wallets = useMemo(() => [new UnsafeBurnerWalletAdapter()], []);

  const onError = useCallback((error: WalletError) => {
    console.error(error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

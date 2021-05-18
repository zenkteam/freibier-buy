import React, { Dispatch, SetStateAction, useState, useEffect } from "react";
import { TezosToolkit } from "@taquito/taquito";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { BeaconEvent, defaultEventCallbacks } from "@airgap/beacon-sdk";
import TransportU2F from "@ledgerhq/hw-transport-u2f";
import { LedgerSigner } from "@taquito/ledger-signer";
import config from '../config';
import Tracker from '../tracker';

type ButtonProps = {
  Tezos: TezosToolkit;
  setWallet: Dispatch<SetStateAction<any>>;
  setUserAddress: Dispatch<SetStateAction<string>>;
  setUserBalance: Dispatch<SetStateAction<number>>;
  setBeaconConnection: Dispatch<SetStateAction<boolean>>;
  setPublicToken: Dispatch<SetStateAction<string | null>>;
  wallet: BeaconWallet;
};

const ConnectButton = ({
  Tezos,
  setWallet,
  setUserAddress,
  setUserBalance,
  setBeaconConnection,
  setPublicToken,
  wallet
}: ButtonProps): JSX.Element => {
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);
  const [loadingNano, setLoadingNano] = useState<boolean>(false);

  const setup = async (userAddress: string): Promise<void> => {
    setUserAddress(userAddress);
  };

  const connectWallet = async (): Promise<void> => {
    try {
      setLoadingWallet(true);
      Tracker.trackEvent('connect_start', { type: 'wallet'});
      await wallet.requestPermissions({
        network: {
          type: config.network,
          rpcUrl: config.rpcUrl,
        }
      });
      // gets user's address
      const userAddress = await wallet.getPKH();
      await setup(userAddress);
      setBeaconConnection(true);
      Tracker.trackEvent('connect_success', { type: 'wallet'});
    } catch (error) {
      console.log(error);
      setLoadingWallet(false);
    }
  };

  const connectNano = async (): Promise<void> => {
    try {
      setLoadingNano(true);
      Tracker.trackEvent('connect_start', { type: 'nano'});
      const transport = await TransportU2F.create();
      const ledgerSigner = new LedgerSigner(transport, "44'/1729'/0'/0'", true);

      Tezos.setSignerProvider(ledgerSigner);

      //Get the public key and the public key hash from the Ledger
      const userAddress = await Tezos.signer.publicKeyHash();
      await setup(userAddress);
      Tracker.trackEvent('connect_success', { type: 'nano'});
    } catch (error) {
      console.log("Error!", error);
      setLoadingNano(false);
    }
  };

  useEffect(() => {
    (async () => {
      // creates a wallet instance
      const wallet = new BeaconWallet({
        name: "Freibier.io",
        preferredNetwork: config.network,
        disableDefaultEvents: true, // Disable all events / UI. This also disables the pairing alert.
        eventHandlers: {
          // To keep the pairing alert, we have to add the following default event handlers back
          [BeaconEvent.PAIR_INIT]: {
            handler: defaultEventCallbacks.PAIR_INIT
          },
          [BeaconEvent.PAIR_SUCCESS]: {
            handler: data => setPublicToken(data.publicKey)
          }
        }
      });
      Tezos.setWalletProvider(wallet);
      setWallet(wallet);
      // checks if wallet was connected before
      const activeAccount = await wallet.client.getActiveAccount();
      if (activeAccount) {
        const userAddress = await wallet.getPKH();
        await setup(userAddress);
        setBeaconConnection(true);
      }
    })();
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <button className="button long-submit-button bg-primary-4 w-button" id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" onClick={connectWallet}>
        {loadingWallet ? (
          <span>
            Confirm Connection
          </span>
        ) : (
          <span>
            Connect Wallet
          </span>
        )}
      </button>

      <button className="button long-submit-button w-button" id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" disabled={loadingNano} onClick={connectNano}>
        {loadingNano ? (
          <span>
            Loading, please wait
          </span>
        ) : (
          <span>
            Connect Ledger Nano
          </span>
        )}
      </button>
    </>
  );
};

export default ConnectButton;

import React, { Dispatch, SetStateAction } from "react";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit } from "@taquito/taquito";
import config from "./../config";

interface ButtonProps {
  wallet: BeaconWallet | null;
  setPublicToken?: Dispatch<SetStateAction<string | null>>;
  setUserAddress: Dispatch<SetStateAction<string>>;
  setWallet: Dispatch<SetStateAction<any>>;
  setTezos: Dispatch<SetStateAction<TezosToolkit>>;
  setBeaconConnection?: Dispatch<SetStateAction<boolean>>;
}

const DisconnectButton = ({
  wallet,
  setPublicToken,
  setUserAddress,
  setWallet,
  setTezos,
  setBeaconConnection
}: ButtonProps): JSX.Element => {
  const disconnectWallet = async (): Promise<void> => {
    setUserAddress('');
    setWallet(null);
    const tezosTK = new TezosToolkit(config.rpcUrl);
    setTezos(tezosTK);
    if (setBeaconConnection) setBeaconConnection(false);
    if (setPublicToken) setPublicToken(null);

    if (wallet) {
      await wallet.client.removeAllAccounts();
      await wallet.client.removeAllPeers();
      await wallet.client.destroy();
    }
  };

  return (
    <button className="button long-submit-button w-button secondary" id="w-node-cac1c974-81c3-bb3d-28aa-2c88c2fd1725-856d06c6" onClick={disconnectWallet}>
      Disconnect wallet
    </button>
  );
};

export default DisconnectButton;

import { useEffect, useRef, useState } from "react";
import { BigNumber, Contract, providers, Signer } from "ethers";
import Web3Modal from "web3modal";
import Core from "web3modal";
import { config } from "../constants/config";

const Main = () => {
  // True if waiting for a transaction to be mined, false otherwise.
  const [loading, setLoading] = useState(false);

  const [waitingForRandomness, setWaitingForRandomness] = useState(false);

  // True if user has connected their wallet, false otherwise
  const [walletConnected, setWalletConnected] = useState(false);

  const [flipId, setFlipId] = useState<number>();
  const [flipResult, setFlipResult] = useState<number>();

  const web3ModalRef = useRef<Core>();

  // Helper function to connect wallet
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  // Helper function to fetch a Provider/Signer instance from Metamask
  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef!.current!.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 42) {
      window.alert("Please switch to the Kovan network!");
      throw new Error("Please switch to the Kovan network");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // Helper function to return a DAO Contract instance
  // given a Provider/Signer
  const getContractInstance = (
    providerOrSigner: providers.Provider | Signer
  ) => {
    return new Contract(
      config.contractAddress,
      config.contractAbi,
      providerOrSigner
    );
  };

  //  piece of code that runs everytime the wallet is connected/disconnected and/or the component refreshes
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "kovan",
        providerOptions: {},
        disableInjectedProvider: false,
      });

      // connectWallet().then(() => {});
    }
  }, [walletConnected]);

  const flipBtnHandler = async () => {
    try {
      setFlipId(undefined);
      setFlipResult(undefined);
      const signer = await getProviderOrSigner(true);
      const contract = getContractInstance(signer);
      const txn = await contract.flip();
      setLoading(true);
      const minedTxn = await txn.wait();
      console.log({ minedTxn });
      setWaitingForRandomness(true);
      listenForEvents();
    } catch (error: any) {
      console.error(error);
      alert(error?.message);
    } finally {
      setLoading(false);
    }
  };

  const listenForEvents = async () => {
    const provider = await getProviderOrSigner();
    const contract = getContractInstance(provider);
    contract.on("RequestedRandomness", (requestId: any) => {
      alert("Requested randomness");
    });
    contract.on("FlipResult", (_flipId: BigNumber, _flipResult: number) => {
      setWaitingForRandomness(false);
      const flipId = parseInt(BigNumber.from(_flipId).toString());
      const flipResult = _flipResult;
      setFlipId(flipId);
      setFlipResult(flipResult);
    });
  };

  return (
    <div>
      <h1>Flip-a-Coin</h1>
      {flipId && (
        <div>
          <h2>Flip #{flipId}</h2>
          <p>
            <strong>Result:</strong> {flipResult === 0 ? "Heads" : "Tails"}
          </p>
        </div>
      )}
      {waitingForRandomness && (
        <p>
          Waiting for Chainlink to send the randomness... (This can take a few
          seconds)
        </p>
      )}

      {!waitingForRandomness && (
        <button onClick={flipBtnHandler} disabled={loading}>
          {loading ? "Loading..." : "Flip"}
        </button>
      )}
    </div>
  );
};

export default Main;

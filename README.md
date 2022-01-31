# Chainlink VRFs

## Introduction

When dealing with computers, randomness is an important but difficult issue to handle due to a computer's deterministic nature. This is true even more so when speaking of blockchain because not only is the computer deterministic, but it is also transparent. As a result, trusted random numbers cannot be generated natively in Solidity: if each node came up with their own random number they would not be sure whose random number to use when they went to reach consensus.

We could solve this by looking outside of the blockchain to get a random number but then this introduces a central point of failure and forces users/developers to have trust in this centralized source of randomness.

This brings us to Chainlink VRFs which can help us produce a provably random number and have that randomness credibly verified on the blockchain.

The official Chainlink Docs describe VRFs as:

> Chainlink VRF (Verifiable Random Function) is a provably-fair and verifiable source of randomness designed for smart contracts. Smart contract developers can use Chainlink VRF as a tamper-proof random number generator (RNG) to build reliable smart contracts for any applications which rely on unpredictable outcomes.

## When is it needed?

It can/should be used any time you want provably-fair randomness.

Imagine if there were a coin-toss on a website. How do you ensure that it isn't rigged?
It would definitely help to have this state on the blockchain, completely verifiable.
And that's what we'll be building in this lesson! :)

## BUIDL IT

### What will we be building?

A full-stack dApp that users can use to do a coin-flip, with the result coming in from Chainlink VRFs, ie, verifiable.

### Setting up the folder structure

Create a new folder for this dApp and setup the two folders inside of it

```
mkdir coin-flip && cd coin-flip
mkdir eth
mkdir web
```

### Setup a new Hardhat project

We'll work on `web` later.
For now, switch inside the eth directory, and setup a new Hardhat boilerplate

```
cd eth
npm init --y
npx hardhat
```

This will ask you a few questions to setup the new project. You must be familiar to this by now.

I've chosen a basic Hardhat sample project.

### Writing the contract

Let's `cd` into `contracts` and start a new contract `CoinFlip.sol`:

```
//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract CoinFlip {

}
```

Let's think about what we'll be needing to setup the most basic coin-flip, without thinking about VRFs:

- an incrementing counter keeping track of `gameId`
- a mappping `FlipResults` that stores the result for a particular `gameId`
- an event `FlipResult` to be emitted after a flip has been successful

Let's jump into coding it up now:

```
//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract CoinFlip {
    enum EFlipResult {
        Heads,
        Tails
    }

    uint256 gameId = 0;

    mapping (uint256 => EFlipResult) public flipResults;

    event FlipResult(uint256 gameId, EFlipResult flipResult);

    function flip() public {
        gameId++;
        uint256 coin = uint256(block.timestamp) % 2;
        if (coin == 0) {
            flipResults[gameId] = EFlipResult.Heads;
        } else {
            flipResults[gameId] = EFlipResult.Tails;
        }
        emit FlipResult(gameId, flipResults[gameId]);
    }
}
```

Looking at it, line by line:

- We first init an `enum EFlipResult` because a flip result can only be `Heads` or `Tails`; in this case, 0 will represent `Heads`, and 1 will represent `Tails`
- We initialise `gameId` as 0, a mapping of `gameId => FlipResult`, and an event to be emitted on a successful flip.
- Getting to the main function `flip()` now:
  - We increment the gameId
  - Calculate randomness using the current block's timestamp
  - Mod it by 2 => result can only be 0 or 1
  - Emit it as the result of this coin flip

**_WAAIT, hold on. Calculate randomness? How did you do that? I thought that wasn't possible in Solidity?_**

Well, that's right. This isn't a secure way of calculating randomness since it depends on the timestamp, which can be, given a lot of thought and effort, rigged -- a user a calculate his timing and rig his result.
There are more ways to calculate randomness in Solidity, out of which, some might be more secure than the other, but none is truly verifiably secure.

### In comes Chainlink VRF.

> Chainlink VRF enables smart contracts to access randomness without compromising on security or usability. With every new request for randomness, Chainlink VRF generates a random number and cryptographic proof of how that number was determined. The proof is published and verified on-chain before it can be used by any consuming applications. This process ensures that the results cannot be tampered with nor manipulated by anyone, including oracle operators, miners, users and even smart contract developers.

This means than the randomness in this case is fetched by Chainlink from outside the EVM, and then the result, along with the proof, is published to the chain which we can then use.
How cool!

Let's look at it in action to find randomness for our project.

### Editing the contract

Chainlink VRF follows the [Request & Receive Data cycle](https://docs.chain.link/docs/request-and-receive-data/).
To consume randomness, your contract should inherit from VRFConsumerBase and define two required functions:

- `requestRandomness`, which makes the initial request for randomness to Chainlink.
- `fulfillRandomness`, which is the function that receives and does something with verified randomness from Chainlink.

We'll first import the VRF contract and inherit it:
`yarn add @chainlink/contracts`

```
//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract CoinFlip is VRFConsumerBase {
    enum EFlipResult {
        Heads,
        Tails
    }

    uint256 gameId = 0;

    mapping (uint256 => EFlipResult) public flipResults;

    event FlipResult(uint256 gameId, EFlipResult flipResult);

    function flip() public {
        gameId++;
        uint256 coin = uint256(block.timestamp) % 2;
        if (coin == 0) {
            flipResults[gameId] = EFlipResult.Heads;
        } else {
            flipResults[gameId] = EFlipResult.Tails;
        }
        emit FlipResult(gameId, flipResults[gameId]);
    }
}
```

**NOTE:** we now have to initialise the contructor:

```
constructor(
        address vrfCoordinator,
        address linkToken,
        bytes32 vrfKeyHash,
        uint256 vrfFee
    )
        VRFConsumerBase(
            vrfCoordinator,
            linkToken
        )
    {
        keyHash = vrfKeyHash;
        fee = vrfFee;
    }
```

_WAAIT, what's this stuff now and how did we find these values??_

Chainlink defines these as:

> **LINK Token** - LINK token address on the corresponding network (Ethereum, Polygon, BSC, etc)
> **VRF Coordinator** - address of the Chainlink VRF Coordinator
> **Key Hash** - public key against which randomness is generated
> **Fee** - fee required to fulfill a VRF request

You can find these values here: (I'll be using the values for Kovan at the time of deployment)
[https://docs.chain.link/docs/vrf-contracts](https://docs.chain.link/docs/vrf-contracts)

However, we'll need to add `keyHash` and `fee` as variables of the contract:

```
    uint256 public fee;
    bytes32 public keyHash;
```

Now, the only part we're left with are to setup the randomness functions:

```
/**
* Requests randomness
*/
function getRandomNumber() public returns (bytes32 requestId) {
    require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
    return requestRandomness(keyHash, fee);
}

/**
* Callback function used by VRF Coordinator
*/
function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
    uint256 randomResult = randomness;
}
```

_Why do we have two functions, instead of just one?_
Remember we discussed Chainlinkk uses [Request & Receive Data cycle](https://docs.chain.link/docs/request-and-receive-data/) where we send it the request to `requestRandomness()` and we receive the response, as a callback, in `fulfillRandomness()`.

This is what Chainlink gives us by default.
Let's tweak it for our contract, and things should look like this now:

```
function flip() public returns (bytes32) {
        gameId++;
        bytes32 requestId = getRandomNumber();
        gameIds[requestId] = gameId;
        emit RequestedRandomness(requestId);
        return requestId;
    }

    /**
    * Requests randomness
    */
    function getRandomNumber() public returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        return requestRandomness(keyHash, fee);
    }

    /**
    * Callback function used by VRF Coordinator
    */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal virtual override {
        uint256 _gameId = gameIds[requestId];
        uint256 result = randomness % 2;
        result == 0
        ? flipResults[_gameId] = EFlipResult.Heads
        : flipResults[_gameId] = EFlipResult.Tails;

        emit FlipResult(_gameId, flipResults[_gameId]);
    }
```

Let's see what's changed and what's happening now:

- Earlier, when somebody called `flip()`, we calculated randomness based on `block.timestamp`, mod it with 2, and return `Heads` or `Tails` accordingly
- Now, we get a `requestId` and we emit `RequestedRandomness` which will notify the user that Chainlink is working to find us a secure randomness
- Later, when Chainlink is ready, it sends us that randomness (mapped to the `requestId`) through `fulfillRandomness()` where we find the `gameId`, calculate if it's a `Heads` or a `Tails` by the same logic as before, and then emit it.

What's changed? Only the source of that random number.
Voila! That marks the end of the contract. Let's see how it's looking, and then we'll jump into integrating it with the webapp!

```
//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract CoinFlip is VRFConsumerBase {
    enum EFlipResult {
        Heads,
        Tails
    }

    uint256 gameId = 0;

    // chainlink vars
    uint256 public fee;
    bytes32 public keyHash;

    // mapping of requestId to gameId
    mapping (bytes32 => uint256) public gameIds;

    // mapping of gameId => result
    mapping (uint256 => EFlipResult) public flipResults;

    event RequestedRandomness(bytes32 requestId);
    event FlipResult(uint256 gameId, EFlipResult flipResult);

    constructor(
        address vrfCoordinator,
        address linkToken,
        bytes32 vrfKeyHash,
        uint256 vrfFee
    )
        VRFConsumerBase(
            vrfCoordinator,
            linkToken
        )
    {
        keyHash = vrfKeyHash;
        fee = vrfFee;
    }

    function flip() public returns (bytes32) {
        gameId++;
        bytes32 requestId = getRandomNumber();
        gameIds[requestId] = gameId;
        emit RequestedRandomness(requestId);
        return requestId;
    }

    /**
    * Requests randomness
    */
    function getRandomNumber() public returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        return requestRandomness(keyHash, fee);
    }

    /**
    * Callback function used by VRF Coordinator
    */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal virtual override {
        uint256 _gameId = gameIds[requestId];
        uint256 result = randomness % 2;
        result == 0
        ? flipResults[_gameId] = EFlipResult.Heads
        : flipResults[_gameId] = EFlipResult.Tails;

        emit FlipResult(_gameId, flipResults[_gameId]);
    }


    // Fallback function
    receive() external payable {}
}

```

**Did you notice something unusual?**
Maybe the weird `receive()` function at the end?
Well, we need to _fund_ our contracts with some LINK and ETH before we can _request randomness_. This is because our contract makes transactions with other contracts, which costs gas and LINK.
Therefore, and since our contract currently did not have any, we create a default payable function. (Doesn't matter if it's empty)

You can use this faucet to fund your contract: [https://faucets.chain.link/](https://faucets.chain.link/)

### Integrating with the webapp

My weapons of choice for the webapp will be Next with TypeScript.

We are going to be making a very very simplistic vanilla looking UI for this. The real beauty lies in what's happening behind the scenes.

Let's start with going into the `web` directory and initing a new Next app:

`cd ../web npx create-next-app@latest --typescript `

This should setup a boilerplate app for you.

Inside of `/pages`, create a new component called `Main.tsx`:

```
const Main = () => {

}

export default Main;
```

This will be our component that will be doing all the heavy-lifting. Let's render it inside `index.tsx`:

```
import type { NextPage } from "next";
import Main from "./Main";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Verifiable fair on-chain coin-flip</title>
        <meta name="description" content="Verifiable fair on-chain coin-flip" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Main />
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Made with ❤️ by LW3DAO
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  );
};

export default Home;
```

Now that this is done, let's go back to `Main.tsx` and code it up:

First, we need to ensure wallet connections. Let's use ethers.js and web3modal:
`yarn add ethers web3modal`

Add this function:

```
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "kovan",
        providerOptions: {},
        disableInjectedProvider: false,
      });

      connectWallet().then(() => {});
    }
  }, [walletConnected]);
```

This runs everytime the wallet is connected/disconnected and/or the component refreshes.

What is this `connectWallet`?

```
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };
```

Let's also fetch our provider/signer helper:

```
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
```

Now that our wallet connection is good, let's jump to the good part.

Let's start with initialising a few state variables:

```
    // True if waiting for a transaction to be mined, false otherwise.
  const [loading, setLoading] = useState(false);

    // If request for randomness is sent to chainlink
  const [sentRandomness, setSentRandomness] = useState(false);

    // True if user has connected their wallet, false otherwise
  const [walletConnected, setWalletConnected] = useState(false);

    // `flipId` in contract
  const [flipId, setFlipId] = useState<number>();

    // the final result from the contract (0 or 1)
  const [flipResult, setFlipResult] = useState<number>();
```

And now conditionally render some stuff:

```
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
      {sentRandomness && (
        <p>Request to chainlink for randomness has been sent</p>
      )}
      <button onClick={flipBtnHandler} disabled={loading}>
        {loading ? "Loading..." : "Flip"}
      </button>
    </div>
  );
```

Now let's work on the `flipBtnHandler`. We want to make contract txns now:

```
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
      listenForEvents();
    } catch (error: any) {
      console.error(error);
      alert(error?.message);
    } finally {
      setLoading(false);
    }
  };
```

`getContractInstance()`:

```
  const getContractInstance = (
    providerOrSigner: providers.Provider | Signer
  ) => {
    return new Contract(
      config.contractAddress,
      config.contractAbi,
      providerOrSigner
    );
  };
```

This should now make transactions and stuff should start working.

However, we now want to listen to contract events, and need to initialise the `listenForEvents()` function we called in the `btnHandler`:

```
  const listenForEvents = async () => {
    const provider = await getProviderOrSigner();
    const contract = getContractInstance(provider);
    contract.on("RequestedRandomness", (requestId: any) => {
      alert("Requested randomness");
      setSentRandomness(true);
    });
    contract.on("FlipResult", (_flipId: BigNumber, _flipResult: number) => {
      alert("flip result aagya");
      const flipId = parseInt(BigNumber.from(_flipId).toString());
      const flipResult = _flipResult;
      setSentRandomness(false);
      setFlipId(flipId);
      setFlipResult(flipResult);
    });
  };
```

We get the contract instance, open an event listener, receive callbacks with the args when the event is emitted, and then set those states!

That's it!!

Let's go ahead and deploy and run everything and test it out!

Before building eth, we'll have to setup the `Hardhat.config.js`:

```
require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

const ALCHEMY_API_KEY_URL = process.env.ALCHEMY_API_KEY_URL;

const KOVAN_PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  solidity: "0.8.4",
  networks: {
    kovan: {
      url: ALCHEMY_API_KEY_URL,
      accounts: [KOVAN_PRIVATE_KEY],
    },
  },
};
```

Just add your Alchemy API key and private key in the env.
Then, let's setup the deploy script:
`/scripts/deploy.js`:

```
const hre = require("hardhat");
const config = require("../config");

async function main() {
  const CoinFlip = await hre.ethers.getContractFactory("CoinFlip");
  const contract = await CoinFlip.deploy(
    config.vrfCoordinator,
    config.linkToken,
    config.vrfKeyHash,
    config.vrfFee
  );
  console.log("deploying...");

  await contract.deployed();

  console.log("CoinFlip deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Setup your VRF constants in a new `config.js`, or here. Whatever you'd prefer.

Once that's done, let's deploy:
`npx hardhat run --network kovan scripts/deploy.js`

That should return you the deployed contract address!!

Make sure to fund it with ETH and LINK before flipping the coin! ;)

After that, update the ABI and contract address in the frontend, and we're good to now also run the web:
`yarn dev`

Congratulations! Your own provably-fair Chainlink VRFs powered coin-toss is now active!

## Testing

- Connect your wallet on Kovan
- Click on the Flip button
- Wait until you see an alert saying "Requested Randomness" which means request has been sent to Chainlink.
- Now we wait. This can take 20 seconds-2minutes sometimes.
- Next, you should see updated frontend with your game ID and result (Heads/Tails)!!

## Push to Github

Make sure to push all this code to Github before proceeding to the next step.

## Website Deployment

What good is a website if you cannot share it with others? Let's work on deploying your dApp to the world so you can share it with all your LearnWeb3DAO frens.

- Go to [Vercel Dashboard](https://vercel.com) and sign in with your GitHub account.
- Click on the `New Project` button and select your `Coin-Flip-VRFs` repo.
- When configuring your new project, Vercel will allow you to customize your `Root Directory`
- Since our Next.js application is within a subfolder of the repo, we need to modify it.
- Click `Edit` next to `Root Directory` and set it to `my-app`.
- Select the framework as `Next.js`
- Click `Deploy`
- Now you can see your deployed website by going to your Vercel Dashboard, selecting your project, and copying the domain from there!

## CONGRATULATIONS! You're all done!

Hopefully you enjoyed this tutorial.
Feel free to go artistic on the frontend and add animations or whatever! :D
Don't forget to share your verifiable on-chain coin flip website in the `#showcase` channel on Discord ❤️

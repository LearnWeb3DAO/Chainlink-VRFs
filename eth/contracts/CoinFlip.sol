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

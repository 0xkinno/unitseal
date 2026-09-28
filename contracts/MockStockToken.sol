// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockStockToken
 * @notice Test Stock Token implementing the Robinhood Chain uiMultiplier() interface
 */
contract MockStockToken is ERC20, Ownable {
    uint256 private _multiplier = 1e18; // 1.0 in 18 decimal scale

    event MultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _mint(initialOwner, 1000000 * 10**decimals());
    }

    /**
     * @notice Robinhood Chain onchain corporate action multiplier
     */
    function uiMultiplier() external view returns (uint256) {
        return _multiplier;
    }

    /**
     * @notice Set multiplier for testing corporate action drift
     */
    function setMultiplier(uint256 newMultiplier) external onlyOwner {
        uint256 old = _multiplier;
        _multiplier = newMultiplier;
        emit MultiplierUpdated(old, newMultiplier);
    }

    /**
     * @notice Faucet minting for testing
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

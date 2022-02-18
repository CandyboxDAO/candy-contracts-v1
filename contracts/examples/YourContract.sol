// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../abstract/CandyboxProject.sol";

/// @dev This contract is an example of how you can use Candybox to fund your own project.
contract YourContract is CandyboxProject {
    constructor(uint256 _projectId, ITerminalDirectory _directory)
        CandyboxProject(_projectId, _directory)
    {}
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";


contract AssetStorage {
    mapping (uint256 => Structs.Job) public jobs;
    mapping (uint256 => Structs.Collection) public collections;
    mapping (uint256 => Structs.Job) public pendingJobs;

    enum assetTypes { None, Job, Collection }

    uint256 public numAssets;
    uint256 public numActiveJobs;
    uint256 public numPendingJobs;
}

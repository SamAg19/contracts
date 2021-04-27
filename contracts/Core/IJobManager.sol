// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IJobManager {

    function createJob (string calldata url, string calldata selector, bool repeat) external;
    function fulfillJob(uint256 id, uint256 value) external;
    function getResult(uint256 id) external view returns(uint256);
    function getJob(uint256 id) external view returns(string memory url, string memory selector, string memory name, bool repeat, uint256 result);
    function getCollection(uint256 id) external view returns(string memory name, uint32 aggregationMethod, uint256[] memory jobIDs, uint256 result);
}

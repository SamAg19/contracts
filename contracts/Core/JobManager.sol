// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IStateManager.sol";
import "./storage/JobStorage.sol";
import "../lib/Constants.sol";
import "./ACL.sol";
import "hardhat/console.sol";

contract JobManager is ACL, JobStorage {

    IStateManager public stateManager;

    event JobCreated(
        uint256 id,
        uint256 epoch,
        string url,
        string selector,
        string name,
        bool repeat,
        address creator,
        uint256 credit,
        uint256 timestamp
    );

    event JobReported(
        uint256 id,
        uint256 value,
        uint256 epoch,
        string url,
        string selector,
        string name,
        bool repeat,
        address creator,
        uint256 credit,
        bool fulfilled,
        uint256 timestamp
    );

    constructor(address stateManagerAddress) {
        stateManager = IStateManager(stateManagerAddress);
    }

    function createJob(
        string calldata url,
        string calldata selector,
        string calldata name,
        bool repeat
    ) external payable
    {
        numPendingJobs = numPendingJobs+1;
        uint256 epoch = stateManager.getEpoch();
        Structs.Job memory job = Structs.Job(
            numJobs,
            epoch,
            url,
            selector,
            name,
            repeat,
            msg.sender,
            msg.value,
            false,
            0
        );
        pendingJobs[numPendingJobs] = job;
        emit JobCreated(
            numJobs,
            epoch,
            url,
            selector,
            name,
            repeat,
            msg.sender,
            msg.value,
            block.timestamp
        );
    }

    function fulfillJob(
        uint256 jobId,
        uint256 value
    )
        external
        onlyRole(Constants.getJobConfirmerHash())
    {
        Structs.Job storage job = jobs[jobId];
        uint256 epoch = stateManager.getEpoch();

        if (!job.repeat) {
            job.fulfilled = true;
            numActiveJobs = numActiveJobs-1;
        }
        job.result = value;
        emit JobReported(
            job.id,
            value,
            epoch,
            job.url,
            job.selector,
            job.name,
            job.repeat,
            job.creator,
            job.credit,
            job.fulfilled,
            block.timestamp
        );
    }

    function getResult(uint256 id) external view returns(uint256) {
        return jobs[id].result;
    }

    function getJob(
        uint256 id
    )
        external
        view
        returns(
            string memory url,
            string memory selector,
            string memory name,
            bool repeat,
            uint256 result
        )
    {
        Structs.Job memory job = jobs[id];
        return(job.url, job.selector, job.name, job.repeat, job.result);
    }

    function getNumJobs() external view returns(uint256) {
        return numJobs;
    }
    function getActiveJobs() external view returns(uint256) {
        return numActiveJobs;
    }
    function getPendingJobs() external view returns(uint256) {
        return numPendingJobs;
    }
    function addPendingJobs() external {
      if(numPendingJobs!=0)
      {
        uint8 i;
        uint256 temp = numPendingJobs;
        for(i=1; i<=temp; i++){
          uint256 currentEpoch = stateManager.getEpoch();
          //console.log(currentEpoch);
          if(pendingJobs[i].epoch  < currentEpoch)
          {
          numJobs = numJobs+1;
          jobs[numJobs] = pendingJobs[i];
          delete (pendingJobs[i]);
          numActiveJobs = numActiveJobs+1;
          numPendingJobs = numPendingJobs-1;
        }
        }
    }}
}

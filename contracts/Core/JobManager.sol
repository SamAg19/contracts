pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import "./JobStorage.sol";
import "./IStateManager.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./ACL.sol";
import "../lib/Constants.sol";

contract JobManager is ACL, JobStorage {

    event JobCreated(uint256 id, uint256 epoch, string url, string selector, string name,
                            address creator, uint256 credit, uint256 timestamp);
    // event JobFulfilled(uint256 id, uint256 epoch, string url, string selector, bool repeat,
    //                     address creator, uint256 credit, bool fulfulled);

    event JobReported(uint256 id, uint256 value, uint256 epoch,
                        string name, uint256 numberOfLinks, uint256 timestamp);

    IStateManager public stateManager;

    //disable after init.
    function init(address _stateManagerAddress) external {
        stateManager = IStateManager(_stateManagerAddress);
    }

    function createDataFeed(string calldata url, string calldata selector, string calldata name) external payable {

        numDatafeeds = numDatafeeds + 1;
        uint256 epoch = stateManager.getEpoch();
        uint256 link_id = datafeeds[numDatafeeds].numberOfLinks + 1;

        Structs.Link memory link = Structs.Link(link_id, epoch, url, selector, msg.sender, msg.value);

        datafeeds[numDatafeeds].id = numDatafeeds;
        datafeeds[numDatafeeds].links[link_id] = link;
        datafeeds[numDatafeeds].numberOfLinks = link_id;
        datafeeds[numDatafeeds].name = name;

        emit JobCreated(numDatafeeds, epoch, url, selector, name, msg.sender, msg.value, now);
        // jobs.push(job);
    }

    function addLink(string calldata url, string calldata selector, string calldata name, uint256 datafeed_id) external payable {
        uint256 epoch = stateManager.getEpoch();
        uint256 link_id = datafeeds[datafeed_id].numberOfLinks + 1;

        Structs.Link memory link = Structs.Link(link_id, epoch, url, selector, msg.sender, msg.value);

        datafeeds[datafeed_id].links[link_id] = link;
        datafeeds[datafeed_id].numberOfLinks = link_id;
    }

    function fulfillJob(uint256 jobId, uint256 value) external onlyRole(Constants.getJobConfirmerHash()){
        Structs.Datafeed storage datafeed = datafeeds[jobId];
        uint256 epoch = stateManager.getEpoch();

        //if (!job.repeat) {
        //    job.fulfilled = true;
            // emit JobFulfilled(job.id, epoch, job.url, job.selector,
            //job.repeat, job.creator, job.credit, job.fulfilled);
        //}

        emit JobReported(datafeed.id, value, epoch, datafeed.name, datafeed.numberOfLinks, now);
        datafeed.result = value;
    }

    function getResult(uint256 id) external view returns(uint256) {
        return datafeeds[id].result;
    }

    function getDatafeed(uint256 id) external view returns(string memory name, uint256 result, uint256 numberOfLinks) {
        Structs.Datafeed memory datafeed = datafeeds[id];
        return(datafeed.name, datafeed.result, datafeed.numberOfLinks);
    }

    function getDatafeedLink(uint256 id, uint256 link_id) external view returns(uint256 epoch, string memory url, string memory selector, address creator, uint256 credit) {
        Structs.Link memory link = datafeeds[id].links[link_id];
        return (link.epoch, link.url, link.selector, link.creator, link.credit);
    }

    function getNumJobs() external view returns(uint256) {
        return numDatafeeds;
    }
}

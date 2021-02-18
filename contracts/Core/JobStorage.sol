pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import "../lib/Structs.sol";


contract JobStorage {
    mapping (uint256 => Structs.Datafeed) public datafeeds;
    uint256 public numDatafeeds;
}

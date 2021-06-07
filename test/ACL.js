const { assert } = require('chai');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const {
  assertRevert, restoreSnapshot, takeSnapshot, waitNBlocks,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');

describe('Access Control Test', async () => {
  let signers;
  let snapShotId;
  let blockManager;
  let parameters;
  let assetManager;
  let stakeManager;
  let initializeContracts;
  const expectedRevertMessage = 'ACL: sender not authorized';

  before(async () => {
    ({
      blockManager, parameters, assetManager, stakeManager, initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    snapShotId = await takeSnapshot();
    await Promise.all(await initializeContracts());
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
  });

  it('admin role should be granted', async () => {
    const isAdminRoleGranted = await blockManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
    assert(isAdminRoleGranted === true, 'Admin role was not Granted');
  });

  it('fulFillAsset() should not be accessable by anyone besides AssetConfirmer', async () => {
    // Checking if Anyone can access it
    await assertRevert(assetManager.fulfillAsset(2, 222), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await assetManager.grantRole(await parameters.getBlockConfirmerHash(), signers[0].address);
    await assertRevert(assetManager.fulfillAsset(2, 222), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await assetManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
    await assertRevert(assetManager.fulfillAsset(2, 222), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await assetManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(assetManager.fulfillAsset(2, 222), expectedRevertMessage);
  });

  it('fulFillAsset() should be accessable by only AssetConfirmer', async () => {
    const assetConfirmerHash = await parameters.getAssetConfirmerHash();
    await assetManager.grantRole(assetConfirmerHash, signers[0].address);
    await assetManager.fulfillAsset(2, 222);
    await assetManager.revokeRole(assetConfirmerHash, signers[0].address);
    await assertRevert(assetManager.fulfillAsset(2, 222), expectedRevertMessage);
  });

  it('confirmBlock() should not be accessable by anyone besides BlockConfirmer', async () => {
    // Checking if Anyone can access it
    await assertRevert(blockManager.confirmBlock(), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await blockManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
    await assertRevert(blockManager.confirmBlock(), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await blockManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
    await assertRevert(blockManager.confirmBlock(), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await blockManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(blockManager.confirmBlock(), expectedRevertMessage);
  });

  it('confirmBlock() should be accessable by BlockConfirmer', async () => {
    // Wait for 300 blocks, as epoch should be greater than 300, for confirmBlock method to work.
    await waitNBlocks(300);
    const blockConfirmerHash = await parameters.getBlockConfirmerHash();
    await blockManager.grantRole(blockConfirmerHash, signers[0].address);
    await blockManager.confirmBlock();
    await blockManager.revokeRole(blockConfirmerHash, signers[0].address);
    await assertRevert(blockManager.confirmBlock(), expectedRevertMessage);
  });

  it('slash() should not be accessable by anyone besides StakeModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(stakeManager.slash(1, signers[2].address, 1), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await stakeManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.slash(1, signers[2].address, 1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await stakeManager.grantRole(await parameters.getBlockConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.slash(1, signers[2].address, 1), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(stakeManager.slash(1, signers[2].address, 1), expectedRevertMessage);
  });

  it('slash() should be accessable by StakeModifier', async () => {
    await stakeManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
    await stakeManager.slash(1, signers[2].address, 1);
    await stakeManager.revokeRole(await parameters.getStakeModifierHash(), signers[0].address);
    await assertRevert(stakeManager.slash(1, signers[2].address, 1), expectedRevertMessage);
  });

  it('giveBlockReward() should not be accessable by anyone besides StakeModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(stakeManager.giveBlockReward(1, 1), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await stakeManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.giveBlockReward(1, 1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await stakeManager.grantRole(await parameters.getBlockConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.giveBlockReward(1, 1), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(stakeManager.giveBlockReward(1, 1), expectedRevertMessage);
  });

  it('giveBlockReward() should be accessable by StakeModifier', async () => {
    await stakeManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
    await stakeManager.giveBlockReward(1, 1);
    await stakeManager.revokeRole(await parameters.getStakeModifierHash(), signers[0].address);
    await assertRevert(stakeManager.giveBlockReward(1, 1), expectedRevertMessage);
  });

  it('giveRewards() should not be accessable by anyone besides StakeModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(stakeManager.giveRewards(1, 1), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await stakeManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.giveRewards(1, 1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await stakeManager.grantRole(await parameters.getBlockConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.giveRewards(1, 1), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(stakeManager.giveRewards(1, 1), expectedRevertMessage);
  });

  it('giveRewards() should be accessable by StakeModifier', async () => {
    await stakeManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
    await stakeManager.giveRewards(1, 1);
    await stakeManager.revokeRole(await parameters.getStakeModifierHash(), signers[0].address);
    await assertRevert(stakeManager.giveRewards(1, 1), expectedRevertMessage);
  });

  it('givePenalties() should not be accessable by anyone besides StakeModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(stakeManager.givePenalties(1, 1), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await stakeManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.givePenalties(1, 1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await stakeManager.grantRole(await parameters.getBlockConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.givePenalties(1, 1), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(stakeManager.givePenalties(1, 1), expectedRevertMessage);
  });

  it('givePenalties() should be accessable by StakeModifier', async () => {
    await stakeManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
    await stakeManager.givePenalties(1, 1);
    await stakeManager.revokeRole(await parameters.getStakeModifierHash(), signers[0].address);
    await assertRevert(stakeManager.givePenalties(1, 1), expectedRevertMessage);
  });

  it('setStakerEpochLastRevealed() should not be accessable by anyone besides StakerActivityUpdater', async () => {
    // Checking if Anyone can access it\
    // await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await stakeManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await stakeManager.grantRole(await parameters.getBlockConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await stakeManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
    await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1), expectedRevertMessage);
  });

  it('setStakerEpochLastRevealed() should be accessable by StakerActivityUpdater', async () => {
    await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await stakeManager.setStakerEpochLastRevealed(1, 1);
    await stakeManager.revokeRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1), expectedRevertMessage);
  });

  it('updateCommitmentEpoch() should not be accessable by anyone besides StakerActivityUpdater', async () => {
    // Checking if Anyone can access it
    await assertRevert(stakeManager.updateCommitmentEpoch(1), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await stakeManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.updateCommitmentEpoch(1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await stakeManager.grantRole(await parameters.getBlockConfirmerHash(), signers[0].address);
    await assertRevert(stakeManager.updateCommitmentEpoch(1), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await stakeManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
    await assertRevert(stakeManager.updateCommitmentEpoch(1), expectedRevertMessage);
  });

  it('updateCommitmentEpoch() should be accessable by StakerActivityUpdater', async () => {
    await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await stakeManager.updateCommitmentEpoch(1);
    await stakeManager.revokeRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
    await assertRevert(stakeManager.updateCommitmentEpoch(1), expectedRevertMessage);
  });

  it('Only Default Admin should able to update Block Reward', async () => {
    await assertRevert(stakeManager.connect(signers[1]).updateBlockReward(100), expectedRevertMessage);
    assert(await stakeManager.updateBlockReward(100), 'Admin not able to update BlockReward');
  });

  it('Default Admin should able to change, New admin should able to grant/revoke', async () => {
    const expectedRevertMessage = 'AccessControl: sender must be an admin to grant';
    // Old admin should be able to grant admin role to another account
    await stakeManager.grantRole(DEFAULT_ADMIN_ROLE_HASH, signers[1].address);

    // New admin should be able to revoke admin access from old admin
    await stakeManager.connect(signers[1]).revokeRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);

    // Old admin should not able to assign roles anymore
    await assertRevert(stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address), expectedRevertMessage);

    // New admin should be able to assign roles
    await stakeManager.connect(signers[1]).grantRole(await parameters.getStakerActivityUpdaterHash(), signers[0].address);
  });
});

/* TODO:
test same vote values, stakes
test penalizeEpochs */
const merkle = require('@razor-network/merkle');
const { assert } = require('chai');
const { setupContracts } = require('./helpers/testSetup');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');

const {
  assertBNEqual,
  assertRevert,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');

const {
calculateDisputesData,
getEpoch,
getBiggestStakeAndId,
getIteration,
toBigNumber,
tokenAmount,
 } = require('./helpers/utils');

const { utils } = ethers;

describe('AssetManager', function () {
  let signers;
  let blockManager;
  let assetManager;
  let random;
  let schellingCoin;
  let stakeManager;
  let parameters;
  let voteManager;
  let initializeContracts;

  before(async () => {
    ({
      blockManager,
      parameters,
      assetManager,
      random,
      schellingCoin,
      stakeManager,
      voteManager,
      initializeContracts,
     } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Delegator', function () {
    it('Admin role should be granted', async () => {
      assert(await assetManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address) === true, 'Role was not Granted');
    });
    it('should be able to create Job', async function () {
      const url = 'http://testurl.com';
      const selector = 'selector';
      const name = 'test';
      const repeat = true;

      await assetManager.createJob(url, selector, name, repeat);
      await mineToNextEpoch();

      await assetManager.addPendingJobs();
      const job = await assetManager.jobs(1);
      //const pjob = await assetManager.pendingJobs(1);


      //await assetManager.addPendingJobs();
      // console.log(job);
      // console.log(pjob);

      assert(job.url === url);
      assert(job.selector === selector);
      assert(job.repeat === repeat);
      assertBNEqual(job.assetType, toBigNumber('1'));
      assertBNEqual((await assetManager.getNumAssets()), toBigNumber('1'));
    });

    it('should be able to create a Collection', async function () {
      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const name = 'test2';
      const repeat = true;
      await assetManager.createJob(url, selector, name, repeat);
      await mineToNextEpoch();
      await assetManager.addPendingJobs();

      const collectionName = 'Test Collection';
      await assetManager.createCollection(collectionName, [1, 2], 1);
      const collection = await assetManager.getCollection(3);
      assert(collection.name === collectionName);
      assertBNEqual(collection.aggregationMethod, toBigNumber('1'));
      assert((collection.jobIDs).length === 2);
      assertBNEqual((await assetManager.getNumAssets()), toBigNumber('3'));
    });

    it('should be able to add a job to a collection', async function () {
      const url = 'http://testurl.com/3';
      const selector = 'selector/3';
      const name = 'test3';
      const repeat = true;
      await assetManager.createJob(url, selector, name, repeat);
      await mineToNextEpoch();
      await assetManager.addPendingJobs();

      await assetManager.addJobToCollection(3, 4);
      const collection = await assetManager.getCollection(3);
      assert((collection.jobIDs).length === 3);
      assertBNEqual(collection.jobIDs[2], toBigNumber('4'));
    });

    it('should return the correct asset type when getAssetType is called', async function () {
      const numAssets = await assetManager.getNumAssets();
      for (let i = 1; i <= numAssets; i++) {
        const asset = await assetManager.getAssetType(i);
        if (i !== 3) {
          assertBNEqual(asset, toBigNumber('1'));
        } else {
          assertBNEqual(asset, toBigNumber('2'));
        }
      }
    });

    it('should fulfill result to the correct asset', async function () {
      await assetManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
      await assetManager.fulfillAsset(1, 111);
      await assetManager.fulfillAsset(2, 222);
      await assetManager.fulfillAsset(3, 333);
      await assetManager.fulfillAsset(4, 444);
      const j1 = await assetManager.getJob(1);
      const j2 = await assetManager.getJob(2);
      const c3 = await assetManager.getCollection(3);
      const j4 = await assetManager.getJob(4);
      assertBNEqual(j1.result, toBigNumber('111'));
      assertBNEqual(j2.result, toBigNumber('222'));
      assertBNEqual(c3.result, toBigNumber('333'));
      assertBNEqual(j4.result, toBigNumber('444'));
    });

    it('should not create a collection if one of the jobIDs is not a job', async function () {
      const collectionName = 'Test Collection2';
      const tx = assetManager.createCollection(collectionName, [1, 2, 5], 2);
      await assertRevert(tx, 'Job ID not present');
    });

    it('should not create collection if it does not have more than 1 or any jobIDs', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = assetManager.createCollection(collectionName, [], 1);
      await assertRevert(tx1, 'Number of jobIDs low to create collection');
      const tx2 = assetManager.createCollection(collectionName, [1], 1);
      await assertRevert(tx2, 'Number of jobIDs low to create collection');
    });

    it('aggregationMethod should not be equal to 0 or greater than 3', async function () {
      const url = 'http://testurl.com/4';
      const selector = 'selector/4';
      const name = 'test4';
      const repeat = true;
      await assetManager.createJob(url, selector, name, repeat);
      await mineToNextEpoch();
      await assetManager.addPendingJobs();
      const collectionName = 'Test Collection2';
      const tx1 = assetManager.createCollection(collectionName, [1, 2, 5], 4);
      await assertRevert(tx1, 'Aggregation range out of bounds');
      const tx2 = assetManager.createCollection(collectionName, [1, 2, 5], 0);
      await assertRevert(tx2, 'Aggregation range out of bounds');
      await assetManager.createCollection(collectionName, [1, 2, 5], 1);
    });

    it('should not create collection if duplicates jobIDs are present', async function () {
      const collectionName = 'Test Collection2';
      const tx = assetManager.createCollection(collectionName, [1, 2, 2, 5], 1);
      await assertRevert(tx, 'Duplicate JobIDs sent');
    });

    it('should not add jobID to a collection if the collectionID specified is not a collection', async function () {
      const tx = assetManager.addJobToCollection(5, 4);
      await assertRevert(tx, 'Collection ID not present');
    });

    it('should not add jobID to a collection if the jobID specified is not a Job', async function () {
    // jobID does not exist
      const tx = assetManager.addJobToCollection(3, 7);
      await assertRevert(tx, 'Job ID not present');
      // jobID specified is a collection
      const tx1 = assetManager.addJobToCollection(3, 6);
      await assertRevert(tx1, 'Job ID not present');
    });

    it('should not be add job if it already exists in the collection', async function () {
      const tx = assetManager.addJobToCollection(3, 1);
      await assertRevert(tx, 'Job exists in this collection');
    });

    it('should not increase numActiveJobs when a job is created during an epoch ', async function () {
      for(let i=1; i<9; i++)
      {
        await assetManager.createJob('http://testurl.com/%27'+String(i), 'selector'+String(i),  'test'+String(i), true);
      }
       await assetManager.createJob('http://testurl.com/%27'+String(9), 'selector'+String(9),  'test'+String(9), false);
       await Promise.all(await initializeContracts());
       await mineToNextEpoch();
       await assetManager.addPendingJobs();
       await schellingCoin.transfer(signers[3].address, tokenAmount('423000'));
       await schellingCoin.transfer(signers[4].address, tokenAmount('19000'));
       await schellingCoin.connect(signers[3]).approve(stakeManager.address, tokenAmount('420000'));
       await schellingCoin.connect(signers[4]).approve(stakeManager.address, tokenAmount('19000'));
       const epoch = await getEpoch();
       await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('420000'));
       await stakeManager.connect(signers[4]).stake(epoch, tokenAmount('19000'));
       const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
       const tree = merkle('keccak256').sync(votes);
       const root = tree.root();
       const commitment1 = utils.solidityKeccak256(
         ['uint256', 'uint256', 'bytes32'],
         [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
       );

       await voteManager.connect(signers[3]).commit(epoch, commitment1);
       const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
       const commitment2 = await voteManager.getCommitment(epoch, stakerIdAcc3);

       assertBNEqual(commitment1, commitment2, 'commitment1, commitment2 not equal');

       const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
       const tree2 = merkle('keccak256').sync(votes2);
       const root2 = tree2.root();
       const commitment3 = utils.solidityKeccak256(
         ['uint256', 'uint256', 'bytes32'],
         [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
       );

       await voteManager.connect(signers[4]).commit(epoch, commitment3);
        for(let i=1; i<5; i++)
        {
          await assetManager.createJob('http://testurl.com/%27'+String(i), 'selector'+String(i),  'test'+String(i), true);
        }
         await assetManager.createJob('http://testurl.com/%27'+String(5), 'selector'+String(5),  'test'+String(5), false);
         assertBNEqual(await assetManager.getActiveJobs(), toBigNumber('13'), 'Jobs are being added to current epcoh activeJobs which should not happen');
         assertBNEqual(await assetManager.getPendingJobs(), toBigNumber('5'), 'Jobs were not added to the pendingJobs list');
       });

       it('should be able to update the Active and Pending jobs succesfully in the next epoch', async function () {
         const epoch = await getEpoch();
         const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

         const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;

         const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
         const tree = merkle('keccak256').sync(votes);

         await mineToNextState(); // reveal

         const proof = [];
         for (let i = 0; i < votes.length; i++) {
           proof.push(tree.getProofPath(i, true, true));
         }

         await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
           '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
           signers[3].address);
         // arguments getvVote => epoch, stakerId, assetId
         assertBNEqual((await voteManager.getVote(epoch, stakerIdAcc3, 0)).value, toBigNumber('100'), 'Vote not equal to 100');

         const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
         const tree2 = merkle('keccak256').sync(votes2);
         const root2 = tree2.root();
         const proof2 = [];
         for (let i = 0; i < votes2.length; i++) {
           proof2.push(tree2.getProofPath(i, true, true));
         }
         await voteManager.connect(signers[4]).reveal(epoch, root2, votes2, proof2,
           '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
           signers[4].address);

         const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
         assertBNEqual(stakeBefore, stakeAfter);
          await mineToNextState();
          const staker = await stakeManager.getStaker(stakerIdAcc3);
          const { biggestStakerId } = await getBiggestStakeAndId(stakeManager);
          const iteration = await getIteration(stakeManager, random, staker);
          await blockManager.connect(signers[3]).propose(epoch,
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
            [100, 201, 300, 400, 500, 600, 700, 800, 900],
            [99, 199, 299, 399, 499, 599, 699, 799, 899],
            [101, 201, 301, 401, 501, 601, 701, 801, 901],
            iteration,
            biggestStakerId);
          const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
          assertBNEqual(proposedBlock.proposerId, toBigNumber('1'), 'incorrect proposalID');
            await mineToNextEpoch();
            const newepoch = await getEpoch();
            const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
            const tree3 = merkle('keccak256').sync(votes3);
            const root3 = tree3.root();
            const commitment1 = utils.solidityKeccak256(
              ['uint256', 'uint256', 'bytes32'],
              [newepoch, root3, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
            );
            await voteManager.connect(signers[3]).commit(newepoch, commitment1);
            const newstakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
            const commitment2 = await voteManager.getCommitment(newepoch, newstakerIdAcc3);

            assertBNEqual(commitment1, commitment2, 'commitment1, commitment2 not equal');
            assertBNEqual(await assetManager.getActiveJobs(), toBigNumber('18'), 'Jobs are being added to current epcoh activeJobs which should not happen');
            assertBNEqual(await assetManager.getPendingJobs(), toBigNumber('0'), 'Jobs were not added to the pendingJobs list');
          });




    // it('should be able to get result using proxy', async function () {
    //  await delegator.upgradeDelegate(assetManager.address);
    //  assert(await delegator.delegate() === assetManager.address);
    //
    //  const url = 'http://testurl.com/2';
    //  const selector = 'selector/2';
    //  const name = 'test2';
    //  const repeat = true;
    //  await assetManager.createJob(url, selector, name, repeat);
    //  //await assetManager.grantRole(await parameters.getJobConfirmerHash(), signers[0].address);
    //  await assetManager.fulfillJob(2, 222);
    // });
  });
});

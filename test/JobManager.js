/* TODO:
test same vote values, stakes
test penalizeEpochs */
const merkle = require('@razor-network/merkle');
const {
  assertBNEqual,
  assertBNNotEqual,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const {
  calculateDisputesData,
  getEpoch,
  getBiggestStakeAndId,
  getIteration,
  toBigNumber,
  tokenAmount,
} = require('./helpers/utils');

const { utils } = ethers;
describe('JobManager', function () {
  let signers;
  let constants;
  let delegator;
  let jobManager;
  let blockManager;
  let random;
  let schellingCoin;
  let stakeManager;
  let voteManager;
  let stateManager;
  let initializeContracts;

  before(async () => {
    ({ constants, delegator, jobManager, blockManager, random, schellingCoin, stakeManager, voteManager, stateManager, initializeContracts} = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Delegator', function () {
    it('admin role should be granted', async () => {
      const isAdminRoleGranted = await jobManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
      assert(isAdminRoleGranted === true, 'Admin role was not Granted');
    });

    // it('should be able to create Job', async function () {
    //   console.log(Number((await jobManager.getActiveJobs())));
    //   mineToNextEpoch();
    //   console.log(Number((await jobManager.getActiveJobs())));
    //   const url = 'http://testurl.com';
    //   const selector = 'selector';
    //   const name = 'test';
    //   const repeat = true;
    //   await jobManager.createJob(url, selector, name, repeat);
    //   const job = await jobManager.jobs(1);
    //   assert(job.url === url);
    //   assert(job.selector === selector);
    //   assert(job.repeat === repeat);
    // });
    //
    // it('should be able to get result using proxy', async function () {
    //   await delegator.upgradeDelegate(jobManager.address);
    //   assert(await delegator.delegate() === jobManager.address);
    //
    //   const url = 'http://testurl.com/2';
    //   const selector = 'selector/2';
    //   const name = 'test2';
    //   const repeat = true;
    //   await jobManager.createJob(url, selector, name, repeat);
    //   await jobManager.grantRole(await constants.getJobConfirmerHash(), signers[0].address);
    //   await jobManager.fulfillJob(2, 222);
    // });
    it('should not increase numActiveJobs when a job is created during an epoch ', async function () {
      for(let i=1; i<9; i++)
      {
        await jobManager.createJob('http://testurl.com/%27'+String(i), 'selector'+String(i),  'test'+String(i), true);
      }
       await jobManager.createJob('http://testurl.com/%27'+String(9), 'selector'+String(9),  'test'+String(9), false);
       await Promise.all(await initializeContracts());
       await mineToNextEpoch();
       await jobManager.addPendingJobs();
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
          await jobManager.createJob('http://testurl.com/%27'+String(i), 'selector'+String(i),  'test'+String(i), true);
        }
         await jobManager.createJob('http://testurl.com/%27'+String(5), 'selector'+String(5),  'test'+String(5), false);
         assertBNEqual(await jobManager.getActiveJobs(), toBigNumber('9'), 'Jobs are being added to current epcoh activeJobs which should not happen');
         assertBNEqual(await jobManager.getPendingJobs(), toBigNumber('5'), 'Jobs were not added to the pendingJobs list');
       });

       it('should be able to update the Active and Pending jobs succesfully in the next epoch', async function () {
         const epoch = await getEpoch();
         const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

         const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;

         const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
         const tree = merkle('keccak256').sync(votes);

         //await mineToNextState(); // reveal

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
            assertBNEqual(await jobManager.getActiveJobs(), toBigNumber('13'), 'Jobs are being added to current epcoh activeJobs which should not happen');
            assertBNEqual(await jobManager.getPendingJobs(), toBigNumber('0'), 'Jobs were not added to the pendingJobs list');
          });

  });
});

/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { setupContracts } = require('./helpers/testSetup');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');

const { 
  assertBNEqual,
  toBigNumber } = require('./helpers/utils');
const { assert } = require('chai');

describe('JobManager', function () {
  let signers;
  let constants;
  let delegator;
  let jobManager;

  before(async () => {
    ({ constants, delegator, jobManager } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Delegator', function () {
    it('Admin role should be granted',async () => {

      assert(await jobManager.hasRole(DEFAULT_ADMIN_ROLE_HASH,signers[0].address)===true,"Role was not Granted")

    });
    it('should be able to create Job', async function () {
      const url = 'http://testurl.com';
      const selector = 'selector';
      const name = 'test';
      const repeat = true;
      await jobManager.createJob(url, selector, name, repeat);
      const job = await jobManager.jobs(1);
      assert(job.url === url);
      assert(job.selector === selector);
      assert(job.repeat === repeat);
      assert(Number(job.assetType) == 1);
      assert((await jobManager.getJobList()).length === 1)
      assert(Number(await jobManager.getNumAssets()) === 1)
    });

    it('should be able to create a Collection', async function() {
      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const name = 'test2';
      const repeat = true;
      await jobManager.createJob(url, selector, name, repeat);

      const collectionName = 'Test Collection'
      await jobManager.createCollection(collectionName, [1,2], 1);
      const collection = await jobManager.getCollection(3);
      assert(collection.name===collectionName);
      assertBNEqual(collection.aggregationMethod===toBigNumber('1'))
      assert((collection.jobIDs).length===2);
      assert((await jobManager.getCollectionList()).length === 1)
      assert(Number(await jobManager.getNumAssets()) === 3)
      
    })

    it('should be able to add a job to a collection', async function(){
      const url = 'http://testurl.com/3';
      const selector = 'selector/3';
      const name = 'test3';
      const repeat = true;
      await jobManager.createJob(url, selector, name, repeat);

      await jobManager.addJobToCollection(3,4)
      const collection = await jobManager.getCollection(3);
      assert((collection.jobIDs).length===3);
      assert(Number(collection.jobIDs[2])===4)
    })

    it('should fulfill result to the correct asset', async function(){
      await jobManager.grantRole(await constants.getJobConfirmerHash(), signers[0].address);
      await jobManager.fulfillJob(1, 111);
      await jobManager.fulfillJob(2, 222);
      await jobManager.fulfillJob(3, 333);
      await jobManager.fulfillJob(4, 444);
      const j1 = await jobManager.getJob(1);
      const j2 = await jobManager.getJob(2);
      const c3 = await jobManager.getCollection(3);
      const j4 = await jobManager.getJob(4);
      assertBNEqual(j1.result===toBigNumber('111'))
      assertBNEqual(j2.result===toBigNumber('222'))
      assertBNEqual(c3.result===toBigNumber('333'))
      assertBNEqual(j4.result===toBigNumber('444'))
    })

    //it('should be able to get result using proxy', async function () {
    //  await delegator.upgradeDelegate(jobManager.address);
    //  assert(await delegator.delegate() === jobManager.address);
//
    //  const url = 'http://testurl.com/2';
    //  const selector = 'selector/2';
    //  const name = 'test2';
    //  const repeat = true;
    //  await jobManager.createJob(url, selector, name, repeat);
    //  //await jobManager.grantRole(await constants.getJobConfirmerHash(), signers[0].address);
    //  await jobManager.fulfillJob(2, 222);
    //});
  });
});
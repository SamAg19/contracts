/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { setupContracts } = require('./helpers/testSetup');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const {
  assertRevert
} = require('./helpers/testHelpers');


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
    it('admin role should be granted', async () => {
      const isAdminRoleGranted = await jobManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
      assert(isAdminRoleGranted === true, 'Admin role was not Granted');
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
    });

    it('aggregationMethod should not be less than 0 or greater than 3', async function(){

      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const name = 'test2';
      const repeat = true;
      await jobManager.createJob(url, selector, name, repeat);
      const collectionName ='Test Collection';
      const tx1=jobManager.createCollection(collectionName,[1,2],4);
      await assertRevert(tx1,'Aggregation range out of bounds');
      await jobManager.createCollection(collectionName,[1,2],1);


    });

    it('collectionID should be present in collection List',async function(){

      const tx = jobManager.addJobToCollection(5,4);
      await assertRevert(tx ,'Collection ID not present');
   });

   it('jobID should be present in job List',async function(){

     const tx = jobManager.addJobToCollection(3,6);
     await assertRevert(tx,'Job ID not present');
   });

   it('collectionID and jobID should not be same',async function(){

     const url = 'http://testurl.com/4';
     const selector = 'selector/4';
     const name = 'test4';
     const repeat = true;
     await jobManager.createJob(url, selector, name, repeat);
     const tx = jobManager.addJobToCollection(3,3);
     await assertRevert(tx,'Job ID not present');
   });

   it('job should not be added if it already exists in the collection',async function(){

     const tx = jobManager.addJobToCollection(3,1);
     await assertRevert(tx,'Job exists in this collection');
   });



    it('should be able to get result using proxy', async function () {
      await delegator.upgradeDelegate(jobManager.address);
      assert(await delegator.delegate() === jobManager.address);

      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const name = 'test2';
      const repeat = true;
      await jobManager.createJob(url, selector, name, repeat);
      await jobManager.grantRole(await constants.getJobConfirmerHash(), signers[0].address);
      await jobManager.fulfillJob(2, 222);
    });
  });
});

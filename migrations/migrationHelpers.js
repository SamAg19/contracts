/* eslint-disable no-console */
const jsonfile = require('jsonfile');
const hre = require('hardhat');
const axios = require('axios');
const ethProvider = require('eth-provider') // eth-provider is a simple EIP-1193 provider
const frame = ethProvider('frame')

const { BigNumber } = ethers;

const DEPLOYMENT_FILE = `${__dirname}/../.contract-deployment.tmp.json`;
const OLD_DEPLOYMENT_FILE = `${__dirname}/../.previous-deployment-addresses`;

const readDeploymentFile = async () => jsonfile.readFile(DEPLOYMENT_FILE);

const readOldDeploymentFile = async () => jsonfile.readFile(OLD_DEPLOYMENT_FILE);

const writeDeploymentFile = async (data) => jsonfile.writeFile(DEPLOYMENT_FILE, data);

const appendDeploymentFile = async (data) => {
  let deployments = {};

  try {
    deployments = await readDeploymentFile();
  } catch (e) {
    console.log("Deployment file doesn't exist, generating it...");
  }

  await jsonfile.writeFile(DEPLOYMENT_FILE, { ...deployments, ...data });
};

const deployContract = async (
  contractName,
  linkDependecies = [],
  constructorParams = []
) => {
  let Contract;

  if (linkDependecies.length !== 0) {
    const dependencies = {};
    const contractAddresses = await readDeploymentFile();

    for (let i = 0; i < linkDependecies.length; i++) {
      dependencies[linkDependecies[i]] = contractAddresses[linkDependecies[i]];
    }

    Contract = await ethers.getContractFactory(contractName, {
      libraries: {
        ...dependencies,
      },
    });
  } else {
    Contract = await ethers.getContractFactory(contractName);
  }
  let tx = await Contract.getDeployTransaction(...constructorParams);

  tx.from = (await frame.request({ method: 'eth_requestAccounts' }))[0]

    // Sign and send the transaction using Frame
  const x = await frame.request({ method: 'eth_sendTransaction', params: [tx] })

  console.log(
    `${contractName} deployment tx.hash = ${x} ...`
  );

  const txReceipt = await ethers.provider.getTransaction(x);
  await txReceipt.wait()

  //await contract.deployed();

  //try {
  //  await hre.tenderly.persistArtifacts({
  //    name: contractName,
  //    address: txReceipt.creates,
  //  });
//
  //  await hre.tenderly.push({
  //    name: contractName,
  //    address: txReceipt.creates,
  //  });
//
  //  await hre.tenderly.verify({
  //    name: contractName,
  //    address: txReceipt.creates,
  //  });
  //} catch (err) {
  //  console.log('Error pushing to tenderly:', err);
  //}
  

  await appendDeploymentFile({ [contractName]: txReceipt.creates });
  console.log(`${contractName} deployed to: ${txReceipt.creates}`);

  const config = {
    address: txReceipt.creates,
    constructorArguments: [...constructorParams],
  };

  // We need to set explicitly for these as it was causing conflicts with OpenZeplin
  if (contractName === 'Structs') {
    config.contract = 'contracts/lib/Structs.sol:Structs';
  }

  if (contractName === 'RAZOR') {
    config.contract = 'contracts/tokenization/RAZOR.sol:RAZOR';
  }

  //try {
  //  await hre.run('verify:verify', config);
  //} catch (err) {
  //  console.error('Etherscan verification failed', err);
  //}
};

const getdeployedContractInstance = async (
  contractName,
  contractAddress,
  linkDependecies = {}
) => {
  let Contract;

  if (Object.keys(linkDependecies).length !== 0) {
    Contract = await ethers.getContractFactory(contractName, {
      libraries: {
        ...linkDependecies,
      },
    });
  } else {
    Contract = await ethers.getContractFactory(contractName);
  }

  const contractInstance = await Contract.attach(contractAddress);

  return { Contract, contractInstance };
};

const SOURCE = 'https://raw.githubusercontent.com/razor-network/datasources/master';

const getJobs = async () => {
  try {
    const jobs = await axios.get(`${SOURCE}/jobs.json`);
    return jobs.data;
  } catch (error) {
    console.log('Error while fetching jobs', error.response.body);
    return null;
  }
};

const getCollections = async () => {
  try {
    const collections = await axios.get(`${SOURCE}/collections.json`);
    return collections.data;
  } catch (error) {
    console.log('Error while fetching collections', error.response.body);
    return null;
  }
};

const currentState = async (numStates, stateLength) => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const getCurrentBlock = await ethers.provider.getBlock(Number(blockNumber));
  const timestamp = BigNumber.from(getCurrentBlock.timestamp);
  const state = timestamp.div(stateLength);
  const lowerLimit = 5;
  const upperLimit = stateLength - 5;
  if (timestamp % (stateLength) > upperLimit || timestamp % (stateLength) < lowerLimit) {
    return -1;
  } else {
    return Number(state.mod(numStates));
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const waitForConfirmState = async (numStates, stateLength) => {
  let state = await currentState(numStates, stateLength);
  while (state !== 4) {
    state = await currentState(numStates, stateLength);
    console.log('Current state', state);
    await sleep(10000);
  }
};

module.exports = {
  deployContract,
  getdeployedContractInstance,
  appendDeploymentFile,
  readDeploymentFile,
  readOldDeploymentFile,
  writeDeploymentFile,
  getJobs,
  getCollections,
  sleep,
  waitForConfirmState,
};

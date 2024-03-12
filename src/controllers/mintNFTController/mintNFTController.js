import "dotenv/config";
import async from "async";
import UniversalFunctions from "../../utils/universalFunctions.js";
const ERROR = UniversalFunctions.CONFIG.APP_CONSTANTS.STATUS_MSG.ERROR;
import { getNftABI, getNftBin, respondToServer } from "../../helpers/helperFunctions.js";
import Web3 from 'web3'; // Ethereum Interaction facilitator

// Setup
const provider = new Web3.providers.WebsocketProvider(process.env.SEPOLIA_RPC); // Set provider for sepolia node
const web3 = new Web3(provider); // Create web3 instance
const signer = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY); // Set signer from private key
web3.eth.accounts.wallet.add(signer); // Add signer to wallet

// Get contracts
const NftContract = new web3.eth.Contract(getNftABI(), { from: signer.address });



/**
 * @param {Object} payloadData
 * @param {String} payloadData.jobID
 * @param {String} payloadData.datashopServerAddress
 * @param {Object} payloadData.dataFileURL
 * @param {String} payloadData.dataFileURL.url
 * @param {Object} payloadData.dataFileURL.json
 * @param {String} payloadData.dataFileURL.json.assetName
 * @param {String} payloadData.dataFileURL.json.assetUnitName
 * @param {String} payloadData.dataFileURL.json.totalSupply
 * @param {Number} payloadData.dataFileURL.json.decimals
 * @param {Number} payloadData.dataFileURL.json.assetURL
 * @param {String} payloadData.dataFileURL.json.receiver
 * @param {Function} callback
 */
const mintNftIPFS = (payloadData, callback) => {
    let nftContractAddress;

    let data = payloadData.dataFileURL.json;

    let assetName = data.assetName;
    let assetUnitName = data.assetUnitName;
    let totalSupply = data.totalSupply;
    let decimals = data.decimals;
    let assetURL = data.assetURL;
    let receiver = data.receiver;

    let _nftContractInstance;

    const tasks = {
        deployNftContract: async (cb) => {
            console.log("=== DEPLOY COMPANY CONTRACT ===");
            try {
                const args = [receiver, assetName, assetUnitName, assetURL];

                const nftContractEstimatedGas = await NftContract.deploy({
                    data: getNftBin(),
                    arguments: args
                }).estimateGas();

                const nftContractInstance = await NftContract.deploy({
                    data: getNftBin(),
                    arguments: args
                }).send({
                    from: signer.address,
                    gas: nftContractEstimatedGas
                }).once("receipt", (receipt) => {
                    console.log(`NFT contract creation transaction mined!`);
                });

                nftContractAddress = nftContractInstance.options.address;
                _nftContractInstance = nftContractInstance;
            } catch (err) {
                console.log(err);
                cb(ERROR.APP_ERROR);
            }
        },
    };
    async.series(tasks, (err, _) => {
        let returnData;
        if (err || !nftContractAddress) {
            // respond to server with error
            returnData = null;
            // return callback(err)
        } else {
            // respond to server with success
            returnData = { nftContractAddress };
            // callback(null, { returnData })
        }
        respondToServer(payloadData, returnData, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log(result);
            }
        });

    });
};

export default {
    mintNftIPFS: mintNftIPFS
};

/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable consistent-return */
/* eslint-disable import/no-extraneous-dependencies */
/**
 * This script demonstrates how to mint an additional compressed NFT to an
 * existing tree and/or collection, using the `@metaplex-foundation/js` SDK
 * ---
 * NOTE: A collection can use multiple trees to store compressed NFTs, as desired.
 * This example uses the same tree for simplicity.
 */

// imports from other libraries
import {
  keypairIdentity,
  Metaplex,
  ReadApiConnection,
} from '@metaplex-foundation/js';
import { clusterApiUrl, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

// import custom helpers for demos
import {
  explorerURL,
  loadKeypairFromFile,
  loadOrGenerateKeypair,
  loadPublicKeysFromFile,
  printConsoleSeparator,
  savePublicKeyToFile,
} from '../utils/helpers';

// load the env variables and store the cluster RPC url
dotenv.config();
const CLUSTER_URL = process.env.RPC_URL ?? clusterApiUrl('devnet');

// create a new rpc connection
// const connection = new Connection(CLUSTER_URL);
const connection = new ReadApiConnection(CLUSTER_URL);

(async () => {
  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  // generate a new Keypair for testing, named `testWallet`
  const testWallet = loadOrGenerateKeypair('testWallet');

  // generate a new keypair for use in this demo (or load it locally from the filesystem when available)
  const payer = process.env?.LOCAL_PAYER_JSON_ABSPATH
    ? loadKeypairFromFile(process.env?.LOCAL_PAYER_JSON_ABSPATH)
    : loadOrGenerateKeypair('payer');

  console.log('Payer address:', payer.publicKey.toBase58());
  console.log('Test wallet address:', testWallet.publicKey.toBase58());

  // load the stored PublicKeys for ease of use
  const keys = loadPublicKeysFromFile();

  // ensure the primary script was already run
  if (!keys?.collectionMint || !keys?.treeAddress)
    return console.warn(
      'No local keys were found. Please run the `index` script',
    );

  const { treeAddress } = keys;
  const { collectionMint } = keys;
  const { collectionAuthority } = keys;

  console.log('==== Local PublicKeys loaded ====');
  console.log('Tree address:', treeAddress.toBase58());
  console.log('Collection mint:', collectionMint.toBase58());
  console.log('User address:', payer.publicKey.toBase58());
  console.log('Test address:', testWallet.publicKey.toBase58());

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  // initialize metaplex with our RPC connection, and the payer of the transactions
  const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));
  // const metaplex = Metaplex.make(connection).use(keypairIdentity(testWallet));

  printConsoleSeparator('Mint a single compressed NFT into the collection:');

  /**
   * minting compressed NFTs with the metaplex sdk is very much identical to minting non-compressed nfts
   *
   * the difference is that when you want to mint a compressed nft into a collection,
   * you simply provide the `tree` address that will store the compressed nft.
   *
   * when `tree` is present, the metaplex sdk knows you want to mint a compressed nft and will handle the rest!
   */

  // mint a new compressed NFT into our existing collection
  const { response, nft } = await metaplex.nfts().create({
    uri: 'https://supersweetcollection.notarealurl/token.json',
    name: 'compressed with metaplex',
    sellerFeeBasisPoints: 500,
    collection: collectionMint,
    // note: the `payer` is also this collection's authority
    collectionAuthority: payer,

    // note: this merkle tree must have already been created
    tree: treeAddress,
  });

  // save the `assetId` of the new compressed NFT locally
  savePublicKeyToFile('assetIdTestAddress', new PublicKey(nft.address));

  console.log('nft minted with metaplex sdk:', nft);

  printConsoleSeparator('View on explorer');

  console.log(explorerURL({ txSignature: response.signature }));
})();

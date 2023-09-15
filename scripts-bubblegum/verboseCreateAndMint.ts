/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
/* eslint-disable import/no-extraneous-dependencies */
/**
 * Compressed NFTs on Solana, using State Compression
  ---
  Overall flow of this script
  - load or create two keypairs (named `payer` and `testWallet`)
  - create a new tree with enough space to mint all the nft's you want for the "collection"
  - create a new NFT Collection on chain (using the usual Metaplex methods)
  - mint a single compressed nft into the tree to the `payer`
  - mint a single compressed nft into the tree to the `testWallet`
  - display the overall cost to perform all these actions

  ---
  NOTE: this script is identical to the `scripts/createAndMint.ts` file, except THIS file has
  additional explanation, comments, and console logging for demonstration purposes.
*/

/**
 * General process of minting a compressed NFT:
 * - create a tree
 * - create a collection
 * - mint compressed NFTs to the tree
 */

import type { MetadataArgs } from '@metaplex-foundation/mpl-bubblegum';
import {
  TokenProgramVersion,
  TokenStandard,
} from '@metaplex-foundation/mpl-bubblegum';
import type { CreateMetadataAccountArgsV3 } from '@metaplex-foundation/mpl-token-metadata';
import type { ValidDepthSizePair } from '@solana/spl-account-compression';
import { getConcurrentMerkleTreeAccountSize } from '@solana/spl-account-compression';
import { clusterApiUrl, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

// local import of the connection wrapper, to help with using the ReadApi
import { WrapperConnection } from '../ReadApi/WrapperConnection';
// import custom helpers to mint compressed NFTs
import { mintCompressedNFT } from '../utils/compression';
// import custom helpers for demos
import {
  loadKeypairFromFile,
  loadOrGenerateKeypair,
  numberFormatter,
  printConsoleSeparator,
  savePublicKeyToFile,
} from '../utils/helpers';

dotenv.config();

// define some reusable balance values for tracking
let initBalance: number;
let balance: number;

export const verboseCreateAndMint = async () => {
  console.log('abc');
  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  // generate a new Keypair for testing, named `wallet`
  const testWallet = loadOrGenerateKeypair('testWallet');

  // generate a new keypair for use in this demo (or load it locally from the filesystem when available)
  const payer = process.env?.LOCAL_PAYER_JSON_ABSPATH
    ? loadKeypairFromFile(process.env?.LOCAL_PAYER_JSON_ABSPATH)
    : loadOrGenerateKeypair('payer');

  console.log('Payer address:', payer.publicKey.toBase58());
  console.log('Test wallet address:', testWallet.publicKey.toBase58());

  // locally save the addresses for the demo
  savePublicKeyToFile('userAddress', payer.publicKey);
  savePublicKeyToFile('testWallet', testWallet.publicKey);

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  // load the env variables and store the cluster RPC url
  const CLUSTER_URL = process.env.RPC_URL ?? clusterApiUrl('devnet');

  // create a new rpc connection, using the ReadApi wrapper
  const connection = new WrapperConnection(CLUSTER_URL, 'confirmed');

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  // get the payer's starting balance
  initBalance = await connection.getBalance(payer.publicKey);
  console.log(
    'Starting account balance:',
    numberFormatter(initBalance / LAMPORTS_PER_SOL),
    'SOL\n',
  );

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  /*
    Define our tree size parameters
  */
  const maxDepthSizePair: ValidDepthSizePair = {
    // max=8 nodes
    // maxDepth: 3,
    // maxBufferSize: 8,

    // max=16,384 nodes
    maxDepth: 14,
    maxBufferSize: 64,

    // max=131,072 nodes
    // maxDepth: 17,
    // maxBufferSize: 64,

    // max=1,048,576 nodes
    // maxDepth: 20,
    // maxBufferSize: 256,

    // max=1,073,741,824 nodes
    // maxDepth: 30,
    // maxBufferSize: 2048,
  };
  const canopyDepth = maxDepthSizePair.maxDepth - 5;

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  /*
    For demonstration purposes, we can compute how much space our tree will
    need to allocate to store all the records. As well as the cost to allocate
    this space (aka minimum balance to be rent exempt)
    ---
    NOTE: These are performed automatically when using the `createAllocTreeIx`
    function to ensure enough space is allocated, and rent paid.
  */

  // calculate the space available in the tree
  const requiredSpace = getConcurrentMerkleTreeAccountSize(
    maxDepthSizePair.maxDepth,
    maxDepthSizePair.maxBufferSize,
    canopyDepth,
  );

  const storageCost =
    await connection.getMinimumBalanceForRentExemption(requiredSpace);

  // demonstrate data points for compressed NFTs
  console.log('Space to allocate:', numberFormatter(requiredSpace), 'bytes');
  console.log(
    'Estimated cost to allocate space:',
    numberFormatter(storageCost / LAMPORTS_PER_SOL),
  );
  console.log(
    'Max compressed NFTs for tree:',
    numberFormatter(2 ** maxDepthSizePair.maxDepth),
    '\n',
  );

  // ensure the payer has enough balance to create the allocate the Merkle tree
  if (initBalance < storageCost)
    return console.error('Not enough SOL to allocate the merkle tree');
  printConsoleSeparator();

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  /*
    Actually allocate the tree on chain
  */

  // define the address the tree will live at
  const treeKeypair = {
    _keypair: {
      publicKey: new PublicKey([
        130, 96, 227, 176, 23, 192, 31, 191, 93, 185, 129, 115, 71, 51, 169, 15,
        69, 70, 162, 177, 63, 103, 204, 255, 251, 103, 70, 242, 172, 184, 30,
        138,
      ]),
    },
  };

  // create and send the transaction to create the tree on chain
  // const tree = await createTree(
  //   connection,
  //   payer,
  //   treeKeypair,
  //   maxDepthSizePair,
  //   canopyDepth,
  // );

  // // locally save the addresses for the demo
  // savePublicKeyToFile('treeAddress', tree.treeAddress);
  // savePublicKeyToFile('treeAuthority', tree.treeAuthority);

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  /*
    Create the actual NFT collection (using the normal Metaplex method)
    (nothing special about compression here)
  */

  // define the metadata to be used for creating the NFT collection
  const collectionMetadataV3: CreateMetadataAccountArgsV3 = {
    data: {
      name: 'Super Sweet NFT Collection',
      symbol: 'SSNC',
      // specific json metadata for the collection
      uri: 'https://supersweetcollection.notarealurl/collection.json',
      sellerFeeBasisPoints: 100,
      creators: [
        {
          address: payer.publicKey,
          verified: false,
          share: 100,
        },
      ], // or set to `null`
      collection: null,
      uses: null,
    },
    isMutable: false,
    collectionDetails: null,
  };

  // create a full token mint and initialize the collection (with the `payer` as the authority)
  // const collection = await createCollection(
  //   connection,
  //   payer,
  //   collectionMetadataV3,
  // );

  const collection = {
    mint: new PublicKey('Cc4bV4bjeNNcGSeSU52JhH1Mtg8NpjNUPQUX8jbMPGcT'),
    tokenAccount: new PublicKey('9r9a2TK67d5tcyDWMZN5pQSWPc1j1xVuPGB6iQtSnQ8N'),
    metadataAccount: new PublicKey(
      '9zK5QaBMPDN7MvQse6JrsinoxMNE63GYGCfzCEyVmWyn',
    ),
    masterEditionAccount: new PublicKey(
      'GW2im5jAqeUQj5qfYQEZqwQ8TyA5oSwyKRowCptRPAyv',
    ),
  };

  // locally save the addresses for the demo
  // savePublicKeyToFile('collectionMint', collection.mint);
  // savePublicKeyToFile('collectionMetadataAccount', collection.metadataAccount);
  // savePublicKeyToFile(
  //   'collectionMasterEditionAccount',
  //   collection.masterEditionAccount,
  // );

  /**
   * INFO: NFT collection != tree
   * ---
   * NFTs collections can use multiple trees for their same collection.
   * When minting any compressed NFT, simply pass the collection's addresses
   * in the transaction using any valid tree the `payer` has authority over.
   *
   * These minted compressed NFTs should all still be apart of the same collection
   * on marketplaces and wallets.
   */

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  /*
    Mint a single compressed NFT
  */

  const compressedNFTMetadata: MetadataArgs = {
    name: 'cNFT',
    symbol: collectionMetadataV3.data.symbol,
    // specific json metadata for each NFT
    uri: 'https://supersweetcollection.notarealurl/token.json',
    creators: [
      {
        address: payer.publicKey,
        verified: false,
        share: 100,
      },
      {
        address: testWallet.publicKey,
        verified: false,
        share: 0,
      },
    ], // or set to null
    editionNonce: 0,
    uses: null,
    collection: null,
    primarySaleHappened: false,
    sellerFeeBasisPoints: 0,
    isMutable: false,
    // these values are taken from the Bubblegum package
    tokenProgramVersion: TokenProgramVersion.Original,
    tokenStandard: TokenStandard.NonFungible,
  };

  // fully mint a single compressed NFT to the payer
  console.log(
    `Minting a single compressed NFT to ${payer.publicKey.toBase58()}...`,
  );

  await mintCompressedNFT(
    connection,
    payer,
    treeKeypair._keypair.publicKey,
    collection.mint,
    collection.metadataAccount,
    collection.masterEditionAccount,
    compressedNFTMetadata,
    // mint to this specific wallet (in this case, the tree owner aka `payer`)
    payer.publicKey,
  );

  console.log({
    treeKeypair,
    collection,
  });

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  // fetch the payer's final balance
  balance = await connection.getBalance(payer.publicKey);
  console.log(`Mint success...`);
  console.log(`===============================`);
  console.log(
    'Total cost:',
    numberFormatter((initBalance - balance) / LAMPORTS_PER_SOL, true),
    'SOL\n',
  );
};

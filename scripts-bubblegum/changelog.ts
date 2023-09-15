/* eslint-disable import/no-extraneous-dependencies */
/**
 * Demonstrate the use of a few of the Metaplex Read API methods,
 * (needed to fetch compressed NFTs)
 */

// local import of the connection wrapper, to help with using the ReadApi
import { getLeafAssetId } from '@metaplex-foundation/mpl-bubblegum';
import { BN } from '@project-serum/anchor';
import { getAllChangeLogEventV1FromTransaction } from '@solana/spl-account-compression';
import { clusterApiUrl } from '@solana/web3.js';
import dotenv from 'dotenv';

import { WrapperConnection } from '../ReadApi/WrapperConnection';
// import custom helpers for demos
import {
  loadKeypairFromFile,
  loadOrGenerateKeypair,
  printConsoleSeparator,
} from '../utils/helpers';

dotenv.config();

(async () => {
  // generate a new Keypair for testing, named `wallet`
  const testWallet = loadOrGenerateKeypair('testWallet');

  // generate a new keypair for use in this demo (or load it locally from the filesystem when available)
  const payer = process.env?.LOCAL_PAYER_JSON_ABSPATH
    ? loadKeypairFromFile(process.env?.LOCAL_PAYER_JSON_ABSPATH)
    : loadOrGenerateKeypair('payer');

  console.log('Payer address:', payer.publicKey.toBase58());
  console.log('Test wallet address:', testWallet.publicKey.toBase58());

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  // load the env variables and store the cluster RPC url
  const CLUSTER_URL = process.env.RPC_URL ?? clusterApiUrl('devnet');

  // create a new rpc connection, using the ReadApi wrapper
  const connection = new WrapperConnection(CLUSTER_URL);

  /// ///////////////////////////////////////////////////////////////////////////
  /// ///////////////////////////////////////////////////////////////////////////

  printConsoleSeparator('');

  // load the stored PublicKeys for ease of use

  // https://explorer.solana.com/tx/3V1pMta1aKzJdnYwttHR5qtrPVQfazwdUykvgM1YY5Xwb2x6hwttLj9R1hJi4ZjMA9KaXWGx9LxiNBAAoAHKsKdn?cluster=devnet
  const devnetSig =
    '3V1pMta1aKzJdnYwttHR5qtrPVQfazwdUykvgM1YY5Xwb2x6hwttLj9R1hJi4ZjMA9KaXWGx9LxiNBAAoAHKsKdn';

  const tx = await connection.getTransaction(devnetSig, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) throw Error('Tx not found');

  printConsoleSeparator('Events:');

  const events = getAllChangeLogEventV1FromTransaction(tx);

  console.log(events);

  const assetId = await getLeafAssetId(
    events[0].treeId,
    new BN(events[0].index),
  );

  console.log('assetId:', assetId);
  console.log('total events:', events.length);
})();

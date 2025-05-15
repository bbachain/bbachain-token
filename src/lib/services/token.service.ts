import axios from 'axios'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@bbachain/web3.js'
import { Metadata, PROGRAM_ID } from '@bbachain/spl-token-metadata'
import type {
	TCreateToken,
	TGetToken,
	TTokenMetadata,
	TTokenMetadataOffChain,
	TTokenMetadataOffChainData
} from '@/lib/types/response.types'
import {
	createAssociatedTokenAccountInstruction,
	createInitializeMintInstruction,
	createMintToInstruction,
	getAssociatedTokenAddress,
	getMinimumBalanceForRentExemptMint,
	getMint,
	MINT_SIZE,
	TOKEN_PROGRAM_ID
} from '@bbachain/spl-token'
import { CreateTokenPayload } from '../types/request.types'
import { WalletAdapterProps } from '@bbachain/wallet-adapter-base'

export const getTokenMetadata = async (connection: Connection, mintAddress: PublicKey) => {
	const initialMetadataOffChainData: TTokenMetadataOffChainData = {
		name: null,
		symbol: null,
		description: null,
		image: null
	}

	const initialMetadataOffChain: TTokenMetadataOffChain = {
		link: null,
		data: initialMetadataOffChainData
	}

	const tokenMetadata: TTokenMetadata = {
		metadataAddress: null,
		isMutable: true,
		name: null,
		symbol: null,
		metadataOffChain: initialMetadataOffChain
	}

	try {
		const [metadataPda] = PublicKey.findProgramAddressSync(
			[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
			PROGRAM_ID
		)

		tokenMetadata.metadataAddress = metadataPda.toBase58()
		const accountInfo = await connection.getAccountInfo(metadataPda)

		if (!accountInfo?.data) return tokenMetadata

		const [metadata] = Metadata.deserialize(accountInfo.data)
		tokenMetadata.isMutable = metadata.isMutable

		const { name, symbol, uri } = metadata.data
		tokenMetadata.name = name
		tokenMetadata.symbol = symbol

		if (uri) {
			const { data } = await axios.get<TTokenMetadataOffChainData>(uri)
			tokenMetadata.metadataOffChain.link = uri
			tokenMetadata.metadataOffChain.data = data
		}
	} catch (error) {
		console.warn('Error fetching token metadata:', error)
	}

	return tokenMetadata
}

export const createTokenMetadata = async (connection: Connection, mintKeypair: Keypair, ) => {

}

export const getTokenData = async (connection: Connection, mintAddress: PublicKey): Promise<TGetToken | null> => {
	const mintAccountInfo = await getMint(connection, mintAddress)
	const decimals = mintAccountInfo.decimals
	const supply = Number(mintAccountInfo.supply) / Math.pow(10, decimals)

	if (decimals === 0 && supply === 1) return null // this is hack to return only Fungible Tokens, cause this condition is NFT state

	const signatures = await connection.getSignaturesForAddress(mintAddress)

	const revokeMint = mintAccountInfo.mintAuthority === null
	const revokeFreeze = mintAccountInfo.freezeAuthority === null
	const blockTime = signatures?.[signatures.length - 1]?.blockTime ?? 0

	const authoritiesState = { revokeFreeze, revokeMint }
	const metadata = await getTokenMetadata(connection, mintAddress)

	return {
		mintAddress: mintAddress.toBase58(),
		decimals,
		supply,
		authoritiesState,
		metadata,
		createdAt: blockTime
	}
}

export const createToken = async (
	connection: Connection,
	ownerAddress: PublicKey,
	payload: CreateTokenPayload,
	sendTransaction: WalletAdapterProps['sendTransaction']
) => {
	const daltons = await getMinimumBalanceForRentExemptMint(connection)
	const latestBlockhash = await connection.getLatestBlockhash()
	const mintKeypair = Keypair.generate()
	const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, ownerAddress)

	const payloadData = {
		...payload,
		description: payload.description === '' ? null : payload.description,
		decimals: Number(payload.decimals),
		supply: Number(payload.supply)
	}

	const createAccountTx = new Transaction().add(
		SystemProgram.createAccount({
			fromPubkey: ownerAddress,
			newAccountPubkey: mintKeypair.publicKey,
			space: MINT_SIZE,
			daltons,
			programId: TOKEN_PROGRAM_ID
		}),
		createInitializeMintInstruction(
			mintKeypair.publicKey,
			payloadData.decimals,
			ownerAddress,
			ownerAddress,
			TOKEN_PROGRAM_ID
		),
		createAssociatedTokenAccountInstruction(ownerAddress, tokenATA, ownerAddress, mintKeypair.publicKey),
		createMintToInstruction(
			mintKeypair.publicKey,
			tokenATA,
			ownerAddress, // mint authority
			payloadData.supply * Math.pow(10, payloadData.decimals)
		)
	)

	createAccountTx.recentBlockhash = latestBlockhash.blockhash
	createAccountTx.feePayer = ownerAddress

	createAccountTx.partialSign(mintKeypair)
	const createSignature = await sendTransaction(createAccountTx, connection)

	await connection.confirmTransaction({ signature: createSignature, ...latestBlockhash }, 'confirmed')

	// Create the metadata account
	const [metadataPda] = PublicKey.findProgramAddressSync(
		[Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
		PROGRAM_ID
	)
}

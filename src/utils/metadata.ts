import { PublicKey, Transaction } from '@bbachain/web3.js'
import {
	createCreateMetadataAccountInstruction,
	CreateMetadataAccountArgs,
	createUpdateMetadataAccountInstruction,
	UpdateMetadataAccountArgs
} from '@bbachain/spl-token-metadata'

export const createMetadataTx = async (
	ownerAddress: PublicKey,
	mintAddress: PublicKey,
	metadataPda: PublicKey,
	createMetadataAccountArgs: CreateMetadataAccountArgs
) => {
	const ix = createCreateMetadataAccountInstruction(
		{
			metadata: metadataPda,
			mint: mintAddress,
			mintAuthority: ownerAddress,
			payer: ownerAddress,
			updateAuthority: ownerAddress
		},
		{ createMetadataAccountArgs }
	)

	const createdMetadataTx = new Transaction().add(ix)
	return createdMetadataTx
}

export const updateMetadataTx = async (
	ownerAddress: PublicKey,
	metadataPda: PublicKey,
	updateMetadataAccountArgs: UpdateMetadataAccountArgs
) => {
	const ix = createUpdateMetadataAccountInstruction(
		{
			metadata: metadataPda,
			updateAuthority: ownerAddress
		},
		{ updateMetadataAccountArgs }
	)

	const updatedMetadataTx = new Transaction().add(ix)
	return updatedMetadataTx
}

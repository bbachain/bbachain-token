'use client'

import { clusterApiUrl, Connection } from '@bbachain/web3.js'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { createContext, ReactNode, useContext } from 'react'
import toast from 'react-hot-toast'

import { isProduction } from '@/lib/utils'

export interface Cluster {
	name: string
	endpoint: string
	network?: ClusterNetwork
	active?: boolean
}

export enum ClusterNetwork {
	Mainnet = 'mainnet',
	Testnet = 'testnet',
	Custom = 'custom'
}

// By default, we don't configure the mainnet cluster
// The endpoint provided by clusterApiUrl('mainnet') does not allow access from the browser due to CORS restrictions
// To use the mainnet cluster, provide a custom endpoint

const developmentClusters: Cluster[] = [
	{
		name: 'mainnet',
		endpoint: clusterApiUrl('mainnet'),
		network: ClusterNetwork.Mainnet
	},
	{
		name: 'testnet',
		endpoint: clusterApiUrl('testnet'),
		network: ClusterNetwork.Testnet
	}
]

const productionCluster: Cluster[] = [
	{
		name: 'mainnet',
		endpoint: clusterApiUrl('mainnet'),
		network: ClusterNetwork.Mainnet
	}
]

export const defaultClusters: Cluster[] = isProduction ? productionCluster : developmentClusters

const clusterAtom = atomWithStorage<Cluster>('bbachain-cluster', defaultClusters[0])
const clustersAtom = atomWithStorage<Cluster[]>('bbachain-clusters', defaultClusters)

const activeClustersAtom = atom<Cluster[]>((get) => {
	const clusters = get(clustersAtom)
	const cluster = get(clusterAtom)
	return clusters.map((item) => ({
		...item,
		active: item.name === cluster.name
	}))
})

const activeClusterAtom = atom<Cluster>((get) => {
	const clusters = get(activeClustersAtom)

	return clusters.find((item) => item.active) || clusters[0]
})

export interface ClusterProviderContext {
	cluster: Cluster
	clusters: Cluster[]
	addCluster: (cluster: Cluster) => void
	deleteCluster: (cluster: Cluster) => void
	setCluster: (cluster: Cluster) => void
	getExplorerUrl(path: string): string
}

const Context = createContext<ClusterProviderContext>({} as ClusterProviderContext)

export function ClusterProvider({ children }: { children: ReactNode }) {
	const cluster = useAtomValue(activeClusterAtom)
	const clusters = useAtomValue(activeClustersAtom)
	const setCluster = useSetAtom(clusterAtom)
	const setClusters = useSetAtom(clustersAtom)

	const value: ClusterProviderContext = {
		cluster,
		clusters: clusters.sort((a, b) => (a.name > b.name ? 1 : -1)),
		addCluster: (cluster: Cluster) => {
			try {
				new Connection(cluster.endpoint)
				setClusters([...clusters, cluster])
			} catch (err) {
				toast.error(`${err}`)
			}
		},
		deleteCluster: (cluster: Cluster) => {
			setClusters(clusters.filter((item) => item.name !== cluster.name))
		},
		setCluster: (cluster: Cluster) => setCluster(cluster),
		getExplorerUrl: (path: string) => `https://explorer.bbachain.com/${path}${getClusterUrlParam(cluster)}`
	}
	return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useCluster() {
	return useContext(Context)
}

function getClusterUrlParam(cluster: Cluster): string {
	let suffix = ''
	switch (cluster.network) {
		case ClusterNetwork.Mainnet:
			suffix = ''
			break
		case ClusterNetwork.Testnet:
			suffix = 'testnet'
			break
		default:
			suffix = `custom&customUrl=${encodeURIComponent(cluster.endpoint)}`
			break
	}

	return suffix.length ? `?cluster=${suffix}` : ''
}

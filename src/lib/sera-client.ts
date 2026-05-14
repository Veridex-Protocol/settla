import { ethers } from "ethers";
import { createSeraRouter, SeraRouterConfig, SeraGraphQLClient, LimitParams } from "./sera";

// Configuration for Sera Protocol on Sepolia
export const SERA_CONFIG = {
    chainId: 11155111, // Sepolia
    routerAddress: "0x82bfe1b31b6c1c3d201a0256416a18d93331d99e",
    orderCancelerAddress: "0x53ad1ffcd7afb1b14c5f18be8f256606efb11b1b",
    marketFactoryAddress: "0xe54648526027e236604f0d91413a6aad3a80c01e",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.org",
    graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL || "https://api.studio.thegraph.com/query/sera-sepolia",
};

export class SeraService {
    private provider: ethers.JsonRpcProvider;
    private routerContract: ethers.Contract;
    private graphql: SeraGraphQLClient;
    private decimalCache: Map<string, number> = new Map();

    constructor() {
        this.provider = new ethers.JsonRpcProvider(SERA_CONFIG.rpcUrl);

        // Initialize Router
        // Note: In a real app, you might pass a signer here for write operations
        const routerConfig: SeraRouterConfig = {
            rpcUrl: SERA_CONFIG.rpcUrl,
            routerAddress: SERA_CONFIG.routerAddress,
        };
        const { contract } = createSeraRouter(routerConfig);
        this.routerContract = contract;

        // Initialize GraphQL Client
        this.graphql = new SeraGraphQLClient({ endpoint: SERA_CONFIG.graphqlUrl });
    }

    /**
     * Get and cache the decimals of a token (default to 6 if read fails)
     */
    private async getTokenDecimals(tokenAddress: string): Promise<number> {
        if (this.decimalCache.has(tokenAddress)) {
            return this.decimalCache.get(tokenAddress)!;
        }
        
        try {
            const abi = ["function decimals() view returns (uint8)"];
            const contract = new ethers.Contract(tokenAddress, abi, this.provider);
            const decimals = await contract.decimals();
            this.decimalCache.set(tokenAddress, Number(decimals));
            return Number(decimals);
        } catch (error) {
            console.warn(`[SeraService] Failed to read decimals for ${tokenAddress}, defaulting to 6`, error);
            // Safe default for most stablecoins
            this.decimalCache.set(tokenAddress, 6);
            return 6;
        }
    }

    /**
     * Get the balance of a specific token for a user
     */
    async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
        const balanceAbi = ["function balanceOf(address owner) view returns (uint256)"];
        const contract = new ethers.Contract(tokenAddress, balanceAbi, this.provider);
        const balance = await contract.balanceOf(userAddress);
        
        const decimals = await this.getTokenDecimals(tokenAddress);
        return ethers.formatUnits(balance, decimals);
    }

    /**
     * Get all active markets
     */
    async getMarkets() {
        return this.graphql.listMarkets();
    }

    /**
     * Get open orders for a user
     */
    async getOpenOrders(userAddress: string) {
        return this.graphql.getUserOpenOrders(userAddress);
    }

    /**
     * Get market depth (order book)
     */
    async getMarketDepth(marketId: string) {
        return this.graphql.getDepths(marketId);
    }

    /**
     * Verify if a transaction has settled on-chain
     */
    async verifySettlement(txHash: string): Promise<{ settled: boolean; blockNumber?: number }> {
        const tx = await this.provider.getTransactionReceipt(txHash);
        if (!tx) return { settled: false };

        // In a real implementation, we would check for specific event logs 
        // emitted by the Sera Router or OrderBook contracts
        return {
            settled: tx.status === 1,
            blockNumber: tx.blockNumber
        };
    }

    /**
     * Place a settlement order (limit bid) on Sera Protocol
     */
    async placeSettlementOrder(signer: ethers.Signer, params: LimitParams) {
        // We connect the contract to the signer for this transaction
        const contractWithSigner = this.routerContract.connect(signer) as ethers.Contract;

        // Execute the transaction
        const tx = await contractWithSigner.limitBid(params);
        return tx;
    }

    /**
     * Claim proceeds from filled orders
     */
    async claimProceeds(signer: ethers.Signer, deadline: bigint, paramsList: any[]) {
        const contractWithSigner = this.routerContract.connect(signer) as ethers.Contract;

        const tx = await contractWithSigner.claim(deadline, paramsList);
        return tx;
    }
}

export const seraService = new SeraService();

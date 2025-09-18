const { ethers } = require('ethers');

// Configuración para Sepolia
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const MARKETPLACE_ADDRESS = '0x5e3ef51F0a662dF65dea3e115C689E0cDE2A0F37';
const NFT_ADDRESS = '0xfd6580707778bE0d6Fc1447Ff42237e29a7cb047';

const MARKETPLACE_ABI = [
    "event BidPlaced(address indexed nft, uint256 id, address bidder, uint256 amount)",
    "event AuctionCreated(address indexed nft, uint256 id, uint256 end)",
    "event AuctionEnded(address indexed nft, uint256 id, address winner, uint256 amount)"
];

async function checkBidEvents() {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const contract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
    
    try {
        // Get recent bid events (last 1000 blocks)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);
        
        // Check BidPlaced events
        const bidFilter = contract.filters.BidPlaced(NFT_ADDRESS);
        const bidEvents = await contract.queryFilter(bidFilter, fromBlock);
        
        // Check AuctionCreated events
        const auctionCreatedFilter = contract.filters.AuctionCreated(NFT_ADDRESS);
        const auctionCreatedEvents = await contract.queryFilter(auctionCreatedFilter, fromBlock);
      
        
    } catch (error) {
        console.error('❌ Error checking events:', error);
    }
}

checkBidEvents();

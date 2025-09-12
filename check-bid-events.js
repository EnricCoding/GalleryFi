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
    
    console.log('🔍 Checking bid events for NFT:', NFT_ADDRESS);
    console.log('📊 Marketplace contract:', MARKETPLACE_ADDRESS);
    
    try {
        // Get recent bid events (last 1000 blocks)
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);
        
        console.log(`📡 Scanning blocks ${fromBlock} to ${currentBlock}...`);
        
        // Check BidPlaced events
        const bidFilter = contract.filters.BidPlaced(NFT_ADDRESS);
        const bidEvents = await contract.queryFilter(bidFilter, fromBlock);
        
        console.log(`\n🎯 Found ${bidEvents.length} BidPlaced events:`);
        bidEvents.forEach((event, i) => {
            console.log(`  ${i + 1}. Block: ${event.blockNumber}`);
            console.log(`     NFT: ${event.args[0]}`);
            console.log(`     Token ID: ${event.args[1].toString()}`);
            console.log(`     Bidder: ${event.args[2]}`);
            console.log(`     Amount: ${ethers.formatEther(event.args[3])} ETH`);
            console.log(`     Tx Hash: ${event.transactionHash}`);
        });
        
        // Check AuctionCreated events
        const auctionCreatedFilter = contract.filters.AuctionCreated(NFT_ADDRESS);
        const auctionCreatedEvents = await contract.queryFilter(auctionCreatedFilter, fromBlock);
        
        console.log(`\n🏭 Found ${auctionCreatedEvents.length} AuctionCreated events:`);
        auctionCreatedEvents.forEach((event, i) => {
            console.log(`  ${i + 1}. Block: ${event.blockNumber}`);
            console.log(`     NFT: ${event.args[0]}`);
            console.log(`     Token ID: ${event.args[1].toString()}`);
            console.log(`     End: ${new Date(Number(event.args[2]) * 1000).toISOString()}`);
            console.log(`     Tx Hash: ${event.transactionHash}`);
        });
        
        if (bidEvents.length === 0 && auctionCreatedEvents.length === 0) {
            console.log('\n❌ No auction or bid events found in the last 1000 blocks');
            console.log('💡 This could mean:');
            console.log('   - No auctions were created for this NFT');
            console.log('   - No bids were placed');
            console.log('   - Events are older than 1000 blocks');
            console.log('   - Contract address is incorrect');
        }
        
    } catch (error) {
        console.error('❌ Error checking events:', error);
    }
}

checkBidEvents();

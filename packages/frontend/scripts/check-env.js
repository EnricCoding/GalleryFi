#!/usr/bin/env node

/**
 * Simple script to check environment variables
 */

require('dotenv').config({ path: '.env.local' });


const requiredVars = [
  'NEXT_PUBLIC_MARKET_ADDRESS',
  'NEXT_PUBLIC_NFT_ADDRESS',
  'NEXT_PUBLIC_CHAIN_ID',
  'NEXT_PUBLIC_SEPOLIA_RPC'
];

let allGood = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.slice(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT FOUND`);
    allGood = false;
  }
});

console.log('\n' + (allGood ? '🎉 All environment variables are set!' : '⚠️  Some environment variables are missing!'));

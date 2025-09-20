// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";


contract NftMarketplace is ReentrancyGuard, Pausable, Ownable, ERC721Holder {
    uint96  public platformFeeBps;           // 250 = 2.5 %
    address public feeRecipient;

    constructor(address _recipient, uint96 _feeBps) Ownable(msg.sender) {
        _setPlatformFee(_recipient, _feeBps);
    }

    struct Listing { address seller; uint96 price; }
    struct Auction { address seller; uint40 end; uint96 bid; address bidder; }

    mapping(address => mapping(uint256 => Listing)) public listings;
    mapping(address => mapping(uint256 => Auction)) public auctions;
    mapping(address => uint256)                     public proceeds; 

    /*──────────────────────── Events ──────────────────────*/
    event ItemListed   (address indexed nft, uint256 id, address seller, uint256 price);
    event ItemPriceSet (address indexed nft, uint256 id, uint256 newPrice);
    event ItemDelisted (address indexed nft, uint256 id);
    event ItemSold     (address indexed nft, uint256 id, uint256 price, address buyer);
    event AuctionCreated(address indexed nft, uint256 id, uint256 end);
    event BidPlaced    (address indexed nft, uint256 id, address bidder, uint256 amount);
    event AuctionEnded (address indexed nft, uint256 id, address winner, uint256 amount);
    event ProceedsWithdrawn(address indexed to, uint256 amount);
    event PlatformFeeUpdated(address indexed recipient, uint96 feeBps);

    /*──────────── Admin fee ────────────*/
    function setPlatformFee(address recipient, uint96 bps) external onlyOwner {
        _setPlatformFee(recipient, bps);
    }
    function _setPlatformFee(address recipient, uint96 bps) private {
        require(recipient != address(0), "recipient=0");
        require(bps <= 1_000, "fee>10%");       // max 10 %
        feeRecipient   = recipient;
        platformFeeBps = bps;
        emit PlatformFeeUpdated(recipient, bps);
    }

    function listItem(address nft, uint256 id, uint96 price)
        external nonReentrant whenNotPaused
    {
        require(price > 0, "price=0");
        require(listings[nft][id].seller == address(0), "listed");
        require(auctions[nft][id].seller == address(0), "in auction");

        IERC721(nft).safeTransferFrom(msg.sender, address(this), id);
        listings[nft][id] = Listing(msg.sender, price);
        emit ItemListed(nft, id, msg.sender, price);
    }

    function setPrice(address nft, uint256 id, uint96 newPrice)
        external nonReentrant whenNotPaused
    {
        require(listings[nft][id].seller == msg.sender, "!seller");
        require(newPrice > 0, "price=0");
        listings[nft][id].price = newPrice;
        emit ItemPriceSet(nft, id, newPrice);
    }

    function delistItem(address nft, uint256 id)
        external nonReentrant
    {
        require(listings[nft][id].seller == msg.sender, "!seller");
        delete listings[nft][id];
        IERC721(nft).safeTransferFrom(address(this), msg.sender, id);
        emit ItemDelisted(nft, id);
    }

    function buyItem(address nft, uint256 id)
        external payable nonReentrant whenNotPaused
    {
        Listing memory l = listings[nft][id];
        require(l.price > 0, "not listed");
        require(msg.value == l.price, "price mismatch");
        delete listings[nft][id];

        _splitAndStore(nft, id, l.seller, msg.value);
        IERC721(nft).safeTransferFrom(address(this), msg.sender, id);
        emit ItemSold(nft, id, msg.value, msg.sender);
    }

    /*──────────── Auctions ─────────────*/
    function createAuction(address nft, uint256 id, uint40 duration)
        external nonReentrant whenNotPaused
    {
        require(duration >= 1 hours, "dur<1h");
        require(auctions[nft][id].seller == address(0), "auctioned");
        require(listings[nft][id].seller == address(0), "listed");

        IERC721(nft).safeTransferFrom(msg.sender, address(this), id);
        auctions[nft][id] = Auction(msg.sender, uint40(block.timestamp) + duration, 0, address(0));
        emit AuctionCreated(nft, id, block.timestamp + duration);
    }

    function cancelAuction(address nft, uint256 id)
        external nonReentrant
    {
        Auction memory a = auctions[nft][id];
        require(a.seller == msg.sender, "!auctionSeller");
        require(a.bid == 0, "hasBid");
        delete auctions[nft][id];
        IERC721(nft).safeTransferFrom(address(this), a.seller, id);
        emit ItemDelisted(nft, id);
    }

    function bid(address nft, uint256 id) external payable nonReentrant whenNotPaused {
        Auction storage a = auctions[nft][id];
        require(block.timestamp < a.end, "ended");
        require(msg.value > a.bid, "low bid");

        if (a.bid > 0) proceeds[a.bidder] += a.bid; 
        a.bid    = uint96(msg.value);
        a.bidder = msg.sender;
        emit BidPlaced(nft, id, msg.sender, msg.value);
    }

    function endAuction(address nft, uint256 id) external nonReentrant {
        Auction memory a = auctions[nft][id];
        require(a.end > 0 && block.timestamp >= a.end, "not ended");
        delete auctions[nft][id];

        if (a.bid == 0) {
            IERC721(nft).safeTransferFrom(address(this), a.seller, id);
            emit AuctionEnded(nft, id, address(0), 0);
            return;
        }
        _splitAndStore(nft, id, a.seller, a.bid);
        IERC721(nft).safeTransferFrom(address(this), a.bidder, id);
        emit AuctionEnded(nft, id, a.bidder, a.bid);
    }

    function _splitAndStore(address nft, uint256 id, address seller, uint256 gross) private {
        uint256 amount = gross;

        if (IERC165(nft).supportsInterface(type(IERC2981).interfaceId)) {
            (address recv, uint256 royalty) = IERC2981(nft).royaltyInfo(id, gross);
            if (royalty > 0) { amount -= royalty; proceeds[recv] += royalty; }
        }
        if (platformFeeBps > 0) {
            uint256 fee = (gross * platformFeeBps) / 10_000;
            amount -= fee;
            proceeds[feeRecipient] += fee;
        }
        proceeds[seller] += amount;
    }

    function withdrawProceeds() external nonReentrant {
        uint256 bal = proceeds[msg.sender];
        require(bal > 0, "0 balance");
        proceeds[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "ETH send fail");
        emit ProceedsWithdrawn(msg.sender, bal);
    }

    function pause()  external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function rescueNFT(address nft, uint256 id, address to) external onlyOwner {
        IERC721(nft).safeTransferFrom(address(this), to, id);
    }

    receive() external payable {}

}

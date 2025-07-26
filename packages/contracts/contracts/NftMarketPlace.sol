// SPDX‑License‑Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import '@openzeppelin/contracts/token/common/ERC2981.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/utils/introspection/IERC165.sol';

/**
 * @title NftMarketplace
 * @notice Marketplace minimalista con:
 *   • Listados a precio fijo & subastas.
 *   • Royalties EIP‑2981 + comisión de plataforma.
 *   • Pull‑payments (proceeds) para evitar fallos de gas.
 *   • Controles de pausa, rescate y ajuste de comisiones.
 */
contract NftMarketplace is ReentrancyGuard, Pausable, Ownable {
    /*────────────────────────── Config ──────────────────────────*/
    uint96 public platformFeeBps; // 250 = 2.5 %
    address public feeRecipient;

    constructor(
        address _recipient,
        uint96 _feeBps
    )
        Ownable(msg.sender) // Ownable 5.x requiere owner inicial
    {
        _setPlatformFee(_recipient, _feeBps);
    }

    /*────────────────────────── Structs ─────────────────────────*/
    struct Listing {
        address seller;
        uint96 price;
    }
    struct Auction {
        address seller;
        uint40 end;
        uint96 bid;
        address bidder;
    }

    mapping(address => mapping(uint256 => Listing)) public listings;
    mapping(address => mapping(uint256 => Auction)) public auctions;
    mapping(address => uint256) public proceeds; // pull pattern

    /*────────────────────────── Eventos ─────────────────────────*/
    event ItemListed(address indexed nft, uint256 id, address seller, uint256 price);
    event ItemPriceSet(address indexed nft, uint256 id, uint256 newPrice);
    event ItemDelisted(address indexed nft, uint256 id);
    event ItemSold(
        address indexed nft,
        uint256 id,
        uint256 price, // ← primero el precio (uint256)
        address buyer // ← luego el comprador (address)
    );

    event AuctionCreated(address indexed nft, uint256 id, uint256 end);
    event BidPlaced(address indexed nft, uint256 id, address bidder, uint256 amount);
    event AuctionEnded(address indexed nft, uint256 id, address winner, uint256 amount);

    event ProceedsWithdrawn(address indexed to, uint256 amount);
    event PlatformFeeUpdated(address indexed recipient, uint96 feeBps);

    /*──────────────────── Modificadores de guardia ─────────────*/
    modifier onlySeller(address nft, uint256 id) {
        require(listings[nft][id].seller == msg.sender, '!seller');
        _;
    }
    modifier onlyAuctionSeller(address nft, uint256 id) {
        require(auctions[nft][id].seller == msg.sender, '!auctionSeller');
        _;
    }

    /*──────────────────── Administración (owner) ───────────────*/
    function setPlatformFee(address newRecipient, uint96 newBps) external onlyOwner {
        _setPlatformFee(newRecipient, newBps);
    }

    function _setPlatformFee(address recipient, uint96 bps) private {
        require(recipient != address(0), 'recipient=0');
        require(bps <= 1_000, 'fee>10%'); // máx 10 %
        feeRecipient = recipient;
        platformFeeBps = bps;
        emit PlatformFeeUpdated(recipient, bps);
    }

    /*────────────────────── Listados fijos ─────────────────────*/
    function listItem(address nft, uint256 id, uint96 price) external nonReentrant whenNotPaused {
        require(price > 0, 'price=0');
        require(listings[nft][id].seller == address(0), 'listed');
        require(auctions[nft][id].seller == address(0), 'in auction');

        IERC721(nft).safeTransferFrom(msg.sender, address(this), id);
        listings[nft][id] = Listing(msg.sender, price);
        emit ItemListed(nft, id, msg.sender, price);
    }

    function setPrice(
        address nft,
        uint256 id,
        uint96 newPrice
    ) external nonReentrant onlySeller(nft, id) whenNotPaused {
        require(newPrice > 0, 'price=0');
        listings[nft][id].price = newPrice;
        emit ItemPriceSet(nft, id, newPrice);
    }

    function delistItem(address nft, uint256 id) external nonReentrant onlySeller(nft, id) {
        delete listings[nft][id];
        IERC721(nft).safeTransferFrom(address(this), msg.sender, id);
        emit ItemDelisted(nft, id);
    }

    function buyItem(address nft, uint256 id) external payable nonReentrant whenNotPaused {
        Listing memory l = listings[nft][id];
        require(l.price > 0, 'not listed');
        require(msg.value == l.price, 'price mismatch');
        delete listings[nft][id];

        _splitAndStore(nft, id, l.seller, msg.value);
        IERC721(nft).safeTransferFrom(address(this), msg.sender, id);
        emit ItemSold(nft, id, msg.value, msg.sender);
    }

    /*──────────────────────── Subastas ─────────────────────────*/
    function createAuction(
        address nft,
        uint256 id,
        uint40 duration
    ) external nonReentrant whenNotPaused {
        require(duration >= 1 hours, 'dur<1h');
        require(auctions[nft][id].seller == address(0), 'auctioned');
        require(listings[nft][id].seller == address(0), 'listed');

        IERC721(nft).safeTransferFrom(msg.sender, address(this), id);
        auctions[nft][id] = Auction(msg.sender, uint40(block.timestamp) + duration, 0, address(0));
        emit AuctionCreated(nft, id, block.timestamp + duration);
    }

    function cancelAuction(
        address nft,
        uint256 id
    ) external nonReentrant onlyAuctionSeller(nft, id) {
        Auction memory a = auctions[nft][id];
        require(a.bid == 0, 'hasBid');
        delete auctions[nft][id];
        IERC721(nft).safeTransferFrom(address(this), a.seller, id);
        emit ItemDelisted(nft, id);
    }

    function bid(address nft, uint256 id) external payable nonReentrant whenNotPaused {
        Auction storage a = auctions[nft][id];
        require(block.timestamp < a.end, 'ended');
        require(msg.value > a.bid, 'low bid');

        if (a.bid > 0) proceeds[a.bidder] += a.bid; // reembolso pull
        a.bid = uint96(msg.value);
        a.bidder = msg.sender;
        emit BidPlaced(nft, id, msg.sender, msg.value);
    }

    function endAuction(address nft, uint256 id) external nonReentrant {
        Auction memory a = auctions[nft][id];
        require(a.end > 0 && block.timestamp >= a.end, 'not ended');
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

    /*──────────── Royalties + plataforma (pull‑payments) ───────────*/
    function _splitAndStore(address nft, uint256 id, address seller, uint256 gross) internal {
        uint256 amount = gross;

        // 1) Royalties EIP‑2981 (si aplica)
        if (IERC165(nft).supportsInterface(type(IERC2981).interfaceId)) {
            (address recv, uint256 royalty) = IERC2981(nft).royaltyInfo(id, gross);
            if (royalty > 0) {
                amount -= royalty;
                proceeds[recv] += royalty;
            }
        }
        // 2) Fee plataforma
        if (platformFeeBps > 0) {
            uint256 fee = (gross * platformFeeBps) / 10_000;
            amount -= fee;
            proceeds[feeRecipient] += fee;
        }
        // 3) Vendedor
        proceeds[seller] += amount;
    }

    /*───────────────── Retirada de fondos (pull) ───────────────────*/
    function withdrawProceeds() external nonReentrant {
        uint256 bal = proceeds[msg.sender];
        require(bal > 0, '0 balance');
        proceeds[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: bal}('');
        require(ok, 'ETH send fail');
        emit ProceedsWithdrawn(msg.sender, bal);
    }

    /*────────────────────── Pausable (admin) ───────────────────────*/
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /*──────── Recuperar NFTs enviados por error (admin) ───────────*/
    function rescueNFT(address nft, uint256 id, address to) external onlyOwner {
        IERC721(nft).safeTransferFrom(address(this), to, id);
    }

    /*───────── Recibir ETH directo (fallback) ─────────────────────*/
    receive() external payable {}

    /*──────────────────── Interfaz ERC‑165 ───────────────────────*/
    function supportsInterface(bytes4 i) public pure returns (bool) {
        return i == type(IERC165).interfaceId;
    }
}

# GalleryFi — `context.md`
**Objetivo**: Guía única para que cualquier IA (Copilot/Continue/Cody/Cursor) y nuevas personas entiendan **rápido** el proyecto: contratos, subgraph y frontend.  
**Stack**: Solidity (EVM, EIP-2981) · The Graph · Next.js + Wagmi/Viem · IPFS (Pinata) · Hardhat/Hardhat-Deploy.

---

## TL;DR
- **Marketplace NFT** con **mint + royalties EIP-2981**, **listado** y **compra**, y **subastas on-chain**.  
- **Datos**: los eventos del contrato se indexan en **The Graph**; el frontend consulta **on-chain** (Wagmi/Viem) + **subgraph** (Apollo) y resuelve `tokenURI` en **IPFS**.  
- **Seguridad**: `ReentrancyGuard`, **pull-payments** para refunds y cobros, `Pausable`, `Ownable`.  
- **Red**: Sepolia.  
- **Direcciones (Sepolia)**  
  - **MyNFT**: `0xfd6580707778bE0d6Fc1447Ff42237e29a7cb047`  
  - **NftMarketplace**: `0x5e3ef51F0a662dF65dea3e115C689E0cDE2A0F37`

---

## Estructura del repo (monorepo)
```
galleryfi/
├─ packages/
│  ├─ contracts/                 # Hardhat + contratos
│  │  ├─ contracts/
│  │  │  ├─ MyNFT.sol
│  │  │  └─ NftMarketplace.sol
│  │  ├─ deploy/
│  │  │  ├─ 00-deploy-MyNFT.ts
│  │  │  └─ 01-deploy-NftMarketplace.ts
│  │  ├─ hardhat.config.ts
│  │  └─ test/ ... (pendiente/por añadir)
│  ├─ subgraph/                  # The Graph
│  │  ├─ schema.graphql
│  │  ├─ subgraph.yaml
│  │  ├─ mappings/
│  │  │  ├─ MyNft.ts
│  │  │  └─ NftMarketplace.ts
│  │  └─ abis/*.json
│  └─ frontend/                  # Next.js App Router
│     ├─ app/
│     │  ├─ api/
│     │  │  ├─ ipfs/route.ts
│     │  │  └─ listings/route.ts
│     │  ├─ nft/[nft]/[id]/
│     │  │  ├─ page.tsx          # NftDetail (usa subcomponentes)
│     │  │  └─ components/
│     │  │     ├─ NftDetail.tsx
│     │  │     ├─ NftImage.tsx
│     │  │     └─ ActivityTabs.tsx
│     │  ├─ create/page.tsx      # Mint & List (MintListForm)
│     │  └─ layout.tsx, page.tsx, providers.tsx, global.css
│     ├─ components/
│     │  ├─ cards/ListingCard.tsx
│     │  ├─ layout/Navbar.tsx
│     │  └─ ui/Toast.tsx, Callout.tsx, WalletButton.tsx
│     ├─ hooks/
│     │  ├─ useNftData.ts        # Agregador (on-chain + subgraph + IPFS + precio)
│     │  ├─ useOnchainNft.ts
│     │  ├─ useNftActivity.ts
│     │  ├─ useNftMetadata.ts
│     │  ├─ useEthUsd.ts
│     │  └─ useBuyNft.ts
│     ├─ lib/
│     │  ├─ ipfs.ts, price.ts
│     │  ├─ ui/format.ts
│     │  ├─ services/listing.ts
│     │  ├─ hooks/useListings.ts
│     │  └─ types/ (common.ts, onchain.ts, subgraph.ts, listing.ts, activity.ts, metadata.ts)
│     └─ tailwind.config.ts, tsconfig.json, package.json
├─ docs/
│  └─ contexto.md   # este archivo
└─ galleryfi.code-workspace
```

---

## Contratos (Solidity)

### `NftMarketplace.sol`
- **Roles**: `Ownable` (admin fee/pausa/rescate), `Pausable`, `ReentrancyGuard`, `ERC721Holder`.
- **Config**:
  - `platformFeeBps` (máx 10%), `feeRecipient`.
- **Listados** (`listings[nft][id]`): `{ seller, price }`.
- **Subastas** (`auctions[nft][id]`): `{ seller, end(uint40), bid, bidder }`.
- **Proceeds** (`proceeds[address]`) — **pull-payments** para refunds y cobros.
- **Eventos**:
  - `ItemListed(nft, id, seller, price)`
  - `ItemPriceSet(nft, id, newPrice)`
  - `ItemDelisted(nft, id)`
  - `ItemSold(nft, id, price, buyer)`
  - `AuctionCreated(nft, id, end)`
  - `BidPlaced(nft, id, bidder, amount)`
  - `AuctionEnded(nft, id, winner, amount)`
  - `ProceedsWithdrawn(to, amount)`
  - `PlatformFeeUpdated(recipient, bps)`
- **Flujos**:
  - **Listar**: transfiere NFT al contrato → crea listing.
  - **Comprar**: paga `msg.value == price` → `_splitAndStore` (royalty EIP-2981 + fee + seller) → transfiere NFT al comprador.
  - **Subasta**: lockea NFT en contrato; `bid` guarda refund en `proceeds` del anterior pujador; `endAuction` liquida o devuelve al vendedor si sin pujas.
  - **Cobro**: `withdrawProceeds()`.
- **Pago & Royalties**: `_splitAndStore`:
  1) si `IERC2981` → `royaltyInfo(id, salePrice)` → `proceeds[recv] += royalty`.
  2) fee plataforma.
  3) resto al vendedor.
- **Seguridad**:
  - `nonReentrant` en funciones que mueven ETH/estado.
  - Patrón **checks-effects-interactions**.
  - `Pausable` para congelar list/bid/buy.
  - `rescueNFT` (solo owner) para recuperar tokens lockeados.

### `MyNFT.sol` (resumen)
- ERC-721 con `ERC721URIStorage` y `ERC2981`.
- `mintWithRoyalty(to, tokenURI, receiver, bps)`.
- Emite `Transfer(0x0 → to, tokenId)`.
- `owner()` se usa en el front para gating de mint inicial (solo owner).

---

## Hardhat / Deploy
- **Config principal**: `hardhat.config.ts`
  - Solidity: `0.8.28` (optimizer runs 200).
  - Redes: `sepolia`, `arbitrumSepolia`.
  - `typechain` target: `ethers-v6`.
  - Reporte de gas opcional (`REPORT_GAS=true`).
  - Etherscan API keys configuradas por red.

- **Deploy scripts**
  - `00-deploy-MyNFT.ts`
    - Constructor: `('GalleryFi', 'GAL', deployer, 500 /*5% default*/)`
    - Verifica en Etherscan si `network.live`.
  - `01-deploy-NftMarketplace.ts`
    - Args: `[deployer /*feeRecipient*/, 250 /*2.5%*/]`.

- **.env esperados (contratos)**
  ```
  SEPOLIA_RPC=...
  ARB_SEPOLIA_RPC=...
  PRIVATE_KEY=0x...
  ETHERSCAN_API_KEY=...
  ARBISCAN_API_KEY=...
  REPORT_GAS=true
  COINMARKETCAP_API_KEY=...
  ```

- **Comandos útiles**
  ```bash
  # Contratos
  pnpm hardhat compile
  pnpm hardhat test
  pnpm hardhat deploy --network sepolia
  pnpm hardhat verify --network sepolia <address> --constructor-args ...
  ```

---

## Subgraph (The Graph)

### `schema.graphql` (entidades)
- `Mint` (immutable): `id, nft, tokenId, to, tokenURI, timestamp`.
- `Listing` (mutable): `id, nft, tokenId, seller, price, tokenURI?, name?, description?, image?, timestamp`.
- `Sale` (immutable): `id, nft, tokenId, buyer, price, timestamp`.
- `Bid` (immutable): `id, nft, tokenId, bidder, amount, timestamp`.
- `AuctionCreated` (immutable): `id, nft, tokenId, seller, end, timestamp`.
- `AuctionEnded` (immutable): `id, nft, tokenId, winner?, amount?, timestamp`.

### `mappings/`
- **MyNft.ts**: `handleTransfer` → si `from == 0x0` guarda `Mint` y `tokenURI` (bind a `ERC721.tokenURI`).
- **NftMarketplace.ts**:
  - `handleItemListed` → crea/actualiza `Listing` (+ intenta `tokenURI` on-chain).
  - `handleItemSold` → `Sale`.
  - `handleBidPlaced` → `Bid`.
  - `handleAuctionCreated` → `AuctionCreated` (seller = `tx.from`).
  - `handleAuctionEnded` → `AuctionEnded`.

> **IDs**:  
> - Para `Listing`, `AuctionCreated`, `AuctionEnded`: `${marketAddress}-${tokenId}`.  
> - Para `Sale`: `${marketAddress}-${txHash}`.  
> - Para `Bid`: `${txHash}-${logIndex}`.

### `subgraph.yaml`
- **Red**: `sepolia`
- **Direcciones**:
  - `MyNFT`: `0xfd6580707778bE0d6Fc1447Ff42237e29a7cb047`
  - `NftMarketplace`: `0x5e3ef51F0a662dF65dea3e115C689E0cDE2A0F37`

### Queries usadas por el front
- **NFT_ACTIVITY** (por `nft` + `tokenId`): obtiene el **último listing**, todas las **sales**, **bids**, y la última `auctionCreated`/`auctionEnded`.

---

## Frontend (Next.js + Wagmi/Viem + Apollo)

### Providers & ENV
- `app/providers.tsx`
  - RainbowKit + Wagmi (chain: **Sepolia**).
  - Apollo Client apuntando a `NEXT_PUBLIC_SUBGRAPH_URL`.
  - React Query para listados (API interna).
- **.env (frontend)**
  ```
  NEXT_PUBLIC_RPC_URL=...
  NEXT_PUBLIC_WC_PROJECT_ID=...
  NEXT_PUBLIC_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/...   # o hosted/edge
  NEXT_PUBLIC_NFT_ADDRESS=0xfd6580707778bE0d6Fc1447Ff42237e29a7cb047
  NEXT_PUBLIC_MARKET_ADDRESS=0x5e3ef51F0a662dF65dea3e115C689E0cDE2A0F37
  NEXT_PUBLIC_CHAIN_ID=11155111
  # API internas:
  SUBGRAPH_URL=... (si prefieres no exponer la pública)
  PINATA_JWT=...      # para /api/ipfs
  PINATA_GATEWAY=...  # opcional
  ```

### Rutas clave
- **Home**: `app/page.tsx` (CTA → explore).
- **Create**: `app/create/page.tsx` → `MintListForm`  
  Flujo: Upload → IPFS (`/api/ipfs`) → mintWithRoyalty → approveIfNeeded → listItem.
- **NFT Detail**: `app/nft/[nft]/[id]/page.tsx` → `NftDetail`  
  - `useNftData` (agregador): on-chain (list/auction/tokenURI/owner) + subgraph + metadata IPFS + precio ETH→USD.  
  - Subcomponentes: `NftImage`, `NftInfo`, `ActivityTabs`.
- **Explore** (listados): `ListingCard.tsx` + `useListings` → `/api/listings`.

### API internas
- **`/api/ipfs`** (node runtime): sube imagen y JSON a **Pinata**. Validación de MIME (<15MB).
- **`/api/listings`** (edge): proxy a subgraph con filtros & orden. Sanitiza input, cachea 10s.

### Hooks (divididos)
- `useOnchainNft(nft, tokenId)` → `tokenIdBig`, `validInputs`, `onchainListing`, `onchainAuction`, `onchainTokenURI`, `onchainOwner`, `listedNow`, `auctionNow`.
- `useNftActivity(nft, tokenIdBig)` → `subgraphData`, `subgraphLoading`, `activity[]` (SALE/BID/LISTING).
- `useNftMetadata(tokenURI)` → `meta`, `imgUrl`.
- `useEthUsd()` → `ethUsd`.
- `useNftData({ nft, tokenId })` → agrega todo lo anterior con misma API consumida por `NftDetail`.
- `useBuyNft(...)` → gestiona `buyItem` (checks de red, precio, espera de receipt, toasts).

### Componentes destacados
- `ListingCard.tsx`:
  - IPFS metadata (imagen) + precio ETH/≈USD (fallback si API falla).
  - CTA “Buy Now” (pendiente conectar a `useBuyNft`).
- `NftDetail.tsx`:
  - Carga datos con `useNftData`.
  - Determina `isOwner`/`isForSale`.
  - Renderiza `NftInfo` (acción de compra) + `ActivityTabs`.

---

## Flujo de datos end-to-end

1) **Mint & List** (`Create`)
   - `/api/ipfs` → `ipfs://CID` (imagen + metadata).
   - `MyNFT.mintWithRoyalty`.
   - `setApprovalForAll(market)`, si hace falta.
   - `NftMarketplace.listItem(nft, tokenId, price)`.

2) **Indexación**
   - Eventos: `Transfer` (mint), `ItemListed`, ...
   - Mappings guardan `Mint`, `Listing`, `Sale`, `Bid`, ...

3) **Detalle (UI)**
   - **On-chain**: `listings[nft][id]`, `auctions[nft][id]`, `tokenURI`, `ownerOf`.
   - **Subgraph**: último `Listing` + `Sales` + `Bids` + `Auction*`.
   - **IPFS**: resuelve `tokenURI` → JSON → `image`.
   - Render de actividad (SALE/BID/LISTING) + botón comprar.

4) **Compra**
   - `buyItem(nft, id)` con `msg.value == price`.
   - Marketplace aplica royalties (EIP-2981) + fee + proceeds (pull-payments).
   - Emite `ItemSold`.

---

## Seguridad y buenas prácticas
- **Reentrancia**: `nonReentrant` en `listItem/buyItem/bid/endAuction/withdrawProceeds`.
- **Pull-payments**: refunds y cobros via `proceeds` + `withdrawProceeds`.
- **Pausable**: `whenNotPaused` en acciones críticas.
- **Roles**: `Ownable` para fees/pausa/rescate.
- **Front**:
  - Comparar tiempos de subasta con `Number(end)` (es `bigint`).
  - `tokenURI`: preferir **on-chain** y fallback a subgraph.
  - Manejar IPFS `ipfs://` → gateway.
  - Validar montos (ETH) y decimales en formularios.

---

## Testing (sugerido)
- **Contratos**
  - `buyItem`:
    - Rechaza `msg.value != price`.
    - Guarda correctamente royalties (mock ERC2981), fee y seller.
    - Emite `ItemSold`.
  - Subastas:
    - `bid` mayor que actual; refund al pujador anterior.
    - `endAuction` antes/después de `end`.
  - Pausa: bloquea `listItem/buyItem/bid`.
  - `withdrawProceeds`:
    - Suma correcta de proceeds.
    - Revert con saldo 0.
- **Subgraph (match de eventos)**
  - `handleItemListed` crea/actualiza `Listing`.
  - `handleItemSold` crea `Sale`.
  - `handleBidPlaced` crea `Bid`.
- **Frontend (e2e happy path)**
  - Mint + List + Detail muestra “Available”.
  - Compra actualiza `ActivityTabs` con una `SALE` nueva.

---

## Cómo correr todo

### Contratos
```bash
cd packages/contracts
cp .env.example .env   # crea y rellena RPC/PK/API keys
pnpm i
pnpm hardhat compile
pnpm hardhat deploy --network sepolia
```

### Subgraph
```bash
cd packages/subgraph
pnpm i
# Asegurar direcciones en subgraph.yaml
pnpm graph codegen
pnpm graph build
pnpm graph deploy  # según tu hosting/CLI
```

### Frontend
```bash
cd packages/frontend
cp .env.example .env   # añade NEXT_PUBLIC_* y PINATA_*
pnpm i
pnpm dev
```

---

## Gotchas / Trucos
- **Viem/Wagmi** devuelve **`bigint`** para `uint*`. Convierte a `Number()` solo para timestamps cortos (e.g., `end`), nunca para valores monetarios.
- **`Sale` del subgraph no tiene `seller`**; en UI usa `to=buyer` y opcionalmente muestra `from` si lo infieres de historial.
- **TokenURI** puede fallar (IPFS gateways). Mostrar skeletons y fallback.
- **`useNftData`** está **dividido**: `useOnchainNft`, `useNftActivity`, `useNftMetadata`, `useEthUsd`. Orquestador mantiene la API esperada por `NftDetail`.

---

## Prompts útiles (Copilot/Continue)

**Arquitectura end-to-end**
```
@repo Resume el flujo Mint→List→Buy usando:
- contracts/NftMarketplace.sol (eventos/fees)
- subgraph/mappings/*.ts (entidades)
- frontend/hooks/useNftData.ts y NftDetail.tsx
Devuelve un diagrama y riesgos.
```

**Revisión de seguridad**
```
@repo Audita reentrancy y pull-payments en NftMarketplace.sol.
Propón 5 tests unitarios y checks específicos para _splitAndStore.
```

**Subgraph → UI**
```
@repo ¿Cómo mapearías Sale/Bid/Listing del subgraph a la UI de ActivityTabs?
Usa lib/types/activity.ts y ajusta el render para ventas sin 'seller'.
```

**Optimización de gas**
```
@repo Señala micro-optimizaciones en NftMarketplace.sol (storage, uint sizes, cheap reads).
```

---

## Referencias de tipos (front)
- `lib/types/*` define:
  - `common.ts` (Address, Hex, BigIntString, TimestampSec)
  - `metadata.ts` (NftMetadata)
  - `onchain.ts` (tuplas `OnchainListingTuple`, `OnchainAuctionTuple`)
  - `subgraph.ts` (SgListing, SgSale, SgBid, ...)
  - `listing.ts` (Listing, ListingsResponse, ListParams)
  - `activity.ts` (UiActivityItem)
- `hooks/useNftData.ts` expone:
  - `meta, imgUrl, ethUsd, tokenURI, tokenIdBig, validInputs`
  - `onchainListing, onchainAuction, onchainOwner`
  - `subgraphData, subgraphLoading, activity`
  - `listedNow, auctionNow, expectedChainId, MARKET`

---

## Backlog / Ideas
- **Quick Buy** en `ListingCard` conectado a `useBuyNft`.
- **Subastas en UI**: crear modal con pujas y temporizador.
- **Verificación Etherscan** automática post-deploy (GH Actions).
- **Storybook** de componentes (NFTCard, AuctionModal, StatsChart).
- **Notificaciones**: Webhooks de Alchemy Notify → Discord/Telegram.
- **L2**: desplegar en Optimism cambiando RPC y re-deploy.

---

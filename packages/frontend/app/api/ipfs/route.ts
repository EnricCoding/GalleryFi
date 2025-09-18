// app/api/ipfs/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { PinataSDK } from 'pinata';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY,
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.PINATA_JWT) {
      return NextResponse.json({ error: 'PINATA_JWT no configurado.' }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const rawName = (form.get('name') as string | null) ?? 'NFT';
    const rawDescription = (form.get('description') as string | null) ?? '';

    const name = rawName.trim().slice(0, 80);
    const description = rawDescription.trim().slice(0, 1000);

    if (!file) return NextResponse.json({ error: 'Falta archivo.' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });

    const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Tipo no permitido (${file.type}). Usa PNG, JPEG, WEBP o GIF.` },
        { status: 400 },
      );
    }
    const MAX_MB = 15;
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo ${MAX_MB}MB.` },
        { status: 413 },
      );
    }

    const imgUpload = await pinata.upload.public.file(file, { metadata: { name } });

    const metadataJson = { name, description, image: `ipfs://${imgUpload.cid}` };
    const jsonUpload = await pinata.upload.public.json(metadataJson, {
      metadata: { name: `${name}.json` },
    });

    return NextResponse.json({ imageCid: imgUpload.cid, metadataCid: jsonUpload.cid });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error IPFS';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

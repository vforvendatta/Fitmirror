import { NextResponse } from 'next/server';
import type { DiscoverItem } from '@/lib/types';

const DISCOVER: DiscoverItem[] = [
  {
    id: 'd1',
    imageUrl: '/discover/dress-1.png',
    name: 'Emerald Silk Evening Gown',
    category: 'Evening',
  },
  {
    id: 'd2',
    imageUrl: '/discover/dress-2.png',
    name: 'Pastel Floral Summer Dress',
    category: 'Casual',
  },
  {
    id: 'd3',
    imageUrl: '/discover/dress-3.png',
    name: 'Black Off-Shoulder Cocktail',
    category: 'Cocktail',
  },
  {
    id: 'd4',
    imageUrl: '/discover/dress-4.png',
    name: 'Denim Jacket & White Tee',
    category: 'Casual',
  },
  {
    id: 'd5',
    imageUrl: '/discover/dress-5.png',
    name: 'Red Silk Saree with Gold Border',
    category: 'Ethnic',
  },
  {
    id: 'd6',
    imageUrl: '/discover/dress-6.png',
    name: 'Linen Shirt & Trousers Set',
    category: 'Smart',
  },
  {
    id: 'd7',
    imageUrl: '/discover/dress-7.png',
    name: 'Burgundy Velvet Wrap Dress',
    category: 'Evening',
  },
  {
    id: 'd8',
    imageUrl: '/discover/dress-8.png',
    name: 'Lavender Chiffon Midi',
    category: 'Casual',
  },
];

export async function GET() {
  return NextResponse.json(DISCOVER, { status: 200 });
}

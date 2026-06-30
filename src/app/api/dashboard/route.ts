import { NextResponse } from 'next/server'
import { seedData } from '@/lib/seed-data'

export async function GET() {
  // Simulate network delay for realistic loading
  await new Promise(resolve => setTimeout(resolve, 300))
  return NextResponse.json(seedData)
}
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PageKey } from '@/lib/types'

export type NotificationType = 'error' | 'warning' | 'info' | 'success'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  createdAt: string
  page?: PageKey
}

interface NotificationsState {
  notifications: Notification[]
  markAsRead: (id: string) => void
  markAllRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
}

const now = new Date()
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString()

const seedNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Google Ads Sync Failed',
    message: 'Token expired. Re-authenticate in Settings to restore data sync.',
    type: 'error',
    read: false,
    createdAt: minutesAgo(12),
    page: 'settings',
  },
  {
    id: 'notif-2',
    title: 'Low Stock: Vintage Brake Lever Set',
    message: 'Only 8 units remaining. Consider restocking or pausing campaigns.',
    type: 'warning',
    read: false,
    createdAt: hoursAgo(2),
    page: 'products',
  },
  {
    id: 'notif-3',
    title: 'Low Stock: LED Headlight Conversion Kit',
    message: 'Only 12 units remaining. Consider restocking or pausing campaigns.',
    type: 'warning',
    read: false,
    createdAt: hoursAgo(3),
    page: 'products',
  },
  {
    id: 'notif-4',
    title: 'Campaign ROAS Below Target',
    message: '"Retargeting — Abandoned Carts" has dropped to 1.8x ROAS. Consider pausing or adjusting audience.',
    type: 'warning',
    read: false,
    createdAt: hoursAgo(5),
    page: 'meta-ads',
  },
  {
    id: 'notif-5',
    title: 'Shopify Products Synced',
    message: '142 products synced successfully. 3 new products detected.',
    type: 'success',
    read: true,
    createdAt: hoursAgo(6),
    page: 'dashboard',
  },
  {
    id: 'notif-6',
    title: 'AI Copy Generation Complete',
    message: 'Generated 5 new ad copy variants for "Cafe Racer Handlebar Bundle".',
    type: 'info',
    read: true,
    createdAt: hoursAgo(8),
    page: 'ad-copy',
  },
  {
    id: 'notif-7',
    title: 'Meta Ads Budget Pacing Alert',
    message: 'Your daily budget is 85% spent with 6 hours remaining. Consider increasing budget.',
    type: 'warning',
    read: true,
    createdAt: daysAgo(1),
    page: 'meta-ads',
  },
  {
    id: 'notif-8',
    title: 'New Customer Review (5★)',
    message: '"Amazing quality!" — Review submitted for "Leather Seat Upholstery Kit".',
    type: 'success',
    read: true,
    createdAt: daysAgo(1),
    page: 'products',
  },
  {
    id: 'notif-9',
    title: 'Google Ads Performance Report',
    message: 'Weekly summary: 2,340 clicks, $1,280 spend, 3.2x ROAS across 4 campaigns.',
    type: 'info',
    read: true,
    createdAt: daysAgo(2),
    page: 'google-ads',
  },
  {
    id: 'notif-10',
    title: 'Image Asset Generation Failed',
    message: 'Failed to generate product image for "Exhaust Pipe Shield". API rate limit reached.',
    type: 'error',
    read: true,
    createdAt: daysAgo(2),
    page: 'image-maker',
  },
]

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: seedNotifications,

      markAsRead: (id: string) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      deleteNotification: (id: string) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () =>
        set({ notifications: [] }),
    }),
    {
      name: 'glootie-notifications',
    }
  )
)

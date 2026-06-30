import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PageKey, NavigationState } from '@/lib/types'

export const useNavigation = create<NavigationState>()(
  persist(
    (set) => ({
      currentPage: 'dashboard',
      previousPage: null,
      selectedProductId: null,
      sidebarOpen: false,
      showCreateCampaignModal: false,

      navigate: (page: PageKey, productId?: string) =>
        set((state) => ({
          previousPage: state.currentPage,
          currentPage: page,
          selectedProductId: productId ?? null,
          sidebarOpen: false,
          showCreateCampaignModal: false
        })),

      goBack: () =>
        set((state) => ({
          currentPage: state.previousPage ?? 'dashboard',
          previousPage: state.currentPage,
          selectedProductId: null
        })),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open: boolean) =>
        set({ sidebarOpen: open }),

      setShowCreateCampaignModal: (show: boolean) =>
        set({ showCreateCampaignModal: show }),
    }),
    {
      name: 'glootie-navigation',
      partialize: (state) => ({
        currentPage: state.currentPage,
      }),
    }
  )
)
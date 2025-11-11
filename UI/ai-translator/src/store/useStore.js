import { create } from "zustand";

import { persist } from "zustand/middleware";

const useStore = create(
  persist((set, get) => ({
    user: null,
    bearCount: 0,
    increaseBearCount: () =>
      set((state) => ({ bearCount: state.bearCount + 1 })),
    fetchUser: async () => {
      const response = await fetch("https://fake-json-api.mock.beeceptor.com/companies");
      const data = await response.json();
      set({ user: data });
    }
  })
  ,
  {
    name: 'bear-store',
    partialize: (state) => ({ 
      bearCount: state.bearCount 
      // Only save bearCount, not user data
    })
  }
)
);

export default useStore;

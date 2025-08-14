// src/contexts/DataContext.tsx
import React, { createContext, useContext, useState } from 'react';

// The interface no longer contains triggerRefresh.
interface DataContextType {
  refreshKey: number; 
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // The triggerRefresh function is removed.

  return (
    <DataContext.Provider value={{ refreshKey }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
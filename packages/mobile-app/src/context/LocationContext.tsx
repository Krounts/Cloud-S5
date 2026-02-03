import React, { createContext, useContext, useState } from 'react'

interface LocationContextType {
  selectedLocation: { lat: number; lng: number } | null
  setSelectedLocation: (location: { lat: number; lng: number } | null) => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)

  return (
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation }}>
      {children}
    </LocationContext.Provider>
  )
}

export const useLocationContext = () => {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocationContext must be used within LocationProvider')
  }
  return context
}

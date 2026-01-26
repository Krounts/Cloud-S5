import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { offlineMapService } from '../services/OfflineMapService'

interface OfflineTileLayerProps {
  url: string
  attribution?: string
}

export const OfflineTileLayer: React.FC<OfflineTileLayerProps> = ({ url, attribution }) => {
  const map = useMap()
  const layerRef = useRef<L.TileLayer | null>(null)

  useEffect(() => {
    // Créer un TileLayer personnalisé qui vérifie d'abord le cache
    const OfflineTileLayerClass = L.TileLayer.extend({
      createTile: function (coords: L.Coords, done: L.DoneCallback) {
        const tile = document.createElement('img')
        const { x, y, z } = coords

        // Essayer de charger depuis le cache d'abord
        offlineMapService
          .getTile(x, y, z)
          .then((blob) => {
            if (blob) {
              // Utiliser la tuile en cache
              tile.src = URL.createObjectURL(blob)
              done(null, tile)
            } else {
              // Charger depuis le réseau et sauvegarder
              const tileUrl = L.Util.template(url, { ...coords, s: 'a' })
              fetch(tileUrl)
                .then((response) => response.blob())
                .then((blob) => {
                  tile.src = URL.createObjectURL(blob)
                  // Sauvegarder pour usage futur
                  offlineMapService.saveTile(x, y, z, blob).catch(console.error)
                  done(null, tile)
                })
                .catch((error) => {
                  done(error, tile)
                })
            }
          })
          .catch((error) => {
            // Fallback vers le réseau si erreur de cache
            tile.src = L.Util.template(url, { ...coords, s: 'a' })
            done(null, tile)
          })

        return tile
      },
    })

    // Créer et ajouter la couche
    layerRef.current = new OfflineTileLayerClass(url, {
      attribution: attribution || '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    })

    layerRef.current.addTo(map)

    // Nettoyage
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [map, url, attribution])

  return null
}

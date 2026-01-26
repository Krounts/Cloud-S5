// Service de gestion des tuiles de carte hors ligne
// Stocke les tuiles dans IndexedDB pour une utilisation sans connexion

const DB_NAME = 'offline_maps'
const STORE_NAME = 'tiles'
const DB_VERSION = 1

interface TileCoords {
  x: number
  y: number
  z: number
}

class OfflineMapService {
  private db: IDBDatabase | null = null

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        }
      }
    })
  }

  private getTileKey(x: number, y: number, z: number): string {
    return `${z}/${x}/${y}`
  }

  async saveTile(x: number, y: number, z: number, blob: Blob): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const key = this.getTileKey(x, y, z)

      const request = store.put({ key, blob, timestamp: Date.now() })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getTile(x: number, y: number, z: number): Promise<Blob | null> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const key = this.getTileKey(x, y, z)

      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.blob : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async downloadTiles(
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
    zoom: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    // Initialiser la DB avant de commencer
    if (!this.db) await this.initDB()

    // Convertir les coordonnées lat/lng en coordonnées de tuiles
    const minTile = this.latLngToTile(bounds.maxLat, bounds.minLng, zoom)
    const maxTile = this.latLngToTile(bounds.minLat, bounds.maxLng, zoom)

    // S'assurer que min < max
    const tiles: TileCoords[] = []
    const xMin = Math.min(minTile.x, maxTile.x)
    const xMax = Math.max(minTile.x, maxTile.x)
    const yMin = Math.min(minTile.y, maxTile.y)
    const yMax = Math.max(minTile.y, maxTile.y)

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ x, y, z: zoom })
      }
    }

    console.log(`Downloading ${tiles.length} tiles for zoom ${zoom}`)
    let completed = 0
    const total = tiles.length

    // Télécharger les tuiles par batch pour éviter de surcharger
    const batchSize = 5
    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (tile) => {
          try {
            const url = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`
            const response = await fetch(url)
            if (response.ok) {
              const blob = await response.blob()
              await this.saveTile(tile.x, tile.y, tile.z, blob)
              console.log(`Saved tile ${tile.z}/${tile.x}/${tile.y}`)
            } else {
              console.error(`Failed to fetch tile ${tile.z}/${tile.x}/${tile.y}: ${response.status}`)
            }
          } catch (error) {
            console.error(`Failed to download tile ${tile.z}/${tile.x}/${tile.y}`, error)
          }
          completed++
          if (onProgress) {
            onProgress(completed, total)
          }
        })
      )
      // Pause entre les batchs pour être respectueux avec le serveur OSM
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const n = Math.pow(2, zoom)
    const x = Math.floor(((lng + 180) / 360) * n)
    const latRad = (lat * Math.PI) / 180
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
    return { x, y }
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) await this.initDB()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

export const offlineMapService = new OfflineMapService()

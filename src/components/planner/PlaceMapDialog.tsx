'use client'

import type { Map as MapLibreMap } from 'maplibre-gl'
import { MapPin } from 'lucide-react'
import { useRef } from 'react'
import { MapboxSurface } from '@/components/map/MapboxSurface'
import { PlaceFeedbackPanel } from '@/components/planner/PlaceFeedbackPanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/hooks/useI18n'
import type { PlannerRecommendation } from '@/lib/planner-recommendations'

type PlaceMapDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  place: PlannerRecommendation | null
}

export function PlaceMapDialog({
  open,
  onOpenChange,
  place,
}: PlaceMapDialogProps) {
  const { t } = useI18n()
  const mapRef = useRef<MapLibreMap | null>(null)

  if (!place) return null

  const markers = [
    {
      id: place.id,
      lng: place.lng,
      lat: place.lat,
      color: '#38bdf8',
      popup: {
        title: place.title,
        subtitle: place.place,
        detail: place.badge,
      },
    },
  ]

  const isEvent = place.id.startsWith('event-')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-2 pr-6">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden />
              <span>{place.title}</span>
            </DialogTitle>
            <DialogDescription>
              {isEvent ? t('places.event') : place.place} · {place.address}
            </DialogDescription>
          </DialogHeader>
          <p className="mt-2 text-xs text-[var(--nora-text-muted)]">{place.badge}</p>
        </div>
        <div className="nora-divider h-[min(52vh,360px)] w-full">
          {open ? (
            <MapboxSurface
              className="h-full w-full"
              markers={markers}
              onMap={(map) => {
                mapRef.current = map
                map.jumpTo({
                  center: [place.lng, place.lat],
                  zoom: 15,
                })
              }}
            />
          ) : null}
        </div>
        <div className="nora-divider p-4">
          <PlaceFeedbackPanel placeId={place.id} />
        </div>
        <DialogFooter className="p-4 pt-0">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            {t('places.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

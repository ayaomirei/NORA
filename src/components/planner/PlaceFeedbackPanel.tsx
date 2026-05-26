'use client'

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { usePlaceFeedbackRefresh } from '@/hooks/usePlaceFeedbackRefresh'
import {
  addPlaceReview,
  fetchReviewsForPlace,
  hasUserReviewedPlaceAsync,
  type PlaceReview,
} from '@/lib/place-reviews-storage'
import {
  getPlacePreferenceAsync,
  setPlacePreference,
  type PlacePreference,
} from '@/lib/place-preferences-storage'
import { cn } from '@/lib/utils'

type PlaceFeedbackPanelProps = {
  placeId: string
  compact?: boolean
}

export function PlaceFeedbackPanel({
  placeId,
  compact = false,
}: PlaceFeedbackPanelProps) {
  const { user } = useAuth()
  const { t } = useI18n()
  usePlaceFeedbackRefresh()

  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pref, setPref] = useState<PlacePreference | null>(null)
  const [reviews, setReviews] = useState<PlaceReview[]>([])
  const [avg, setAvg] = useState<number | null>(null)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const [data, p, reviewed] = await Promise.all([
      fetchReviewsForPlace(placeId),
      getPlacePreferenceAsync(user.id, placeId),
      hasUserReviewedPlaceAsync(user.id, placeId),
    ])
    setReviews(data.reviews)
    setAvg(data.avg)
    setPref(p)
    setAlreadyReviewed(reviewed)
  }, [placeId, user])

  useEffect(() => {
    void load()
  }, [load])

  if (!user) return null

  async function setPrefHandler(next: PlacePreference | null) {
    const value = pref === next ? null : next
    await setPlacePreference(user!.id, placeId, value)
    setPref(value)
  }

  async function submitReview() {
    setError(null)
    try {
      await addPlaceReview({
        placeId,
        userId: user!.id,
        nickname: user!.nickname,
        rating,
        text,
      })
      setText('')
      await load()
    } catch {
      setError(t('places.reviewEmpty'))
    }
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-[var(--nora-text-muted)]">
          {t('places.feedback')}
        </span>
        <Button
          type="button"
          size="sm"
          variant={pref === 'like' ? 'default' : 'secondary'}
          className="gap-1"
          onClick={() => void setPrefHandler('like')}
          aria-pressed={pref === 'like'}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {t('places.like')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={pref === 'dislike' ? 'default' : 'secondary'}
          className="gap-1"
          onClick={() => void setPrefHandler('dislike')}
          aria-pressed={pref === 'dislike'}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {t('places.dislike')}
        </Button>
        {avg !== null ? (
          <span className="ml-auto flex items-center gap-1.5">
            <StarRating
              value={Math.round(avg)}
              size="sm"
              label={t('places.avgRating', { rating: String(avg) })}
            />
            <span className="text-[11px] tabular-nums text-amber-500 dark:text-amber-300">
              {avg}
            </span>
          </span>
        ) : null}
      </div>

      {!compact ? (
        <div className="nora-divider space-y-2 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
            {t('places.reviews')}
          </p>
          {reviews.length === 0 ? (
            <p className="text-xs text-[var(--nora-text-muted)]">
              {t('places.noReviews')}
            </p>
          ) : (
            <ul className="max-h-36 space-y-2 overflow-y-auto">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="nora-surface-card rounded-lg px-2.5 py-2"
                >
                  <p className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium text-[var(--nora-text)]">
                      @{r.nickname}
                    </span>
                    <StarRating value={r.rating} size="sm" />
                  </p>
                  <p className="mt-1 text-xs text-[var(--nora-text-muted)]">
                    {r.text}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {!alreadyReviewed ? (
            <div className="space-y-2 pt-1">
              <div className="block space-y-1.5">
                <span className="text-[11px] text-[var(--nora-text-muted)]">
                  {t('places.yourRating')}
                </span>
                <StarRating
                  value={rating}
                  onChange={setRating}
                  label={t('places.yourRating')}
                />
              </div>
              <textarea
                className="glass-input min-h-[64px] w-full resize-y px-2.5 py-2 text-xs"
                placeholder={t('places.reviewPlaceholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
              />
              {error ? (
                <p className="text-xs text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="button" size="sm" onClick={() => void submitReview()}>
                {t('places.addReview')}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-[var(--nora-text-muted)]">
              {t('places.alreadyReviewed')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

import React, { useEffect, useState, useRef } from 'react';

interface ClockProps {
  since: Date,
  durationInSeconds: number
}

const Clock = ({ since, durationInSeconds }: ClockProps) => {
  // eslint-disable-next-line
  const [count, setCount] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout>()

  const getCount = () => {
    const noPenaltyAt = Math.floor(since.getTime() / 1000) + durationInSeconds
    const remaining = noPenaltyAt - Math.floor(Date.now() / 1000)
    if (remaining > 0) {
      return remaining
    } else {
      return 0
    }
  }

  const renderTime = () => {
    const total = getCount()
    const hours = Math.floor(total / 60 / 60)
    const minutes = Math.floor(total / 60) % 60
    const prefixMinutes = minutes < 10 ? '0' : ''
    const seconds = total % 60
    const prefixSeconds = seconds < 10 ? '0' : ''

    return `${hours}:${prefixMinutes}${minutes}:${prefixSeconds}${seconds}`
  }

  // rerender every second
  useEffect(() => {
    intervalRef.current = setInterval(() => setCount(count => count + 1), 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <>
      {renderTime()}
    </>
  )
}

export default Clock

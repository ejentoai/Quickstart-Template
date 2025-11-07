import { useCallback, useEffect, useRef, useState } from 'react'

export const useScrollAnchor = () => {
  const messagesRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const visibilityRef = useRef<HTMLDivElement>(null)

  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isVisible, setIsVisible] = useState(false)

  const scrollToBottom = useCallback(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollIntoView({
        block: 'end',
        behavior: 'smooth'
      })
    }
  }, [])

  useEffect(() => {
    if (messagesRef.current) {
      if (isAtBottom && !isVisible) {
        // console.log("isAtBottom:",isAtBottom,"---isVisible:",isVisible)
        messagesRef.current.scrollIntoView({
          block: 'end'
        })
      }
    }
  }, [isAtBottom, isVisible])

  useEffect(() => {
    const { current } = scrollRef
    // console.log('inside useEffect')
    if (current) {
    // console.log('inside if')

    const handleScroll = (event: Event) => {
    // console.log('Scroll event triggered');
    const target = event.target as HTMLDivElement;
    const offset = 25;
    const isAtBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - offset;
    // console.log("isAtBottom:", isAtBottom);
    setIsAtBottom(isAtBottom);
}

      current.addEventListener('scroll', handleScroll, {
        passive: true
      })

      return () => {
        current.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    if (visibilityRef.current) {
      let observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setIsVisible(true)
            } else {
              setIsVisible(false)
            }
          })
        },
        {
          rootMargin: '0px 0px -150px 0px'
        }
      )

      observer.observe(visibilityRef.current)
      // console.log("isVisible:",isVisible)
      return () => {
        observer.disconnect()
      }
    }
  })

  return {
    messagesRef,
    scrollRef,
    visibilityRef,
    scrollToBottom,
    isAtBottom,
    isVisible
  }
}

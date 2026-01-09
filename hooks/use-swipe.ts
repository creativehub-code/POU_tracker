import { useState, TouchEvent } from 'react';

interface SwipeInput {
    onSwipedLeft: () => void;
    onSwipedRight: () => void;
}

export const useSwipe = ({ onSwipedLeft, onSwipedRight }: SwipeInput) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Minimum distance (in px) required to be considered a swipe
    const minSwipeDistance = 50;

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            onSwipedLeft();
        }
        if (isRightSwipe) {
            onSwipedRight();
        }
    };

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
};

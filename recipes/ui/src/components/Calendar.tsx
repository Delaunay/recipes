


import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Grid,
    GridItem,
    Text,
    Button,
    HStack,
    Heading,
    IconButton,
} from '@chakra-ui/react';
import { recipeAPI, Event } from '../services/api';
import EventCreateModal from './EventCreateModal';

// Individual Event Component
interface CalendarEventProps {
    event: Event;
    position: { top: number; height: number };
    onClick?: (event: Event) => void;
    onEdit?: (event: Event) => void;
    onDelete?: (event: Event) => void;
    onTimeChange?: (event: Event, newStartTime: Date, newEndTime: Date) => void;
    onDragStart?: (event: Event, position: { top: number; height: number }) => void;
    timeSlotHeight: number;
    snapInterval: number;
    gridWeek: GridWeek;
    dayIndex: number;
    isMock?: boolean;
    isDragging?: boolean;
    draggedEventData?: Event | null;
    mockPosition?: { top: number; height: number; dayIndex?: number } | null;
}

const CalendarEvent: React.FC<CalendarEventProps> = ({
    event,
    position,
    onClick,
    onEdit: _onEdit,
    onDelete: _onDelete,
    onTimeChange,
    onDragStart,
    timeSlotHeight,
    snapInterval,
    gridWeek,
    dayIndex,
    isMock,
    isDragging,
    draggedEventData,
    mockPosition
}) => {
    const [isDraggingState, setIsDraggingState] = useState(false);
    const dragOperationRef = useRef<DragOperation | null>(null);
    const eventRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState("");
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

    // For mock events, use the provided position and don't handle interactions
    if (isMock) {
        // Calculate which day column this mock event should be in based on drag position
        const dayWidth = gridWeek.getWeekWidth() / 7; // 7 days
        let dayIndex = 0;

        if (mockPosition && draggedEventData) {
            // Use the dayIndex from the drag position if available
            dayIndex = mockPosition.dayIndex !== undefined ? mockPosition.dayIndex : 0;
        }

        const leftPosition = dayIndex * dayWidth;

        // Use the dragged event data for the mock display, or fallback to the passed event
        const displayEvent = draggedEventData || event;

        return (
            <Box
                ref={eventRef}
                position="absolute"
                top={`${mockPosition?.top || 0}px`}
                left={`${leftPosition}px`}
                width={`${dayWidth}px`}
                height={`${mockPosition?.height || 30}px`}
                bg={displayEvent.color || "blue.500"}
                color="white"
                p={2}
                py={1}
                borderRadius="md"
                fontSize="sm"
                fontWeight="bold"
                zIndex={1000}
                boxShadow="lg"
                border="1px solid"
                borderColor="blue.600"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                opacity={0.8}
                userSelect="none"
                pointerEvents="none"
                style={{
                    display: isDragging && draggedEventData ? 'flex' : 'none'
                }}
                data-day-index={dayIndex}
            >
                <Box flex="1" overflow="hidden">
                    <Text fontWeight="bold" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                        {displayEvent.title}
                    </Text>
                    {displayEvent.description && (mockPosition?.height || 30) > 30 && (
                        <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontSize="xs" opacity={0.9}>
                            {displayEvent.description}
                        </Text>
                    )}
                </Box>
            </Box>
        );
    }

    // If the original event is being dragged, hide it but keep it in DOM
    const shouldHide = isDragging;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent day click when clicking on event
        if (onClick) {
            onClick(event);
        }
    };



    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Get the calendar container
        const calendarContainer = document.querySelector('.class-grid') as HTMLElement;
        if (!calendarContainer || !eventRef.current) return;

        // Find the mock event element
        const mockEvent = document.querySelector('[data-mock-event="true"]') as HTMLDivElement;
        if (!mockEvent) return;

        // Use the dayIndex passed from the parent component (already correct for the day column)

        // Get container rect for mouse offset calculation
        const containerRect = calendarContainer.getBoundingClientRect();

        // Create drag operation
        dragOperationRef.current = new DragOperation(
            mockEvent,
            gridWeek,
            eventRef.current,
            event,
            { top: position.top, height: position.height, dayIndex },
            timeSlotHeight,
            { x: e.clientX, y: e.clientY },
            containerRect,
            onTimeChange
        );

        // Start drag operation
        dragOperationRef.current.onDragStart();
        setIsDraggingState(true);

        // Notify parent component about drag start
        if (onDragStart) {
            onDragStart(event, position);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingState || !dragOperationRef.current) return;

        // Update cursor position for badge
        setCursorPosition({ x: e.clientX, y: e.clientY });

        // Get the calendar container
        const calendarContainer = document.querySelector('.class-grid') as HTMLElement;
        if (!calendarContainer) return;

        const containerRect = calendarContainer.getBoundingClientRect();

        // Update drag operation
        const result = dragOperationRef.current.onDragMove(e.clientX, e.clientY, containerRect);
        if (result) {
            setCurrentTime(result.time);
        }
    };

    const handleMouseUp = () => {
        if (!isDraggingState || !dragOperationRef.current) return;

        // Complete drag operation
        dragOperationRef.current.onDrop();

        setIsDraggingState(false);
        setCurrentTime("");
        dragOperationRef.current = null;

        // Drag operation completed
    };

    useEffect(() => {
        if (isDraggingState) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDraggingState, timeSlotHeight, snapInterval]);

    return (
        <>
            <Box
                ref={eventRef}
                position="absolute"
                top={`${position.top}px`}
                left="0"
                right="0"
                height={`${position.height}px`}
                bg={event.color || "blue.500"}
                color="white"
                p={2}
                py={1}
                borderRadius="md"
                fontSize="sm"
                fontWeight="bold"
                zIndex={isDraggingState ? 1000 : 1}
                cursor={isDraggingState ? "grabbing" : "grab"}
                boxShadow="lg"
                border="1px solid"
                borderColor="blue.600"
                onClick={handleClick}
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                onMouseDown={handleMouseDown}
                opacity={isDraggingState ? 0.8 : 1}
                userSelect="none"
                transition={isDraggingState ? "none" : "all 0.2s"}
                _hover={{
                    opacity: isDraggingState ? 0.8 : 0.9,
                    transform: isDraggingState ? "scale(1.05)" : "scale(1.02)"
                }}
                style={{
                    visibility: shouldHide ? 'hidden' : 'visible'
                }}
            >
                <Box flex="1" overflow="hidden">
                    <Text fontWeight="bold" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                        {event.title}
                    </Text>
                    {event.description && position.height > 30 && (
                        <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontSize="xs" opacity={0.9}>
                            {event.description}
                        </Text>
                    )}
                </Box>
            </Box>

            {/* Cursor Badge */}
            <CursorBadge
                time={currentTime}
                isVisible={isDraggingState}
                position={cursorPosition}
            />
        </>
    );
};

// Cursor Badge Component
interface CursorBadgeProps {
    time: string;
    isVisible: boolean;
    position: { x: number; y: number };
}

const CursorBadge: React.FC<CursorBadgeProps> = ({ time, isVisible, position }) => {
    if (!isVisible) return null;

    return (
        <Box
            position="fixed"
            left={`${position.x + 10}px`}
            top={`${position.y - 40}px`}
            bg="blue.500"
            color="white"
            px={2}
            py={1}
            borderRadius="md"
            fontSize="sm"
            fontWeight="bold"
            zIndex={10000}
            pointerEvents="none"
            boxShadow="lg"
            border="1px solid"
            borderColor="blue.600"
        >
            {time}
        </Box>
    );
};

// Hook to measure container and calculate time slot heights
const useCalendarSizing = () => {
    const [timeSlotHeight, setTimeSlotHeight] = useState(33);
    const [totalCalendarHeight, setTotalCalendarHeight] = useState(600);
    const [weekWidth, setWeekWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const calculateSizing = () => {
            const rect = element.getBoundingClientRect();
            const containerHeight = rect.height;
            const containerWidth = rect.width;

            // Account for day header (50px) and padding
            const headerHeight = 50;
            const padding = 32; // Account for container padding
            const availableHeight = containerHeight - headerHeight - padding;

            // We have 18 hours (6 to 23)
            const hoursCount = 18;

            // Calculate optimal time slot height
            const calculatedHeight = availableHeight / hoursCount;

            // Set minimum and maximum constraints
            const minSlotHeight = 25;
            const maxSlotHeight = 80;

            const optimalHeight = Math.max(minSlotHeight, Math.min(maxSlotHeight, calculatedHeight));

            setTimeSlotHeight(optimalHeight);
            setTotalCalendarHeight(optimalHeight * hoursCount);
            setWeekWidth(containerWidth);
        };

        // Initial calculation
        calculateSizing();

        // Create ResizeObserver for dynamic updates
        const resizeObserver = new ResizeObserver(calculateSizing);
        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return { containerRef, timeSlotHeight, totalCalendarHeight, weekWidth };
};

// Grid class for positioning events within a week grid
class GridWeek {
    private startHour: number;
    private endHour: number;
    private dayHeight: number;
    private timeSlotHeight: number;
    private weekWidth: number;

    constructor(startHour: number, endHour: number, dayHeight: number, timeSlotHeight: number, weekWidth: number) {
        this.startHour = startHour;
        this.endHour = endHour + 1;
        this.dayHeight = dayHeight;
        this.timeSlotHeight = timeSlotHeight;
        this.weekWidth = weekWidth;
    }

    // Get the relative position (0-1) of an event within the day
    getEventPosition(event: Event): { top: number; height: number } {
        const eventStart = new Date(event.datetime_start);
        const eventEnd = new Date(event.datetime_end);

        // Convert hours to minutes for more precise positioning
        const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
        const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
        const dayStartMinutes = this.startHour * 60;
        const dayEndMinutes = this.endHour * 60;

        // Calculate relative positions
        const relativeStart = (startMinutes - dayStartMinutes) / (dayEndMinutes - dayStartMinutes);
        const relativeEnd = (endMinutes - dayStartMinutes) / (dayEndMinutes - dayStartMinutes);

        // Convert to pixel positions
        const top = Math.max(0, relativeStart * this.dayHeight);
        const h = Math.min(this.dayHeight, (relativeEnd - relativeStart) * this.dayHeight);

        // If end time is tomorrow the height will be negative
        const height = h > 0 ? h : this.dayHeight - top;
        return { top, height };
    }

    // Get the snapped position (0-1) of an event within the day
    getEventPositionSnapped(event: Event): { top: number; height: number } {
        // Get the precise position first
        const position = this.getEventPosition(event);

        // Snap the top position to 5-minute intervals
        const snapInterval = this.timeSlotHeight / 12; // 5 minutes = 1/12 of an hour
        const snappedTop = Math.round(position.top / snapInterval) * snapInterval;

        // Return the snapped position with the same height
        return { top: snappedTop, height: position.height };
    }

    // Convert width position to day index (0-6 for Monday-Sunday)
    getDayIndexFromWidth(x: number): number {
        const dayWidth = this.weekWidth / 7; // 7 days
        const dayIndex = Math.trunc((x) / dayWidth);
        return Math.max(0, Math.min(6, dayIndex)); // Clamp to 0-6
    }

    // Convert width position to day name
    getDayNameFromWidth(widthPosition: number): string {
        const dayIndex = this.getDayIndexFromWidth(widthPosition);
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days[dayIndex];
    }

    // Snap width position to the start of a day column
    snapWidthToDayStart(widthPosition: number): number {
        const dayWidth = this.weekWidth / 7; // 7 days
        const dayIndex = this.getDayIndexFromWidth(widthPosition);
        return dayIndex * dayWidth;
    }

    // Get the total time span of the day in minutes
    getDaySpan(): number {
        return (this.endHour - this.startHour) * 60;
    }

    // Get the snap interval in pixels
    getSnapInterval(): number {
        return this.timeSlotHeight / 12; // 5 minutes
    }

    // Get the week width
    getWeekWidth(): number {
        return this.weekWidth;
    }
}

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
};

const getEndOfWeek = (date: Date): Date => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
};

const getToday = (): Date => {
    const d = getStartOfWeek(new Date());
    d.setHours(6, 0, 0, 0);
    return d;
};


class DragOperation {
    // The Mock event we move to visualize the drag and drop operation
    dragOperationVisual: HTMLDivElement;

    // The Grid we use to snap the mock event
    grid: GridWeek;

    // The Original event we will update on drop
    originalEvent: HTMLDivElement;

    // Store the original event data and position
    private originalEventData: Event;
    private originalPosition: { top: number; height: number; dayIndex: number };
    private isDragging: boolean = false;
    private timeSlotHeight: number;
    private onTimeChange?: (event: Event, newStartTime: Date, newEndTime: Date) => void;
    private mouseOffset: { x: number; y: number } = { x: 0, y: 0 };

    constructor(
        dragOperationVisual: HTMLDivElement,
        grid: GridWeek,
        originalEvent: HTMLDivElement,
        eventData: Event,
        position: { top: number; height: number; dayIndex: number },
        timeSlotHeight: number,
        initialMousePos: { x: number; y: number },
        containerRect: DOMRect,
        onTimeChange?: (event: Event, newStartTime: Date, newEndTime: Date) => void
    ) {
        this.dragOperationVisual = dragOperationVisual;
        this.grid = grid;
        this.originalEvent = originalEvent;
        this.originalEventData = eventData;
        this.originalPosition = position;
        this.timeSlotHeight = timeSlotHeight;
        this.onTimeChange = onTimeChange;

        // Calculate mouse offset from the top-left of the event
        const relativeMouseY = initialMousePos.y - containerRect.top;
        this.mouseOffset = {
            x: 0, // We'll handle day switching separately
            y: relativeMouseY - position.top
        };
    }

    onDragStart() {
        // Copy the information of the original event to make the `dragOperationVisual`
        // to make `dragOperationVisual` look exactly like the event we drop over
        // also make `originalEvent` invisible for the duration of the drag and drop

        this.isDragging = true;

        // Make original event invisible
        this.originalEvent.style.visibility = 'hidden';

        // Position the drag visual at the original location with correct height
        this.updateDragVisualPosition(this.originalPosition.top, this.originalPosition.dayIndex, this.originalPosition.height);

        // Make drag visual visible
        this.dragOperationVisual.style.display = 'flex';
        this.dragOperationVisual.style.opacity = '0.8';
    }

    onDragMove(mouseX: number, mouseY: number, containerRect: DOMRect) {
        // Update the position of dragOperationVisual
        if (!this.isDragging) return;

        const relativeX = mouseX - containerRect.left;
        const dayIndex = this.grid.getDayIndexFromWidth(relativeX);

        // Calculate new top position based on mouse Y, accounting for mouse offset
        const relativeMouseY = mouseY - containerRect.top;
        const newTop = Math.max(0, relativeMouseY - this.mouseOffset.y);

        // Snap to grid
        const snapInterval = this.grid.getSnapInterval();
        const snappedTop = Math.round(newTop / snapInterval) * snapInterval;

        this.updateDragVisualPosition(snappedTop, dayIndex);

        // Return current time and day for cursor badge
        return this.calculateCurrentTimeAndDay(snappedTop, dayIndex);
    }

    onDrop() {
        // Update `originalEvent` position to match dragOperationVisual
        // Make dragOperationVisual disappear
        // Update `originalEvent` start and end date

        if (!this.isDragging) return;

        this.isDragging = false;

        // Get final position from drag visual
        const finalTop = parseInt(this.dragOperationVisual.style.top);
        const finalDayIndex = parseInt(this.dragOperationVisual.dataset.dayIndex || '0');


        // Update the event if onTimeChange callback is provided
        if (this.onTimeChange) {
            this.updateEventTime(finalTop, finalDayIndex);
        }
        // Hide drag visual
        this.dragOperationVisual.style.display = 'none';

        // Show original event
        this.originalEvent.style.visibility = 'visible';

        // Return the new position data for the parent component to handle
        return {
            top: finalTop,
            dayIndex: finalDayIndex,
            event: this.originalEventData
        };
    }

    private updateDragVisualPosition(top: number, dayIndex: number, height?: number) {
        const dayWidth = this.grid.getWeekWidth() / 7;
        const leftPosition = dayIndex * dayWidth;

        this.dragOperationVisual.style.top = `${top}px`;
        this.dragOperationVisual.style.left = `${leftPosition}px`;
        this.dragOperationVisual.style.width = `${dayWidth}px`;
        if (height !== undefined) {
            this.dragOperationVisual.style.height = `${height}px`;
        }
        this.dragOperationVisual.dataset.dayIndex = dayIndex.toString();
    }

    private calculateCurrentTimeAndDay(top: number, dayIndex: number) {
        const newHour = Math.floor(top / this.timeSlotHeight) + 6;
        const newMinutes = Math.floor((top % this.timeSlotHeight) / this.timeSlotHeight * 60);
        const snappedMinutes = Math.round(newMinutes / 5) * 5;

        const timeString = `${newHour.toString().padStart(2, '0')}:${snappedMinutes.toString().padStart(2, '0')}`;
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayString = days[dayIndex] ? ` - ${days[dayIndex]}` : "";

        return {
            time: timeString + dayString,
            dayIndex: dayIndex
        };
    }

    private updateEventTime(top: number, dayIndex: number) {
        if (!this.onTimeChange) return;

        // Calculate new start time based on final position
        const newHour = Math.floor(top / this.timeSlotHeight) + 6;
        const newMinutes = Math.floor((top % this.timeSlotHeight) / this.timeSlotHeight * 60);
        const snappedMinutes = Math.round(newMinutes / 5) * 5;

        const originalStart = new Date(this.originalEventData.datetime_start);
        const originalEnd = new Date(this.originalEventData.datetime_end);
        const durationMs = originalEnd.getTime() - originalStart.getTime();

        const newStartTime = new Date(originalStart);
        newStartTime.setHours(newHour, snappedMinutes, 0, 0);

        // Update the date using the final day index
        if (dayIndex >= 0 && dayIndex < 7) {
            const startOfWeek = getStartOfWeek(new Date());
            newStartTime.setDate(startOfWeek.getDate() + dayIndex);
        }

        const newEndTime = new Date(newStartTime.getTime() + durationMs);

        // Apply the change
        this.onTimeChange(this.originalEventData, newStartTime, newEndTime);
    }

    cancel() {
        // Cancel the drag operation and restore original state
        this.isDragging = false;
        this.originalEvent.style.visibility = 'visible';
        this.dragOperationVisual.style.display = 'none';
    }

    getIsDragging(): boolean {
        return this.isDragging;
    }
}

interface WeeklyCalendarProps {
    initialDate?: Date;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ initialDate }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 s 23

    // Use the sizing hook
    const { containerRef, timeSlotHeight, totalCalendarHeight, weekWidth } = useCalendarSizing();

    const [events, setEvents] = useState<Event[]>([]);
    const [currentWeek, setCurrentWeek] = useState<Date>(initialDate || new Date());
    const [dayAxis, setDayAxis] = useState<GridWeek | null>(null);
    const calendarContentRef = useRef<HTMLDivElement>(null);

    // Drag and drop state
    const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>();
    const [modalInitialTime, setModalInitialTime] = useState<string | undefined>();

    // Event handlers
    const handleEventClick = (event: Event) => {
        console.log('Event clicked:', event);
        // You can add more functionality here like opening a modal, editing, etc.
    };

    const handleEventEdit = (event: Event) => {
        console.log('Edit event:', event);
        // Add edit functionality here
    };

    const handleEventDelete = (event: Event) => {
        console.log('Delete event:', event);
        // Add delete functionality here
    };

    const handleDayClick = (dayName: string, event: React.MouseEvent) => {
        // Don't show modal if dragging
        if (isDragging) return;

        // Calculate which time slot was clicked
        const dayElement = event.currentTarget;
        const rect = dayElement.getBoundingClientRect();
        const clickY = event.clientY - rect.top;

        // Calculate the time based on click position
        // Each hour slot has a height of timeSlotHeight pixels
        // Start hour is 6, so we need to add 6 to the calculated hour
        const totalMinutesFromStart = (clickY / timeSlotHeight) * 60; // Convert to minutes
        const hoursFromStart = Math.floor(totalMinutesFromStart / 60);
        const minutesInHour = Math.floor((totalMinutesFromStart % 60) / 15) * 15; // Snap to 15-minute intervals

        const clickedHour = Math.max(6, Math.min(23, 6 + hoursFromStart)); // Clamp between 6-23
        const clickedMinutes = Math.min(45, minutesInHour); // Clamp minutes to max 45



        // Calculate the date for the clicked day
        const dayIndex = days.indexOf(dayName);
        const startOfWeek = getStartOfWeek(currentWeek);
        const clickedDate = new Date(startOfWeek);
        clickedDate.setDate(startOfWeek.getDate() + dayIndex);

        // Set modal state and open it
        setModalInitialDate(clickedDate);
        setModalInitialTime(`${clickedHour.toString().padStart(2, '0')}:${clickedMinutes.toString().padStart(2, '0')}`);
        setIsModalOpen(true);
    };

    const handleEventTimeChange = async (event: Event, newStartTime: Date, newEndTime: Date) => {
        try {
            // Only update if the event has an ID
            if (event.id !== undefined) {
                // Update the event on the server
                await recipeAPI.updateEvent(event.id, {
                    datetime_start: newStartTime.toISOString(),
                    datetime_end: newEndTime.toISOString()
                });

                // Update the event in the local events array
                setEvents(prevEvents =>
                    prevEvents.map(e =>
                        e.id === event.id
                            ? {
                                ...e,
                                datetime_start: newStartTime.toISOString(),
                                datetime_end: newEndTime.toISOString()
                            }
                            : e
                    )
                );
            }
        } catch (error) {
            console.error('Error updating event:', error);
            // Optionally show an error message to the user
        }

        // Clear drag state
        setIsDragging(false);
        setDraggedEvent(null);
    };

    // Handle drag start
    const handleDragStart = (event: Event, _position: { top: number; height: number }) => {
        // Set the dragged event and start dragging state
        setDraggedEvent(event);
        setIsDragging(true);
    };

    // Handle event creation
    const handleEventCreated = (newEvent: Event) => {
        // Add the new event to the events list
        setEvents(prevEvents => [...prevEvents, newEvent]);
        // Close the modal
        setIsModalOpen(false);
    };

    // Navigation functions
    const goToPreviousWeek = () => {
        setCurrentWeek(prevWeek => {
            const newWeek = new Date(prevWeek);
            newWeek.setDate(newWeek.getDate() - 7);
            return newWeek;
        });
    };

    const goToNextWeek = () => {
        setCurrentWeek(prevWeek => {
            const newWeek = new Date(prevWeek);
            newWeek.setDate(newWeek.getDate() + 7);
            return newWeek;
        });
    };

    const goToToday = () => {
        setCurrentWeek(new Date());
    };

    // Format week range for display
    const getWeekRangeText = () => {
        const startOfWeek = getStartOfWeek(currentWeek);
        const endOfWeek = getEndOfWeek(currentWeek);

        const formatDate = (date: Date) => {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: startOfWeek.getFullYear() !== endOfWeek.getFullYear() ? 'numeric' : undefined
            });
        };

        return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
    };

    // Check if a given day index is today
    const isToday = (dayIndex: number) => {
        const startOfWeek = getStartOfWeek(currentWeek);
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + dayIndex);

        const today = new Date();
        return dayDate.toDateString() === today.toDateString();
    };

    const fetchEvents = async () => {
        try {
            const startOfWeek = getStartOfWeek(currentWeek);
            const endOfWeek = getEndOfWeek(currentWeek);

            const data = await recipeAPI.getEvents(startOfWeek.toISOString(), endOfWeek.toISOString());
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
            // Set empty array on error to avoid crashes
            setEvents([]);
        }
    };

    // Filter events for a specific day
    const getEventsForDay = (dayName: string): Event[] => {
        const dayIndex = days.indexOf(dayName);
        if (dayIndex === -1) return [];

        const startOfWeek = getStartOfWeek(currentWeek);
        const targetDate = new Date(startOfWeek);
        targetDate.setDate(startOfWeek.getDate() + dayIndex);

        return events.filter(event => {
            const eventDate = new Date(event.datetime_start);
            return eventDate.toDateString() === targetDate.toDateString();
        });
    };

    // Create DayAxis when calendar content is available
    useEffect(() => {
        const newDayAxis = new GridWeek(6, 23, totalCalendarHeight, timeSlotHeight, weekWidth); // Placeholder for weekWidth
        setDayAxis(newDayAxis);
    }, [totalCalendarHeight, timeSlotHeight, weekWidth]);

    // Fetch events when component mounts or week changes
    useEffect(() => {
        fetchEvents();
    }, [currentWeek]);

    return (
        <div
            className="cls-calendar"
            ref={containerRef}
            style={{

                height: "calc(100vh - 6rem)",
                marginTop: "-1rem"
            }}
        >
            {/* Navigation Header */}
            <Box mb={4} p={2} bg="white" borderRadius="md" boxShadow="sm">
                <HStack justify="space-between" align="center">

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousWeek}
                    >
                        ← Previous
                    </Button>
                    <Button
                        variant="solid"
                        size="sm"
                        colorScheme="blue"
                        onClick={goToToday}
                    >
                        Today
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextWeek}
                    >
                        Next →
                    </Button>


                </HStack>
            </Box>

            <Grid
                templateColumns="80px repeat(7, 1fr)"
                templateRows="50px 1fr"
                gap={1}
                borderColor="gray.300"
                borderRadius="md"
                bg="white"
                minH="600px"
                className="class-grid"
                flex="1"
                width="100%"
                height="100%"
            >
                {/* Empty top-left corner */}
                <GridItem
                    border="1px solid"
                    borderColor="gray.200"
                    bg="gray.50"
                />

                {/* Day headers */}
                {days.map((day, index) => {
                    const startOfWeek = getStartOfWeek(currentWeek);
                    const dayDate = new Date(startOfWeek);
                    dayDate.setDate(startOfWeek.getDate() + index);

                    // Helper function to get ordinal suffix
                    const getOrdinalSuffix = (day: number) => {
                        if (day > 3 && day < 21) return 'th';
                        switch (day % 10) {
                            case 1: return 'st';
                            case 2: return 'nd';
                            case 3: return 'rd';
                            default: return 'th';
                        }
                    };

                    const dayNumber = dayDate.getDate();
                    const monthName = dayDate.toLocaleDateString('en-US', { month: 'long' });
                    const formattedDate = `${dayNumber}${getOrdinalSuffix(dayNumber)} ${monthName}`;

                    return (
                        <GridItem
                            key={day}
                            border="1px solid"
                            borderColor="gray.200"
                            bg="blue.50"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontWeight="bold"
                            fontSize="sm"
                            flexDirection="column"
                            py={2}
                        >
                            <Text>{day}</Text>
                            <Text fontSize="xs" fontWeight="normal" color="gray.600" textAlign="center">
                                {formattedDate}
                            </Text>
                        </GridItem>
                    );
                })}

                {/* Time labels column */}
                <GridItem
                    borderTop="1px solid"
                    borderLeft="1px solid"
                    borderRight="1px solid"
                    borderColor="gray.200"
                    bg="gray.50"
                    display="flex"
                    flexDirection="column"
                    height={`${timeSlotHeight * hours.length}px`}
                >
                    {hours.map((hour) => (
                        <Box
                            key={hour}
                            height={`${timeSlotHeight}px`}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            borderBottom="1px solid"
                            borderColor="gray.200"
                            fontSize="sm"
                            fontWeight="medium"
                        >
                            <Text>{hour}:00</Text>
                        </Box>
                    ))}
                </GridItem>

                {/* One massive content area spanning all 7 days and all hours */}
                <GridItem
                    colSpan={7}
                    bg="white"
                    _hover={{ bg: "gray.50" }}
                    position="relative"
                    display="flex"
                    flexDirection="column"
                    id="calendar-content"
                    ref={calendarContentRef}
                    flex="1"
                    minH="0"
                    height={`${timeSlotHeight * hours.length}px`}
                >
                    {/* Mock event for drag preview - always rendered but controlled by CSS */}
                    <Box
                        data-mock-event="true"
                        position="absolute"
                        top="0px"
                        left="0"
                        width="100%"
                        height="30px"
                        bg={draggedEvent?.color || "blue.500"}
                        color="white"
                        p={2}
                        py={1}
                        borderRadius="md"
                        fontSize="sm"
                        fontWeight="bold"
                        zIndex={1000}
                        boxShadow="lg"
                        border="1px solid"
                        borderColor="blue.600"
                        display="none"
                        opacity={0.8}
                        userSelect="none"
                        pointerEvents="none"
                        style={{
                            display: isDragging && draggedEvent ? 'flex' : 'none'
                        }}
                    >
                        {draggedEvent && (
                            <>
                                <Text fontWeight="bold" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                                    {draggedEvent.title}
                                </Text>
                                {draggedEvent.description && (
                                    <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontSize="xs" opacity={0.9}>
                                        {draggedEvent.description}
                                    </Text>
                                )}
                            </>
                        )}
                    </Box>

                    {/* Day columns inside the content area */}
                    <Grid
                        templateColumns="repeat(7, 1fr)"
                        gap={1}
                        flex="1"
                        minH="0"
                    >
                        {days.map((day, dayIndex) => (
                            <GridItem
                                key={day}
                                borderTop="1px solid"
                                borderLeft="1px solid"
                                borderRight="1px solid"
                                borderColor={ "gray.200" }
                                // borderColor={isToday(dayIndex)  ?"gray.500" : "gray.200" }
                                bg={isToday(dayIndex) ? "#fffae6" :"white"}
                                _hover={{ bg: "gray.50" }}
                                minH="200px"
                                id={`calendar-${day}`}
                                // className={isToday(dayIndex) ? "current-day" : ""}
                                position="relative"
                                height="100%"
                                cursor="pointer"
                                onClick={(e) => handleDayClick(day, e)}
                            >
                                {hours.map((hour) => (
                                    <Box
                                        key={hour}
                                        height={`${timeSlotHeight}px`}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        borderBottom="1px solid"
                                        borderColor="gray.200"
                                        fontSize="sm"
                                        fontWeight="medium"
                                    >
                                    </Box>
                                ))}

                                {/* Render events for this day */}
                                {dayAxis && getEventsForDay(day).map((event) => {
                                    const position = dayAxis.getEventPosition(event);
                                    const dayIndex = days.indexOf(day);
                                    return (
                                        <CalendarEvent
                                            key={event.id}
                                            event={event}
                                            position={position}
                                            onClick={handleEventClick}
                                            onEdit={handleEventEdit}
                                            onDelete={handleEventDelete}
                                            onTimeChange={handleEventTimeChange}
                                            timeSlotHeight={timeSlotHeight}
                                            snapInterval={dayAxis.getSnapInterval()}
                                            gridWeek={dayAxis}
                                            dayIndex={dayIndex}
                                            isDragging={isDragging && draggedEvent?.id === event.id}
                                            onDragStart={handleDragStart}
                                        />
                                    );
                                })}
                            </GridItem>
                        ))}
                    </Grid>
                </GridItem>
            </Grid>

            {/* Event Creation Modal */}
            <EventCreateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialDate={modalInitialDate}
                initialTime={modalInitialTime}
                onEventCreated={handleEventCreated}
            />
        </div>
    );
};

export default WeeklyCalendar;
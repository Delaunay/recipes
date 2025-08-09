


import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Grid,
    GridItem,
    Text,
    VStack,
    HStack,
    Button,
    Input,
    Textarea,
    Flex,
    Spacer,
} from '@chakra-ui/react';
import { recipeAPI, Event } from '../services/api';

// Individual Event Component
interface CalendarEventProps {
    event: Event;
    position: { top: number; height: number };
    onClick?: (event: Event) => void;
    onEdit?: (event: Event) => void;
    onDelete?: (event: Event) => void;
    onTimeChange?: (event: Event, newStartTime: Date, newEndTime: Date) => void;
    timeSlotHeight: number;
}

const CalendarEvent: React.FC<CalendarEventProps> = ({
    event,
    position,
    onClick,
    onEdit,
    onDelete,
    onTimeChange,
    timeSlotHeight
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const [originalPosition, setOriginalPosition] = useState({ top: 0, left: 0 });
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [currentTime, setCurrentTime] = useState("");
    const [currentDay, setCurrentDay] = useState("");

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent day click when clicking on event
        if (onClick) {
            onClick(event);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(event);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(event);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        setOriginalPosition({ top: position.top, left: 0 });
        setDragPosition({ x: e.clientX, y: e.clientY });
        setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    const getDayFromPosition = (x: number): string => {
        // Find which day column the cursor is over using a more reliable method
        const dayColumns = document.querySelectorAll('[id^="calendar-"]');

        for (const column of dayColumns) {
            const rect = column.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right) {
                const dayName = column.id.replace('calendar-', '');
                return dayName;
            }
        }

        return "";
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;

        // Update cursor position for badge
        setCursorPosition({ x: e.clientX, y: e.clientY });

        // Determine which day we're over
        const dayName = getDayFromPosition(e.clientX);

        const deltaY = e.clientY - dragPosition.y;
        const newTop = originalPosition.top + deltaY;

        // Snap to 5-minute intervals
        const snapInterval = timeSlotHeight / 12; // 5 minutes = 1/12 of an hour
        const snappedTop = Math.round(newTop / snapInterval) * snapInterval;

        // Update the event position
        const newHour = Math.floor(snappedTop / timeSlotHeight) + 6;
        const newMinutes = Math.floor((snappedTop % timeSlotHeight) / timeSlotHeight * 60);

        // Ensure minutes are snapped to 5-minute intervals
        const snappedMinutes = Math.round(newMinutes / 5) * 5;

        // Format time for badge
        const timeString = `${newHour.toString().padStart(2, '0')}:${snappedMinutes.toString().padStart(2, '0')}`;
        const dayString = dayName ? ` - ${dayName}` : "";

        // Calculate new start time
        const originalStart = new Date(event.datetime_start);
        const originalEnd = new Date(event.datetime_end);
        const durationMs = originalEnd.getTime() - originalStart.getTime();

        const newStartTime = new Date(originalStart);
        newStartTime.setHours(newHour, snappedMinutes, 0, 0);

        console.log(dayName)
        // Update the date if we're over a different day
        if (dayName) {
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayIndex = days.indexOf(dayName);
            if (dayIndex !== -1) {
                const startOfWeek = getStartOfWeek(new Date());
                newStartTime.setDate(startOfWeek.getDate() + dayIndex);
            }
        }

        const newEndTime = new Date(newStartTime.getTime() + durationMs);

        if (onTimeChange) {
            onTimeChange(event, newStartTime, newEndTime);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setCurrentTime("");
        setCurrentDay("");
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragPosition, originalPosition, timeSlotHeight]);

    return (
        <>
            <Box
                position="absolute"
                top={`${position.top}px`}
                left="0"
                right="0"
                height={`${position.height}px`}
                bg={event.color || "blue.500"}
                color="white"
                p={1}
                borderRadius="sm"
                fontSize="xs"
                overflow="hidden"
                cursor={isDragging ? "grabbing" : "grab"}
                _hover={{
                    opacity: 0.9,
                    transform: isDragging ? "scale(1.05)" : "scale(1.02)",
                    transition: "all 0.2s"
                }}
                title={`${event.title} - ${new Date(event.datetime_start).toLocaleTimeString()} to ${new Date(event.datetime_end).toLocaleTimeString()}`}
                onClick={handleClick}
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                onMouseDown={handleMouseDown}
                opacity={isDragging ? 0.8 : 1}
                zIndex={isDragging ? 1000 : 1}
                userSelect="none"
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
                isVisible={isDragging}
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
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const calculateSizing = () => {
            const rect = element.getBoundingClientRect();
            const containerHeight = rect.height;

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

    return { containerRef, timeSlotHeight, totalCalendarHeight };
};

// Axis class for positioning events within a day column
class DayAxis {
    private startHour: number;
    private endHour: number;
    private dayHeight: number;

    constructor(startHour: number, endHour: number, dayHeight: number) {
        this.startHour = startHour;
        this.endHour = endHour + 1;
        this.dayHeight = dayHeight;
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

    // Get the total time span of the day in minutes
    getDaySpan(): number {
        return (this.endHour - this.startHour) * 60;
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


const WeeklyCalendar: React.FC = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6 to 23

    // Use the sizing hook
    const { containerRef, timeSlotHeight, totalCalendarHeight } = useCalendarSizing();

    const [events, setEvents] = useState<Event[]>([]);
    const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
    const [dayAxis, setDayAxis] = useState<DayAxis | null>(null);
    const calendarContentRef = useRef<HTMLDivElement>(null);

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

    const handleDayClick = (dayName: string) => {
        console.log('Day clicked:', dayName);
        // You can add functionality for creating new events on day click
    };

    const handleEventTimeChange = (event: Event, newStartTime: Date, newEndTime: Date) => {
        // console.log('Event time changed:', event, newStartTime, newEndTime);

        // Update the event in the events array
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
    };

    const fetchEvents = async () => {
        try {
            const startOfWeek = getStartOfWeek(currentWeek);
            const endOfWeek = getEndOfWeek(currentWeek);

            const data = await recipeAPI.getEvents(startOfWeek.toISOString(), endOfWeek.toISOString());

            // WHAT IF END TIME IS TOMORROW ?
            const data2: Event[] = [
                {
                    id: 1,
                    title: 'Morning Meeting',
                    description: 'Daily standup with the team',
                    datetime_start: new Date(getToday().getTime()).toISOString(),
                    datetime_end: new Date(getToday().getTime() + 1 * 60 * 60 * 1000).toISOString(),
                    color: '#3182CE',
                    kind: 1,
                    done: false,
                    template: false,
                    recuring: false,
                    active: true,
                },
                {
                    id: 2,
                    title: 'Morning Meeting',
                    description: 'Daily standup with the team',
                    datetime_start: new Date(getToday().getTime() + 24.5 * 60 * 60 * 1000).toISOString(),
                    datetime_end: new Date(getToday().getTime() + 26 * 60 * 60 * 1000).toISOString(),
                    color: '#3182CE',
                    kind: 1,
                    done: false,
                    template: false,
                    recuring: false,
                    active: true,
                },
                {
                    id: 2,
                    title: 'Morning Meeting',
                    description: 'Daily standup with the team',
                    datetime_start: new Date(getToday().getTime() + (25 + 16) * 60 * 60 * 1000).toISOString(),
                    datetime_end: new Date(getToday().getTime() + (26 + 16) * 60 * 60 * 1000).toISOString(),
                    color: '#3182CE',
                    kind: 1,
                    done: false,
                    template: false,
                    recuring: false,
                    active: true,
                },

            ]
            setEvents(data2);
        } catch (error) {
            console.error('Error fetching events:', error);
            // For demo purposes, create some sample events
            // setEvents(generateSampleEvents());
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
        const newDayAxis = new DayAxis(6, 23, totalCalendarHeight);
        setDayAxis(newDayAxis);
    }, [totalCalendarHeight]);

    // Fetch events when component mounts or week changes
    useEffect(() => {
        fetchEvents();
    }, [currentWeek]);

    return (
        <div
            className="cls-calendar"
            ref={containerRef}
            style={{
                minHeight: "calc(100vh - 6rem)"
            }}
        >
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
                {days.map((day) => (
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
                    >
                        <Text>{day}</Text>
                    </GridItem>
                ))}

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
                    {/* Day columns inside the content area */}
                    <Grid
                        templateColumns="repeat(7, 1fr)"
                        gap={1}
                        flex="1"
                        minH="0"
                    >
                        {days.map((day) => (
                            <GridItem
                                key={day}
                                borderTop="1px solid"
                                borderLeft="1px solid"
                                borderRight="1px solid"
                                borderColor="gray.200"
                                bg="white"
                                _hover={{ bg: "gray.50" }}
                                minH="200px"
                                id={`calendar-${day}`}
                                position="relative"
                                height="100%"
                                cursor="pointer"
                                onClick={() => handleDayClick(day)}
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
                                        />
                                    );
                                })}
                            </GridItem>
                        ))}
                    </Grid>
                </GridItem>
            </Grid>
        </div>
    );
};

export default WeeklyCalendar;
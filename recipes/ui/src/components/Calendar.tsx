


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
}

const CalendarEvent: React.FC<CalendarEventProps> = ({
    event,
    position,
    onClick,
    onEdit,
    onDelete
}) => {
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

    return (
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
            cursor="pointer"
            _hover={{
                opacity: 0.9,
                transform: "scale(1.02)",
                transition: "all 0.2s"
            }}
            title={`${event.title} - ${new Date(event.datetime_start).toLocaleTimeString()} to ${new Date(event.datetime_end).toLocaleTimeString()}`}
            onClick={handleClick}
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
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
                    datetime_start: new Date(getToday().getTime() + 25 * 60 * 60 * 1000).toISOString(),
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
        // Use timeSlotHeight * hoursCount for consistent positioning
        const dayHeight = timeSlotHeight * hours.length;
        const newDayAxis = new DayAxis(6, 23, dayHeight);
        setDayAxis(newDayAxis);
    }, [timeSlotHeight]);

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
                                border="1px solid"
                                borderColor="gray.200"
                                bg="white"
                                _hover={{ bg: "gray.50" }}
                                p={2}
                                minH="200px"
                                id={`calendar-${day}`}
                                position="relative"
                                height="100%"
                                cursor="pointer"
                                onClick={() => handleDayClick(day)}
                            >
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
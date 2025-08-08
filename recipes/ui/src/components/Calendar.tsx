


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

// Axis class for positioning events within a day column
class DayAxis {
    private startHour: number;
    private endHour: number;
    private dayHeight: number;

    constructor(startHour: number, endHour: number, dayHeight: number) {
        this.startHour = startHour;
        this.endHour = endHour;
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
        const height = Math.min(this.dayHeight, (relativeEnd - relativeStart) * this.dayHeight);
        
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

    const [events, setEvents] = useState<Event[]>([]);
    const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
    const [dayAxis, setDayAxis] = useState<DayAxis | null>(null);
    const calendarContentRef = useRef<HTMLDivElement>(null);

    const fetchEvents = async () => {
        try {
            const startOfWeek = getStartOfWeek(currentWeek);
            const endOfWeek = getEndOfWeek(currentWeek);

            const data = await recipeAPI.getEvents(startOfWeek.toISOString(), endOfWeek.toISOString());

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
        if (calendarContentRef.current) {
            const contentHeight = calendarContentRef.current.clientHeight;
            const newDayAxis = new DayAxis(6, 23, contentHeight);
            setDayAxis(newDayAxis);
        }
    }, []);

    // Fetch events when component mounts or week changes
    useEffect(() => {
        fetchEvents();
    }, [currentWeek]);

    return (
        <Box p={4} maxW="100%" overflowX="auto">
            <Grid
                templateColumns="80px repeat(7, 1fr)"
                templateRows="50px 1fr"
                gap={1}
                border="2px solid"
                borderColor="gray.300"
                borderRadius="md"
                bg="white"
                minH="600px"
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
                    border="1px solid"
                    borderColor="gray.200"
                    bg="gray.50"
                    display="flex"
                    flexDirection="column"
                >
                    {hours.map((hour) => (
                        <Box
                            key={hour}
                            flex="1"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            borderBottom="1px solid"
                            borderColor="gray.200"
                            fontSize="sm"
                            fontWeight="medium"
                            minH="33px"
                        >
                            <Text>{hour}:00</Text>
                        </Box>
                    ))}
                </GridItem>
                
                {/* One massive content area spanning all 7 days and all hours */}
                <GridItem
                    colSpan={7}
                    border="1px solid"
                    borderColor="gray.200"
                    bg="white"
                    _hover={{ bg: "gray.50" }}
                    position="relative"
                    display="flex"
                    flexDirection="column"
                    id="calendar-content"
                    ref={calendarContentRef}
                >
                    {/* Day columns inside the content area */}
                    <Grid
                        templateColumns="repeat(7, 1fr)"
                        gap={1}
                        flex="1"
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
                            >
                                {/* Render events for this day */}
                                {dayAxis && getEventsForDay(day).map((event) => {
                                    const position = dayAxis.getEventPosition(event);
                                    return (
                                        <Box
                                            key={event.id}
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
                                            _hover={{ opacity: 0.8 }}
                                            title={`${event.title} - ${new Date(event.datetime_start).toLocaleTimeString()} to ${new Date(event.datetime_end).toLocaleTimeString()}`}
                                        >
                                            <Text fontWeight="bold" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                                                {event.title}
                                            </Text>
                                            {event.description && (
                                                <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" fontSize="xs">
                                                    {event.description}
                                                </Text>
                                            )}
                                        </Box>
                                    );
                                })}
                            </GridItem>
                        ))}
                    </Grid>
                </GridItem>
            </Grid>
        </Box>
    );
};

export default WeeklyCalendar;
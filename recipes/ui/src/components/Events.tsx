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
import WeeklyCalendar from './Calendar';


const Events: React.FC = () => {


    return <WeeklyCalendar />;

    const [events, setEvents] = useState<Event[]>([]);
    const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<Partial<Event>>({
        title: '',
        description: '',
        datetime_start: '',
        datetime_end: '',
        location: '',
        color: '#3182CE',
        kind: 1,
    });
    const [duration, setDuration] = useState<number>(60); // Duration in minutes
    const [activeField, setActiveField] = useState<'duration' | 'endTime' | null>(null);

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const timeSlots = [
        '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
        '20:00', '21:00', '22:00', '23:00'
    ];

    useEffect(() => {
        fetchEvents();
    }, [currentWeek]);

    // Calculate duration when start or end time changes (only if not actively editing duration)
    useEffect(() => {
        if (formData.datetime_start && formData.datetime_end && activeField !== 'duration') {
            const start = new Date(formData.datetime_start);
            const end = new Date(formData.datetime_end);
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = Math.round(diffMs / (1000 * 60));
            setDuration(diffMinutes);
        }
    }, [formData.datetime_start, formData.datetime_end, activeField]);

    // Update end time when duration changes (only if not actively editing end time)
    useEffect(() => {
        if (formData.datetime_start && activeField === 'duration') {
            const startTime = new Date(formData.datetime_start);
            const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
            setFormData({
                ...formData,
                datetime_end: endTime.toISOString().slice(0, 16)
            });
        }
    }, [duration, activeField, formData.datetime_start]);

    const fetchEvents = async () => {
        try {
            const startOfWeek = getStartOfWeek(currentWeek);
            const endOfWeek = getEndOfWeek(currentWeek);

            const data = await recipeAPI.getEvents(startOfWeek.toISOString(), endOfWeek.toISOString());
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
            // For demo purposes, create some sample events
            setEvents(generateSampleEvents());
        }
    };

    const generateSampleEvents = (): Event[] => {
        const startOfWeek = getStartOfWeek(currentWeek);
        const sampleEvents: Event[] = [
            {
                id: 1,
                title: 'Morning Meeting',
                description: 'Daily standup with the team',
                datetime_start: new Date(startOfWeek.getTime() + 9 * 60 * 60 * 1000).toISOString(),
                datetime_end: new Date(startOfWeek.getTime() + 10 * 60 * 60 * 1000).toISOString(),
                color: '#3182CE',
                kind: 1,
                done: false,
                template: false,
                recuring: false,
                active: true,
            },
            {
                id: 2,
                title: 'Lunch with Client',
                description: 'Discuss project requirements',
                datetime_start: new Date(startOfWeek.getTime() + 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString(),
                datetime_end: new Date(startOfWeek.getTime() + 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000).toISOString(),
                location: 'Downtown Restaurant',
                color: '#38A169',
                kind: 2,
                done: false,
                template: false,
                recuring: false,
                active: true,
            },
            {
                id: 3,
                title: 'Gym Session',
                description: 'Cardio and strength training',
                datetime_start: new Date(startOfWeek.getTime() + 4 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString(),
                datetime_end: new Date(startOfWeek.getTime() + 4 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000).toISOString(),
                color: '#E53E3E',
                kind: 3,
                done: false,
                template: false,
                recuring: false,
                active: true,
            }
        ];
        return sampleEvents;
    };

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

    const isCurrentDay = (dayIndex: number): boolean => {
        const today = new Date();
        const startOfWeek = getStartOfWeek(currentWeek);
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(dayDate.getDate() + dayIndex);

        return today.toDateString() === dayDate.toDateString();
    };

    const getEventsForDay = (dayIndex: number): Event[] => {
        const dayDate = new Date(getStartOfWeek(currentWeek));
        dayDate.setDate(dayDate.getDate() + dayIndex);

        const dayStart = new Date(dayDate);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayDate);
        dayEnd.setHours(23, 59, 59, 999);

        return events.filter(event => {
            const eventStart = new Date(event.datetime_start);
            const eventEnd = new Date(event.datetime_end);

            // Check if event is on this day
            return eventStart < dayEnd && eventEnd > dayStart;
        });
    };

    const getEventsForTimeSlot = (timeSlot: string, dayIndex: number): Event[] => {
        const dayDate = new Date(getStartOfWeek(currentWeek));
        dayDate.setDate(dayDate.getDate() + dayIndex);

        const [hours, minutes] = timeSlot.split(':').map(Number);
        const slotStart = new Date(dayDate);
        slotStart.setHours(hours, minutes, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hours + 1, 0, 0, 0);

        return events.filter(event => {
            const eventStart = new Date(event.datetime_start);
            const eventEnd = new Date(event.datetime_end);

            // Check if event overlaps with this time slot
            return eventStart < slotEnd && eventEnd > slotStart;
        });
    };

    interface EventLayout {
        event: Event;
        top: number;
        height: number;
        left: number;
        width: number;
    }

    const calculateEventLayout = (dayIndex: number): EventLayout[] => {
        const dayEvents = getEventsForDay(dayIndex);
        const layouts: EventLayout[] = [];
        const SLOT_HEIGHT = 60; // 60px per hour slot
        const CALENDAR_START_HOUR = 6; // Calendar starts at 6:00

        // Sort events by start time
        dayEvents.sort((a, b) => new Date(a.datetime_start).getTime() - new Date(b.datetime_start).getTime());

        // Group overlapping events
        const eventGroups: Event[][] = [];

        for (const event of dayEvents) {
            const eventStart = new Date(event.datetime_start);
            const eventEnd = new Date(event.datetime_end);

            // Find a group this event can join (overlaps with any event in the group)
            let joinedGroup = false;
            for (const group of eventGroups) {
                const overlapsWithGroup = group.some(groupEvent => {
                    const groupStart = new Date(groupEvent.datetime_start);
                    const groupEnd = new Date(groupEvent.datetime_end);
                    return eventStart < groupEnd && eventEnd > groupStart;
                });

                if (overlapsWithGroup) {
                    group.push(event);
                    joinedGroup = true;
                    break;
                }
            }

            if (!joinedGroup) {
                eventGroups.push([event]);
            }
        }

        // Calculate layout for each group
        for (const group of eventGroups) {
            const groupWidth = 100 / group.length; // Equal width for each event in the group

            group.forEach((event, index) => {
                const eventStart = new Date(event.datetime_start);
                const eventEnd = new Date(event.datetime_end);

                // Calculate position from calendar start (6:00)
                const startHour = eventStart.getHours() + eventStart.getMinutes() / 60;
                const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;

                // Position relative to calendar start
                const top = (startHour - CALENDAR_START_HOUR) * SLOT_HEIGHT;
                const height = (endHour - startHour) * SLOT_HEIGHT;
                const left = index * groupWidth;
                const width = groupWidth;

                layouts.push({
                    event,
                    top,
                    height,
                    left,
                    width
                });
            });
        }

        return layouts;
    };

    const getWeekNumber = (date: Date): number => {
        const d = new Date(date.getTime());
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setFormData({
            title: event.title,
            description: event.description || '',
            datetime_start: event.datetime_start,
            datetime_end: event.datetime_end,
            location: event.location || '',
            color: event.color || '#3182CE',
            kind: event.kind || 1,
        });
        setActiveField(null);
        setShowForm(true);
    };

    const handleTimeSlotClick = (timeSlot: string, dayIndex: number) => {
        const dayDate = new Date(getStartOfWeek(currentWeek));
        dayDate.setDate(dayDate.getDate() + dayIndex);

        const [hours, minutes] = timeSlot.split(':').map(Number);
        const slotStart = new Date(dayDate);
        slotStart.setHours(hours, minutes, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hours + 1, 0, 0, 0);

        setSelectedEvent(null);
        setFormData({
            title: '',
            description: '',
            datetime_start: slotStart.toISOString().slice(0, 16),
            datetime_end: slotEnd.toISOString().slice(0, 16),
            location: '',
            color: '#3182CE',
            kind: 1,
        });
        setDuration(60); // Default 1 hour duration
        setActiveField(null);
        setShowForm(true);
    };

    const handleCreateEvent = () => {
        setSelectedEvent(null);
        setFormData({
            title: '',
            description: '',
            datetime_start: '',
            datetime_end: '',
            location: '',
            color: '#3182CE',
            kind: 1,
        });
        setDuration(60);
        setActiveField(null);
        setShowForm(true);
    };

    const handleDurationChange = (newDuration: number) => {
        setDuration(newDuration);
        setActiveField('duration');
    };

    const handleEndTimeChange = (newEndTime: string) => {
        setFormData({
            ...formData,
            datetime_end: newEndTime
        });
        setActiveField('endTime');
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedEvent) {
                await recipeAPI.updateEvent(selectedEvent.id!, formData);
            } else {
                await recipeAPI.createEvent(formData as Omit<Event, 'id'>);
            }

            fetchEvents();
            setShowForm(false);
            setSelectedEvent(null);
            setActiveField(null);
        } catch (error) {
            console.error('Error saving event:', error);
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setSelectedEvent(null);
        setActiveField(null);
    };

    const weekNumber = getWeekNumber(currentWeek);
    const startOfWeek = getStartOfWeek(currentWeek);

    return (
        <Box p={6}>
            <Flex mb={6} align="center">
                <Text fontSize="2xl" fontWeight="bold" color="#f56500">
                    Week {weekNumber} Calendar
                </Text>
                <Spacer />
                <HStack gap={4}>
                    <Button
                        onClick={() => {
                            const newWeek = new Date(currentWeek);
                            newWeek.setDate(newWeek.getDate() - 7);
                            setCurrentWeek(newWeek);
                        }}
                        colorScheme="orange"
                        variant="outline"
                    >
                        ← Previous Week
                    </Button>
                    <Button
                        onClick={() => {
                            const newWeek = new Date(currentWeek);
                            newWeek.setDate(newWeek.getDate() + 7);
                            setCurrentWeek(newWeek);
                        }}
                        colorScheme="orange"
                        variant="outline"
                    >
                        Next Week →
                    </Button>
                    <Button
                        onClick={handleCreateEvent}
                        colorScheme="orange"
                    >
                        + Add Event
                    </Button>
                </HStack>
            </Flex>

            {/* Event Form */}
            {showForm && (
                <Box mb={6} p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                        {selectedEvent ? 'Edit Event' : 'Create New Event'}
                    </Text>
                    <form onSubmit={handleSaveEvent}>
                        <VStack gap={4} align="stretch">
                            <HStack gap={4}>
                                <Box flex={1}>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>Title *</Text>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Event title"
                                        required
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>Location</Text>
                                    <Input
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Location"
                                    />
                                </Box>
                            </HStack>

                            <Box>
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Description</Text>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Event description"
                                    rows={3}
                                />
                            </Box>

                            <HStack gap={4}>
                                <Box flex={1}>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>Start Time *</Text>
                                    <Input
                                        type="datetime-local"
                                        value={formData.datetime_start?.slice(0, 16)}
                                        onChange={(e) => setFormData({ ...formData, datetime_start: e.target.value })}
                                        required
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>End Time *</Text>
                                    <Input
                                        type="datetime-local"
                                        value={formData.datetime_end?.slice(0, 16)}
                                        onChange={(e) => handleEndTimeChange(e.target.value)}
                                        required
                                    />
                                </Box>
                            </HStack>

                            <HStack gap={4}>
                                <Box flex={1}>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>Duration (minutes)</Text>
                                    <Input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => handleDurationChange(Number(e.target.value))}
                                        min={1}
                                        max={1440} // 24 hours
                                        placeholder="60"
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>Color</Text>
                                    <Input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Text fontSize="sm" fontWeight="medium" mb={1}>Type</Text>
                                    <select
                                        value={formData.kind}
                                        onChange={(e) => setFormData({ ...formData, kind: Number(e.target.value) })}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value={1}>Meeting</option>
                                        <option value={2}>Appointment</option>
                                        <option value={3}>Personal</option>
                                        <option value={4}>Work</option>
                                    </select>
                                </Box>
                            </HStack>

                            <HStack gap={4} justify="flex-end">
                                <Button onClick={handleCancel} variant="outline">
                                    Cancel
                                </Button>
                                <Button type="submit" colorScheme="orange">
                                    {selectedEvent ? 'Update' : 'Create'}
                                </Button>
                            </HStack>
                        </VStack>
                    </form>
                </Box>
            )}

            <Box overflowX="auto" position="relative">
                <Grid
                    templateColumns="80px repeat(7, 1fr)"
                    gap={1}
                    bg="white"
                    borderRadius="md"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.200"
                >
                    {/* Header row */}
                    <GridItem p={2} bg="gray.50" borderBottom="1px solid" borderColor="gray.200">
                        <Text fontWeight="bold" textAlign="center">Time</Text>
                    </GridItem>
                    {daysOfWeek.map((day, index) => (
                        <GridItem
                            key={day}
                            p={2}
                            bg={isCurrentDay(index) ? "blue.50" : "gray.50"}
                            borderBottom="1px solid"
                            borderColor={isCurrentDay(index) ? "blue.200" : "gray.200"}
                        >
                            <VStack gap={1}>
                                <Text fontWeight="bold" fontSize="sm" color={isCurrentDay(index) ? "blue.700" : "inherit"}>{day}</Text>
                                <Text fontSize="xs" color={isCurrentDay(index) ? "blue.600" : "gray.600"}>
                                    {formatDate(new Date(startOfWeek.getTime() + index * 24 * 60 * 60 * 1000))}
                                </Text>
                            </VStack>
                        </GridItem>
                    ))}

                    {/* Time slots */}
                    {timeSlots.map((timeSlot) => (
                        <React.Fragment key={timeSlot}>
                            <GridItem p={2} bg="gray.50" borderRight="1px solid" borderColor="gray.200">
                                <Text fontSize="sm" fontWeight="medium">{timeSlot}</Text>
                            </GridItem>
                            {daysOfWeek.map((day, dayIndex) => {
                                const slotEvents = getEventsForTimeSlot(timeSlot, dayIndex);
                                const isToday = isCurrentDay(dayIndex);
                                return (
                                    <GridItem
                                        key={`${day}-${timeSlot}`}
                                        p={1}
                                        minH="60px"
                                        borderRight="1px solid"
                                        borderBottom="1px solid"
                                        borderColor={isToday ? "blue.200" : "gray.200"}
                                        bg={isToday ? "blue.25" : "transparent"}
                                        position="relative"
                                        cursor="pointer"
                                        onClick={() => handleTimeSlotClick(timeSlot, dayIndex)}
                                        style={{ transition: 'background-color 0.2s' }}
                                        onMouseEnter={(e) => {
                                            if (!isToday) {
                                                e.currentTarget.style.backgroundColor = '#f7fafc';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isToday) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        {/* Show + icon only in first time slot of each day if no events in this slot */}
                                        {timeSlot === '06:00' && slotEvents.length === 0 && (
                                            <Box
                                                h="100%"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                opacity={0.3}
                                                style={{ transition: 'opacity 0.2s' }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.opacity = '0.6';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.opacity = '0.3';
                                                }}
                                            >
                                                <Text fontSize="xs" color="gray.400">+</Text>
                                            </Box>
                                        )}
                                    </GridItem>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </Grid>

                {/* Events overlay - positioned absolutely over the grid */}
                <Box
                    position="absolute"
                    top="0"
                    left="0"
                    right="0"
                    bottom="0"
                    pointerEvents="none"
                    overflow="hidden"
                >
                    <Grid
                        templateColumns="80px repeat(7, 1fr)"
                        gap={1}
                        h="100%"
                        position="relative"
                        top="60px" // Account for header row
                    >
                        {/* Empty cell for time column */}
                        <GridItem />

                        {/* Day columns for events */}
                        {daysOfWeek.map((_, dayIndex) => {
                            const eventLayouts = calculateEventLayout(dayIndex);

                            return (
                                <GridItem
                                    key={`events-day-${dayIndex}`}
                                    position="relative"
                                    pointerEvents="auto"
                                    height={`${timeSlots.length * 60}px`}
                                >
                                    {eventLayouts.map((layout) => (
                                        <Box
                                            key={layout.event.id}
                                            position="absolute"
                                            top={`${layout.top}px`}
                                            left={`${layout.left}%`}
                                            width={`${layout.width}%`}
                                            height={`${layout.height}px`}
                                            p={1}
                                            bg={layout.event.color || '#3182CE'}
                                            color="white"
                                            borderRadius="sm"
                                            fontSize="xs"
                                            cursor="pointer"
                                            border="1px solid rgba(255,255,255,0.2)"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventClick(layout.event);
                                            }}
                                            style={{
                                                transition: 'opacity 0.2s, transform 0.2s',
                                                opacity: 0.9,
                                                boxSizing: 'border-box',
                                                zIndex: 10
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.opacity = '1';
                                                e.currentTarget.style.transform = 'scale(1.02)';
                                                e.currentTarget.style.zIndex = '20';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.opacity = '0.9';
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.zIndex = '10';
                                            }}
                                            overflow="hidden"
                                        >
                                            <Text
                                                fontWeight="medium"
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: layout.height > 30 ? '12px' : '10px'
                                                }}
                                            >
                                                {layout.event.title}
                                            </Text>
                                            {layout.event.location && layout.height > 40 && (
                                                <Text
                                                    fontSize="10px"
                                                    opacity={0.8}
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    📍 {layout.event.location}
                                                </Text>
                                            )}
                                            {layout.height > 50 && (
                                                <Text
                                                    fontSize="9px"
                                                    opacity={0.7}
                                                    mt={1}
                                                >
                                                    {new Date(layout.event.datetime_start).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false
                                                    })}
                                                    {' - '}
                                                    {new Date(layout.event.datetime_end).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false
                                                    })}
                                                </Text>
                                            )}
                                        </Box>
                                    ))}
                                </GridItem>
                            );
                        })}
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
};

export default Events;
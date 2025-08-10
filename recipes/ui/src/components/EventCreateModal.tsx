import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Input,
    Textarea,
    VStack,
    HStack,
    Select,
    Text,
    Heading,
} from '@chakra-ui/react';
import { Event, recipeAPI } from '../services/api';

interface EventCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
    initialTime?: string;
    onEventCreated?: (event: Event) => void;
}

const EventCreateModal: React.FC<EventCreateModalProps> = ({
    isOpen,
    onClose,
    initialDate,
    initialTime,
    onEventCreated
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');

    // Form state
    const [formData, setFormData] = useState(() => {
        const now = initialDate || new Date();
        const startTime = initialTime || '09:00';
        const [hours, minutes] = startTime.split(':').map(Number);

        const startDateTime = new Date(now);
        startDateTime.setHours(hours, minutes, 0, 0);

        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(hours + 1, minutes, 0, 0); // Default 1 hour duration

        // Format for datetime-local input (YYYY-MM-DDTHH:MM)
        const formatDateTimeLocal = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hour}:${minute}`;
        };

        return {
            title: '',
            description: '',
            datetime_start: formatDateTimeLocal(startDateTime),
            datetime_end: formatDateTimeLocal(endDateTime),
            location: '',
            color: '#3182CE',
            kind: 1,
            done: false,
            template: false,
            recuring: false,
            active: true
        };
    });

    // Update form data when modal opens with new initial values
    useEffect(() => {
        if (isOpen && (initialDate || initialTime)) {
            const now = initialDate || new Date();
            const startTime = initialTime || '09:00';
            const [hours, minutes] = startTime.split(':').map(Number);

            const startDateTime = new Date(now);
            startDateTime.setHours(hours, minutes, 0, 0);

            const endDateTime = new Date(startDateTime);
            endDateTime.setHours(hours + 1, minutes, 0, 0); // Default 1 hour duration

            // Format for datetime-local input (YYYY-MM-DDTHH:MM)
            const formatDateTimeLocal = (date: Date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hour = String(date.getHours()).padStart(2, '0');
                const minute = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hour}:${minute}`;
            };

            console.log('Modal time setting debug:', {
                initialTime,
                initialDate,
                hours,
                minutes,
                startDateTime: startDateTime.toString(),
                formattedStart: formatDateTimeLocal(startDateTime),
                formattedEnd: formatDateTimeLocal(endDateTime)
            });

            setFormData({
                title: '',
                description: '',
                datetime_start: formatDateTimeLocal(startDateTime),
                datetime_end: formatDateTimeLocal(endDateTime),
                location: '',
                color: '#3182CE',
                kind: 1,
                done: false,
                template: false,
                recuring: false,
                active: true
            });
        }
    }, [isOpen, initialDate, initialTime]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Convert datetime-local format to ISO string
            const eventData = {
                ...formData,
                datetime_start: new Date(formData.datetime_start).toISOString(),
                datetime_end: new Date(formData.datetime_end).toISOString(),
            };

            const newEvent = await recipeAPI.createEvent(eventData);

            if (onEventCreated) {
                onEventCreated(newEvent);
            }

            onClose();
        } catch (error) {
            console.error('Error creating event:', error);
            setError('Failed to create event');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        // Reset form when closing
        setFormData({
            title: '',
            description: '',
            datetime_start: '',
            datetime_end: '',
            location: '',
            color: '#3182CE',
            kind: 1,
            done: false,
            template: false,
            recuring: false,
            active: true
        });
        setError('');
        onClose();
    };

    const colorOptions = [
        { value: '#3182CE', label: 'Blue' },
        { value: '#38A169', label: 'Green' },
        { value: '#D69E2E', label: 'Yellow' },
        { value: '#E53E3E', label: 'Red' },
        { value: '#805AD5', label: 'Purple' },
        { value: '#DD6B20', label: 'Orange' },
        { value: '#319795', label: 'Teal' },
        { value: '#718096', label: 'Gray' },
    ];

    if (!isOpen) return null;

    return (
        // Overlay
        <Box
            position="fixed"
            top="0"
            left="0"
            width="100vw"
            height="100vh"
            bg="rgba(0, 0, 0, 0.5)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            zIndex={1000}
            onClick={handleClose}
        >
            {/* Modal Content */}
            <Box
                bg="white"
                borderRadius="lg"
                boxShadow="xl"
                p={6}
                maxWidth="500px"
                width="90%"
                maxHeight="90vh"
                overflowY="auto"
                onClick={(e) => e.stopPropagation()}
            >
                <Heading size="lg" mb={6}>Create New Event</Heading>

                {error && (
                    <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
                        <Text color="red.600" fontSize="sm">{error}</Text>
                    </Box>
                )}

                <form onSubmit={handleSubmit}>
                    <VStack gap={4} align="stretch">
                        <Box>
                            <Text mb={2} fontWeight="medium">Title *</Text>
                            <Input
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Event title"
                                required
                            />
                        </Box>

                        <Box>
                            <Text mb={2} fontWeight="medium">Description</Text>
                            <Textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Event description (optional)"
                                rows={3}
                            />
                        </Box>

                        <HStack gap={4}>
                            <Box flex="1">
                                <Text mb={2} fontWeight="medium">Start Time *</Text>
                                <Input
                                    name="datetime_start"
                                    type="datetime-local"
                                    value={formData.datetime_start}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Box>

                            <Box flex="1">
                                <Text mb={2} fontWeight="medium">End Time *</Text>
                                <Input
                                    name="datetime_end"
                                    type="datetime-local"
                                    value={formData.datetime_end}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Box>
                        </HStack>

                        <Box>
                            <Text mb={2} fontWeight="medium">Location</Text>
                            <Input
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="Event location (optional)"
                            />
                        </Box>

                        <Box>
                            <Text mb={2} fontWeight="medium">Color</Text>
                            <select
                                name="color"
                                value={formData.color}
                                onChange={handleSelectChange}
                                style={{
                                    padding: '8px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    width: '100%'
                                }}
                            >
                                {colorOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </Box>
                    </VStack>

                    <HStack gap={3} mt={6} justify="flex-end">
                        <Button variant="ghost" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            type="submit"
                            loading={isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create Event'}
                        </Button>
                    </HStack>
                </form>
            </Box>
        </Box>
    );
};

export default EventCreateModal;
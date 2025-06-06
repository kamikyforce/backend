export interface CreateEventRequest {
  name: string;
  description?: string;
  eventDate: string;
  location?: string;
  onlineLink?: string;
  maxCapacity: number;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  eventDate?: string;
  location?: string;
  onlineLink?: string;
  maxCapacity?: number;
}

export interface EventFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  page?: number;
  limit?: number;
}
export interface CreateReservationRequest {
  eventId: string;
}

export interface ReservationResponse {
  id: string;
  eventId: string;
  userId: string;
  reservationDate: Date;
  status: string;
  event: {
    id: string;
    name: string;
    eventDate: Date;
    location?: string;
    onlineLink?: string;
  };
}
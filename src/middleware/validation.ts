import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Middleware de validação genérica
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message),
      });
    }
    next();
  };
};

// Auth
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().min(2).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Auth profile update
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).optional(),
  lastName: Joi.string().min(2).optional(),
  email: Joi.string().email().optional(),
}).min(1); // Pelo menos um campo é necessário

// Events
export const createEventSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().allow('').optional(),
  eventDate: Joi.date().iso().greater('now').required(),
  location: Joi.string().optional(),
  onlineLink: Joi.string().uri().optional(),
  maxCapacity: Joi.number().integer().min(1).required(),
}).or('location', 'onlineLink'); // Pelo menos um dos dois deve estar presente

export const updateEventSchema = Joi.object({
  name: Joi.string().min(3).optional(),
  description: Joi.string().allow('').optional(),
  eventDate: Joi.date().iso().greater('now').optional(),
  location: Joi.string().optional(),
  onlineLink: Joi.string().uri().optional(),
  maxCapacity: Joi.number().integer().min(1).optional(),
}).min(1); // Pelo menos um campo para atualizar

// Reservations (admin patch)
export const adminUpdateReservationSchema = Joi.object({
  status: Joi.string().valid('CONFIRMED', 'CANCELED').required(),
});

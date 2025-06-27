const Joi = require('joi');

const userValidation = {
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username must contain only letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must be less than 30 characters long',
        'any.required': 'Username is required'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    
    publicKey: Joi.string()
      .required()
      .messages({
        'any.required': 'Public key is required for encryption'
      })
  }),

  login: Joi.object({
    username: Joi.string()
      .required()
      .messages({
        'any.required': 'Username is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  })
};

const messageValidation = {
  send: Joi.object({
    recipientId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.integer': 'Recipient ID must be a valid integer',
        'number.positive': 'Recipient ID must be positive',
        'any.required': 'Recipient ID is required'
      }),
    
    encryptedContent: Joi.string()
      .required()
      .messages({
        'any.required': 'Message content is required'
      }),
    
    iv: Joi.string()
      .length(32)
      .required()
      .messages({
        'string.length': 'IV must be exactly 32 characters long',
        'any.required': 'IV is required for encryption'
      }),
    
    messageType: Joi.string()
      .valid('text')
      .default('text')
  })
};

const conversationValidation = {
  create: Joi.object({
    participantId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.integer': 'Participant ID must be a valid integer',
        'number.positive': 'Participant ID must be positive',
        'any.required': 'Participant ID is required'
      })
  })
};

function validateRequest(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
}

module.exports = {
  userValidation,
  messageValidation,
  conversationValidation,
  validateRequest
};

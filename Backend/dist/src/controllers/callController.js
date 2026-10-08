import { randomUUID } from 'node:crypto';
import { createInitialOutcome, respondToCustomer } from '../services/auraSupportAgent.js';
const MAX_TRANSCRIPT_LENGTH = 5000;
const INITIAL_GREETING = 'Hi, I’m Aura’s skincare support assistant. I can help with Aura products, order tracking, and returns. What can I help you with today?';
const sessions = new Map();
class RequestError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
function requireSessionId(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 128) {
        throw new RequestError('A valid sessionId is required.', 400);
    }
    return value.trim();
}
function requireAuthenticatedUserId(req) {
    if (!req.authUserId) {
        throw new RequestError('A valid authenticated user is required.', 401);
    }
    return req.authUserId;
}
function getOwnedSession(sessionId, ownerId) {
    const session = sessions.get(sessionId);
    if (!session || session.ownerId !== ownerId) {
        throw new RequestError('This call session could not be found. Please start a new call.', 404);
    }
    return session;
}
export const startCall = (req, res, next) => {
    try {
        const ownerId = requireAuthenticatedUserId(req);
        const sessionId = randomUUID();
        sessions.set(sessionId, {
            ownerId,
            transcript: [{
                    role: 'agent',
                    content: INITIAL_GREETING,
                    timestamp: new Date().toISOString()
                }],
            outcome: createInitialOutcome()
        });
        res.status(201).json({ success: true, sessionId, question: INITIAL_GREETING });
    }
    catch (error) {
        next(error);
    }
};
export const submitAnswer = (req, res, next) => {
    try {
        const { sessionId: rawSessionId, answer: rawAnswer } = req.body;
        const ownerId = requireAuthenticatedUserId(req);
        const sessionId = requireSessionId(rawSessionId);
        if (typeof rawAnswer !== 'string' || !rawAnswer.trim() || rawAnswer.length > MAX_TRANSCRIPT_LENGTH) {
            throw new RequestError(`answer must contain 1-${MAX_TRANSCRIPT_LENGTH} characters.`, 400);
        }
        const session = getOwnedSession(sessionId, ownerId);
        const answer = rawAnswer.trim();
        session.transcript.push({
            role: 'customer',
            content: answer,
            timestamp: new Date().toISOString()
        });
        const reply = respondToCustomer(answer);
        session.outcome = reply.outcome;
        session.transcript.push({
            role: 'agent',
            content: reply.answer,
            timestamp: new Date().toISOString()
        });
        res.json({
            success: true,
            question: reply.answer,
            outcome: reply.outcome
        });
    }
    catch (error) {
        next(error);
    }
};
export const endCall = (req, res, next) => {
    try {
        const { sessionId: rawSessionId } = req.body;
        const ownerId = requireAuthenticatedUserId(req);
        const sessionId = requireSessionId(rawSessionId);
        const session = getOwnedSession(sessionId, ownerId);
        res.json({
            success: true,
            sessionId,
            conversationHistory: session.transcript,
            outcome: session.outcome
        });
        sessions.delete(sessionId);
    }
    catch (error) {
        next(error);
    }
};

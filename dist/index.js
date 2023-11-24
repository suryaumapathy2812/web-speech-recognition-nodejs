"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket_io_1 = require("socket.io");
const assistant_1 = require("./assistant");
const port = process.env.PORT || 8000;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*"
    }
});
const user_sessions = [];
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('user_connected', (user) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        console.log("[USER_CONNECTED]", user);
        let userSession = null;
        const existing_user_session = user_sessions.find((user_session) => user_session.user_id === (user === null || user === void 0 ? void 0 : user.email));
        if (existing_user_session) {
            console.debug("[EXISTING_USER_SESSION]", existing_user_session);
            const existing_user_session_socket = existing_user_session.sessions.find((session) => session === socket.id);
            if (!existing_user_session_socket) {
                existing_user_session.sessions.push(socket.id);
            }
            userSession = existing_user_session;
        }
        else {
            console.debug("[NEW_USER_SESSION]");
            console.log("[USER_CONNECTED]", user);
            const thread = yield (0, assistant_1.initializeThread)();
            const user_session = {};
            user_session.user_id = user === null || user === void 0 ? void 0 : user.email;
            user_session.sessions = [socket.id];
            user_session.user = user;
            user_session.thread = thread;
            console.log("[USER_SESSION]", user_session);
            user_sessions.push(user_session);
            userSession = user_session;
        }
        const messages = yield (0, assistant_1.ListMessages)((_a = userSession === null || userSession === void 0 ? void 0 : userSession.thread) === null || _a === void 0 ? void 0 : _a.id);
        socket.emit('user_connection_success', { userSession, messages: messages });
    }));
    socket.on('message', (data) => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c;
        console.log("[MESSAGE_DATA]", data);
        // OPENAI
        const response = yield (0, assistant_1.sendMessage)((_c = (_b = data.userSession) === null || _b === void 0 ? void 0 : _b.thread) === null || _c === void 0 ? void 0 : _c.id, data.message);
        console.log("[GPT_RESPONSE]", response);
        socket.emit('conversation_response', response);
    }));
});
server.listen(port, () => {
    console.log('listening on *:' + port);
});

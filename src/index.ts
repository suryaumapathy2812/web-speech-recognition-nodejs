declare var require: any

require('dotenv').config();
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { ListMessages, initializeThread, sendMessage } from './assistant';
import { UserSession } from './types';
import { SESSION, SOCKET, getAllUserSessions } from './redis';


const port = process.env.PORT || 8000;
const $APP = express();

$APP.get('/', (req, res) => {
  res.send('The app is running');
});

const $SERVER = http.createServer($APP);
const $IO = new Server($SERVER, {
  cors: {
    origin: "*"
  }
});

// const user_sessions: UserSession[] = [];

$IO.on('connection', ($SOCKET) => {
  console.log('a user connected');

  $SOCKET.on('user_connected', async (user) => {
    console.log("[USER_CONNECTED]", user);

    if (!user) {
      return;
    }

    let userSession = await SESSION.getSession(user?.email);
    console.log("[USER_SESSION]", userSession)


    if (userSession) {
      console.debug("[EXISTING_USER_SESSION]", userSession)
      const existing_user_session_socket = userSession.sockets.find((_socket) => _socket === $SOCKET.id)
      if (!existing_user_session_socket) {
        userSession.sockets.push($SOCKET.id);
        await SOCKET.addSocket(user?.email, $SOCKET.id);
      }
    } else {
      console.debug("[NEW_USER_SESSION]")
      console.log("[USER_CONNECTED]", user);

      const thread = await initializeThread();
      userSession = {
        user_id: user?.email,
        sockets: [$SOCKET.id],
        user: user,
        thread: thread,
      };
      console.log("[USER_SESSION]", userSession)
      await SESSION.createSession(user?.email, userSession);
    }

    const messages = await ListMessages(userSession.thread.id);
    $SOCKET.emit('user_connection_success', { userSession, messages: messages });
  })

  $SOCKET.on('message', async (data: { message: string, userSession: UserSession }) => {
    console.log("[MESSAGE_DATA]", data);

    // OPENAI
    const response = await sendMessage(data.userSession?.thread?.id, data.message);
    console.log("[GPT_RESPONSE]", response);

    const user_sessions = await SESSION.getSession(data.userSession?.user_id as string);
    const sockets = user_sessions?.sockets
    console.log("[SESSIONS]", sockets);

    $IO.to(sockets ?? [$SOCKET.id]).emit('conversation_response', response);
  })

  $SOCKET.on('retrieve_messages', async (data: { userSession: UserSession }) => {
    console.log("[RETRIEVE_MESSAGES_DATA]", data);
    const messages = await ListMessages(data.userSession.thread.id);
    $SOCKET.emit('retrieve_messages_success', messages);
  })

  $SOCKET.on('disconnect', async (data) => {
    console.log('user disconnected');
    console.log("[DISCONNECT_DATA]", data);
    console.log("[DISCONNECT_SOCKET]", $SOCKET.id);

    const ALL_SESSIONS = await getAllUserSessions();
    console.log("[ALL_SESSIONS]", ALL_SESSIONS);

    const user_session = ALL_SESSIONS.find((user_session) => user_session.sockets.find((session) => session === $SOCKET.id) ? true : false);

    if (user_session) {
      await SOCKET.deleteSocket(user_session.user_id, $SOCKET.id);
    }

  })

})

$SERVER.listen(port, () => {
  console.log('listening on *:' + port);
})
import { Server, Socket } from 'socket.io';
import session, { Session } from "express-session";


declare var require: any

declare module "express-session" {
  interface Session {
    passport: {
      user: {
        profile: any;
        accessToken: string;
        refreshToken: string;
      };
    };
  }
}

declare module 'http' {
  interface IncomingMessage {
    session?: Session;
  }
}

require('dotenv').config();
import express, { Response, Request, NextFunction } from 'express';
import http from 'http';

import { ListMessages, initializeThread, sendMessage } from './assistant';
import { UserSession } from './types';
import { SESSION, SOCKET, getAllUserSessions } from './redis';
import passport from "./passport";

const port = process.env.PORT || 8000;
const $APP = express();

const sessionMiddleware = session({
  secret: '197cd1ce12977058b80ac45ea29cae1c8d6f11c9',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: 'auto',
    maxAge: 60000
  }
})

$APP.use(sessionMiddleware)
$APP.use(passport.initialize());
$APP.use(passport.session());


const checkAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) { return next() }
  console.log("[NOT_AUTHENTICATED]")
  res.redirect("/auth/google")
}

const $SERVER = http.createServer($APP);
const $IO = new Server($SERVER, {
  cors: {
    origin: "*"
  }
});



$APP.get('/', checkAuthenticated, (req, res) => {
  console.log("[REQ]", req);
  res.send('The app is running');
});

$APP.get('/auth/google',
  passport.authenticate('google', {
    scope: [
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly'
    ]
  })
);

$APP.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function (req, res) {
    console.log(req)
    // Successful authentication, redirect home.
    res.redirect("http://localhost:3001/api/auth/signin");
  });

$APP.get('/logout', function (req, res, next) {
  console.log("[LOGOUT]", req.session);
  req.logout(function (err) {
    if (err) { console.log(err); return next(err); }

    req.session?.destroy(function (err) {
      if (err) { console.log(err); return next(err); }

      // The response should indicate that the user is no longer authenticated.
      // return res.send({ authenticated: req.isAuthenticated() });
      if (!req.isAuthenticated()) {
        res.redirect('http://localhost:3001/api/auth/signout');
      }
    });
  });
});

$IO.engine.use(sessionMiddleware)


$IO.on('connection', ($SOCKET) => {
  console.log('a user connected');

  const session = $SOCKET.request.session;
  console.log("[SESSION]", session);

  if ((!session?.passport || !session?.passport.user)) {
    console.log("[NOT_AUTHENTICATED]")
    $SOCKET.emit('user_connection_failed', {
      message: "NOT_AUTHENTICATED"
    });
    return;
  }

  if (session && session.passport && session.passport.user) {
    const accessToken = session.passport.user.accessToken;

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

      if (!data.userSession) {
        return;
      }

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
  }
})

$SERVER.listen(port, () => {
  console.log('listening on *:' + port);
})